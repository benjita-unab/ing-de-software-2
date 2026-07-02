import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator,
  Linking, Alert, Modal
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { bffFetch } from '../src/services/bffService';
import { syncTraceabilityRecords } from '../src/services/syncEngine';

export default function RegistroViajeLinear({ onSyncComplete, rutaId, destino, estadoPago, estadoRuta, horaLlegadaDestino }) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [localFallbackArrival, setLocalFallbackArrival] = useState(null);
  const cameraRef = useRef(null);
  
  const [fotosRecepcion, setFotosRecepcion] = useState([]);
  const [fotosEntrega, setFotosEntrega] = useState([]);
  const [tipoActivo, setTipoActivo] = useState(null);
  const [isReporteOpen, setIsReporteOpen] = useState(false);
  const [reporteCargando, setReporteCargando] = useState(false);
  
  const [llegadaConfirmada, setLlegadaConfirmada] = useState(estadoRuta === 'EN_DESTINO' || estadoRuta === 'FINALIZADO' || !!horaLlegadaDestino);

  useEffect(() => {
    if (llegadaConfirmada) {
      onSyncComplete(true);
    }
  }, [llegadaConfirmada, onSyncComplete]);

  // Forzar reseteo si la ruta vuelve a estado ASIGNADO desde el backend
  useEffect(() => {
    if (estadoRuta === 'ASIGNADO' && !horaLlegadaDestino) {
      setLlegadaConfirmada(false);
      setLocalFallbackArrival(null);
      setTimerSeconds(0);
      setFotosRecepcion([]);
      setFotosEntrega([]);
      onSyncComplete(false);
    }
  }, [estadoRuta, horaLlegadaDestino]);

  useEffect(() => {
    let interval;
    if (llegadaConfirmada) {
      interval = setInterval(() => {
        const arrivalTime = horaLlegadaDestino ? new Date(horaLlegadaDestino).getTime() : (localFallbackArrival || Date.now());
        setTimerSeconds(Math.floor((Date.now() - arrivalTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [llegadaConfirmada, horaLlegadaDestino, localFallbackArrival]);

  const handleOpenMaps = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación para abrir Maps con tu posición actual.');
      return;
    }
    let loc = await Location.getCurrentPositionAsync({});
    const url = `https://www.google.com/maps/dir/?api=1&origin=${loc.coords.latitude},${loc.coords.longitude}&destination=${encodeURIComponent(destino || '')}`;
    Linking.openURL(url);
  };

  const handleTomarFoto = async (tipo) => {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        Alert.alert('Permiso requerido', 'Se requiere acceso a la cámara.');
        return;
      }
    }
    setTipoActivo(tipo);
    setIsCameraOpen(true);
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      setIsCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
        
        let loc;
        try {
          loc = await Location.getCurrentPositionAsync({});
        } catch {
          loc = { coords: { latitude: 0, longitude: 0 } };
        }

        const id = Math.random().toString(36).substring(2, 11);
        let etapaApi = 'EVIDENCIA_ADICIONAL';
        if (tipoActivo === 'recepcion') etapaApi = 'RECEPCION';
        if (tipoActivo === 'entrega') etapaApi = 'ENTREGA';

        const record = {
          id,
          etapa: etapaApi,
          photoUri: photo.uri,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: new Date().toISOString(),
          rutaId: rutaId
        };
        
        await syncTraceabilityRecords([record], rutaId);
        
        if (tipoActivo === 'recepcion') {
          setFotosRecepcion(prev => [...prev, photo.uri]);
        } else if (tipoActivo === 'entrega') {
          setFotosEntrega(prev => [...prev, photo.uri]);
        }
        
        Alert.alert("Éxito", "Foto subida y guardada exitosamente.");
      } catch (err) {
        Alert.alert("Error", "No se pudo subir la foto");
      } finally {
        setIsCapturing(false);
        setIsCameraOpen(false);
        setTipoActivo(null);
      }
    }
  };

  const handleLlegada = () => {
    Alert.alert(
      "Confirmar Llegada",
      "¿Está seguro que llegó al destino?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Sí", 
          onPress: async () => {
            setLocalFallbackArrival(Date.now());
            setLlegadaConfirmada(true);
            try {
              await bffFetch(`/api/rutas/${rutaId}/llegada`, { method: 'POST' });
            } catch (e) {
              console.log("Error reportando llegada", e);
            }
          } 
        }
      ]
    );
  };

  const handleReportar = async (tipo) => {
    setReporteCargando(true);
    try {
      const isEmergency = tipo.toLowerCase().includes('emergencia');
      
      const res = await bffFetch(`/api/mensajes-conductor`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruta_id: rutaId,
          mensaje: tipo,
          tipo: 'ESTADO',
          prioridad: isEmergency ? 'ALTA' : 'NORMAL'
        })
      });

      if (!res.ok) {
        const raw = await res.json().catch(() => ({}));
        throw new Error(raw.message || 'No se pudo enviar la alerta al servidor.');
      }
      
      await bffFetch(`/api/trazabilidad`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rutaId, etapa: 'REPORTE', notas: tipo }) 
      }).catch(() => {});

      setIsReporteOpen(false);
      Alert.alert("Reporte enviado", `Has reportado exitosamente la incidencia: ${tipo}. El operador recibirá la alerta.`);
    } catch(e: any) {
      Alert.alert("Error al reportar", e.message || "Ocurrió un problema de conexión.");
      console.log("Error reportando", e);
    } finally {
      setReporteCargando(false);
    }
  };

  return (
    <View style={styles.container}>


      <View style={styles.mainContentContainer}>
        <Text style={styles.routeMainTitle}>{destino || 'Ruta Asignada'}</Text>
        <Text style={styles.routeMainSubtitle}>{estadoRuta ? estadoRuta.replace('_', ' ') : 'Ubicado en ruta'}</Text>

        <TouchableOpacity style={styles.openReportBtn} onPress={() => setIsReporteOpen(true)}>
          <Text style={styles.openReportText}>⚠️ Reportar Estado / Incidencia</Text>
        </TouchableOpacity>
      </View>
      {/* Modal Cámara en Pantalla Completa */}
      <Modal visible={isCameraOpen} animationType="slide" onRequestClose={() => setIsCameraOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <CameraView style={{ flex: 1 }} ref={cameraRef} facing="back">
            <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 }}>
               {isCapturing ? (
                 <View style={{ alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20, borderRadius: 12 }}>
                   <ActivityIndicator size="large" color="#ffffff" />
                   <Text style={{ color: 'white', marginTop: 10, fontWeight: 'bold' }}>Subiendo evidencia automática...</Text>
                 </View>
               ) : (
                 <>
                   <TouchableOpacity style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: 'white' }} onPress={handleCapture} />
                   <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setIsCameraOpen(false)}>
                     <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Cancelar</Text>
                   </TouchableOpacity>
                 </>
               )}
            </View>
          </CameraView>
        </View>
      </Modal>

      {/* Modal de Reportes */}
      <Modal visible={isReporteOpen} transparent animationType="fade" onRequestClose={() => setIsReporteOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Gestión de Estado / Reportes</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsReporteOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.reportSectionTitle}>Estado actual</Text>
            <Text style={styles.reportSectionSub}>Reporta el estado de tu viaje</Text>
            <View style={styles.reportBtnGrid}>
              <TouchableOpacity style={styles.reportBtn} onPress={() => handleReportar("Detencion por tráfico")} disabled={reporteCargando}>
                <Text style={styles.reportBtnText}>Detencion por tráfico</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportBtn} onPress={() => handleReportar("Detencion por inspeccion")} disabled={reporteCargando}>
                <Text style={styles.reportBtnText}>Detencion por inspeccion</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportBtn} onPress={() => handleReportar("Problema Mecánico")} disabled={reporteCargando}>
                <Text style={styles.reportBtnText}>Problema Mecánico</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.reportSectionTitle, { marginTop: 16 }]}>Reportar</Text>
            <Text style={styles.reportSectionSub}>Reporta incidencias o emergencias</Text>
            <TouchableOpacity style={styles.reportDangerBtn} onPress={() => handleReportar("Emergencia")} disabled={reporteCargando}>
              <Text style={styles.reportDangerText}>Emergencia</Text>
            </TouchableOpacity>

            {reporteCargando && (
              <ActivityIndicator style={{ marginTop: 20 }} size="small" color="#3B82F6" />
            )}
          </View>
        </View>
      </Modal>



      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.stepNumber}>1</Text>
          <Text style={styles.cardTitle}>Fotos de Recepción</Text>
        </View>
        <Text style={styles.cardDescription}>Tome fotos al cargar los bultos en el origen.</Text>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => handleTomarFoto('recepcion')}
        >
          <Text style={styles.actionBtnText}>📸 Tomar Foto</Text>
        </TouchableOpacity>
        {fotosRecepcion.length > 0 && (
          <View style={styles.fotoGrid}>
            {fotosRecepcion.map((uri, idx) => (
              <Image key={`rec-${idx}`} source={{ uri }} style={styles.imgPreview} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.stepNumber}>2</Text>
          <Text style={styles.cardTitle}>Navegación</Text>
        </View>
        <Text style={styles.cardDescription}>Inicie la ruta hacia el destino.</Text>
        <TouchableOpacity style={styles.mapBtn} onPress={handleOpenMaps}>
          <Text style={styles.actionBtnText}>📍 Abrir Google Maps</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.stepNumber}>3</Text>
          <Text style={styles.cardTitle}>Llegada a Destino</Text>
        </View>
        {!llegadaConfirmada ? (
          <>
            <Text style={styles.cardDescription}>Presione cuando haya llegado al punto de entrega.</Text>
            <TouchableOpacity style={styles.llegadaBtn} onPress={handleLlegada}>
              <Text style={styles.actionBtnText}>Llegó a Destino</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.timerContainer}>
            <Text style={styles.timerTitle}>Tiempo en destino</Text>
            <Text style={styles.timerText}>{timerSeconds}s</Text>
            <Text style={styles.timerCobro}>
              {timerSeconds > 30 ? `Cobro extra de espera: $${Math.ceil((timerSeconds-30)/15)*500}` : 'En tiempo de gracia (30s)'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.stepNumber}>4</Text>
          <Text style={styles.cardTitle}>Fotos de Entrega / Extra</Text>
        </View>
        <Text style={styles.cardDescription}>Registre el lugar de entrega u otra evidencia requerida.</Text>
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.actionBtn, {flex:1, marginRight:8}]} onPress={() => handleTomarFoto('entrega')}>
            <Text style={styles.actionBtnText}>📸 Entrega</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.extraBtn, {flex:1}]} onPress={() => handleTomarFoto('extra')}>
            <Text style={styles.actionBtnText}>📸 Extra</Text>
          </TouchableOpacity>
        </View>
        {fotosEntrega.length > 0 && (
          <View style={styles.fotoGrid}>
            {fotosEntrega.map((uri, idx) => (
              <Image key={`ent-${idx}`} source={{ uri }} style={styles.imgPreview} />
            ))}
          </View>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  mapHeaderPlaceholder: {
    height: 180,
    backgroundColor: '#E4F1EE',
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  mapPin: {
    position: 'absolute',
    right: 40,
    top: 80,
    width: 44,
    height: 44,
    backgroundColor: '#FFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -40,
    zIndex: 10,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDF0E1',
    borderWidth: 4,
    borderColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#805B10',
  },
  mainContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  routeMainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  routeMainSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  openReportBtn: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  openReportText: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    backgroundColor: '#FDF0E1',
    color: '#805B10',
    fontWeight: '800',
    fontSize: 16,
    width: 32,
    height: 32,
    textAlign: 'center',
    lineHeight: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  actionBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  mapBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  extraBtn: {
    backgroundColor: '#64748B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  llegadaBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fotoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  imgPreview: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timerContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  timerTitle: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
    marginBottom: 4,
  },
  timerText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#D97706',
  },
  timerCobro: {
    marginTop: 8,
    fontSize: 13,
    color: '#B45309',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 300,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
  },
  reportSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  reportSectionSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  reportBtnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reportBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  reportBtnText: {
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 14,
  },
  reportDangerBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
  },
  reportDangerText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 15,
  }
});


