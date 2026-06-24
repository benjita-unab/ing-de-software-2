import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator,
  TouchableWithoutFeedback, Keyboard, Linking
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { bffFetch } from '../src/services/bffService';
import { syncTraceabilityRecords } from '../src/services/syncEngine';
import { Alert } from 'react-native';

export default function RegistroViajeLinear({ onSyncComplete, rutaId, destino, estadoPago, estadoRuta, horaLlegadaDestino }) {
  const getInitialStep = () => {
    if (estadoRuta === 'EN_DESTINO') return 2;
    if (estadoRuta === 'EN_TRANSITO') return 1;
    return 0;
  };
  const [step, setStep] = useState(getInitialStep()); // 0: Recepción, 1: En Camino, 2: Entregando (Timer), 3: Entrega Final
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [localFallbackArrival, setLocalFallbackArrival] = useState(null);
  const cameraRef = useRef(null);
  const [fotos, setFotos] = useState({});
  const [tipoActivo, setTipoActivo] = useState(null);

  useEffect(() => {
    let interval;
    if (step >= 2) {
      if (!horaLlegadaDestino && !localFallbackArrival) {
        setLocalFallbackArrival(Date.now());
        bffFetch(`/api/rutas/${rutaId}/llegada`, { method: 'POST' }).catch(() => {});
      }
      
      interval = setInterval(() => {
        const arrivalTime = horaLlegadaDestino ? new Date(horaLlegadaDestino).getTime() : (localFallbackArrival || Date.now());
        setTimerSeconds(Math.floor((Date.now() - arrivalTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, horaLlegadaDestino, localFallbackArrival]);

  const handleOpenMaps = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    let loc = await Location.getCurrentPositionAsync({});
    const url = `https://www.google.com/maps/dir/?api=1&origin=${loc.coords.latitude},${loc.coords.longitude}&destination=${encodeURIComponent(destino || '')}`;
    Linking.openURL(url);
  };

  const handleTomarFoto = async (tipo) => {
    if (!cameraPermission?.granted) await requestCameraPermission();
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
        let etapaApi = 'RECEPCION';
        if (tipoActivo === 'extra') etapaApi = 'EVIDENCIA_ADICIONAL';
        else if (step === 3) etapaApi = 'HOJA_DESPACHO';

        const record = {
          id,
          etapa: etapaApi,
          photoUri: photo.uri,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: new Date().toISOString(),
          rutaId: rutaId
        };
        
        // Subir al servidor inmediatamente
        await syncTraceabilityRecords([record], rutaId);
        
        // Guardar para vista previa
        setFotos({ ...fotos, [tipoActivo === 'extra' ? 'extra' : step]: photo.uri });
        
        if (tipoActivo === 'extra') {
          Alert.alert("Éxito", "Evidencia extra subida correctamente");
        }
      } catch (err) {
        Alert.alert("Error", "No se pudo subir la foto");
      } finally {
        setIsCapturing(false);
        setIsCameraOpen(false);
        setTipoActivo(null);
      }
    }
  };

  const nextStep = async () => {
    if (step === 0) {
      if (!fotos[0]) {
        Alert.alert("Foto requerida", "Debe tomar la foto de recepción de carga para continuar.");
        return;
      }
      // Inicia camino -> estado EN_TRANSITO
      await bffFetch(`/api/rutas/${rutaId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'EN_TRANSITO' })
      });
    }
    if (step === 1) {
      // Llegó a destino -> llamar backend para iniciar timer (estado EN_DESTINO internamente)
      await bffFetch(`/api/rutas/${rutaId}/llegada`, { method: 'POST' });
      onSyncComplete(true); // Directly trigger the blue and yellow buttons!
    }
    setStep(s => Math.min(s + 1, 2));
  };

  if (isCameraOpen) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView style={{ flex: 1 }} ref={cameraRef} facing="back">
          <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 }}>
             <TouchableOpacity style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: 'white' }} onPress={handleCapture} />
             <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setIsCameraOpen(false)}>
               <Text style={{ color: 'white' }}>Cancelar</Text>
             </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  const renderStep = () => {
    switch(step) {
      case 0:
        return (
          <View>
            <Text style={styles.title}>Recepción de Carga</Text>
            {estadoPago !== 'pagado' && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>⏳ Esperando el pago base del cliente. No puedes iniciar la ruta hasta que se complete el pago.</Text>
              </View>
            )}
            <TouchableOpacity 
              style={[styles.btn, estadoPago !== 'pagado' && { opacity: 0.5 }]} 
              onPress={() => estadoPago === 'pagado' && handleTomarFoto('recepcion')}
              disabled={estadoPago !== 'pagado'}
            >
              <Text style={styles.btnText}>Tomar Foto Recepción</Text>
            </TouchableOpacity>
            {fotos[0] && <Image source={{ uri: fotos[0] }} style={styles.imgPreview} />}
          </View>
        );
      case 1:
        return (
          <View>
            <Text style={styles.title}>En camino al cliente y operador</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={nextStep}><Text style={styles.btnText}>Llegó a Destino</Text></TouchableOpacity>
          </View>
        );
      case 2:
        return (
          <View>
            <Text style={styles.title}>Proceso de Entrega</Text>
            {/* The rest of the buttons (blue/yellow) will appear natively from BotonCerrarDespacho directly below this, gracefully integrating. */}
          </View>
        );
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {renderStep()}
        {step >= 2 && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.timer}>{timerSeconds}s</Text>
            <Text style={styles.cobroInfo}>{timerSeconds > 30 ? `Cobro extra: $${Math.ceil((timerSeconds-30)/15)*500}` : 'Tiempo de gracia (30s)'}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.mapBtn} onPress={handleOpenMaps}><Text style={styles.mapBtnText}>📍 Abrir Google Maps</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btnExtra} onPress={() => handleTomarFoto('extra')}><Text style={styles.btnText}>📸 Evidencia Extra</Text></TouchableOpacity>
        {step === 0 && (
          <TouchableOpacity 
            style={[styles.btnPrimary, estadoPago !== 'pagado' && { backgroundColor: '#555' }]} 
            onPress={nextStep}
            disabled={estadoPago !== 'pagado'}
          >
            <Text style={styles.btnText}>Siguiente</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: 'rgba(30, 30, 30, 0.6)', borderRadius: 10, marginTop: 10, borderColor: '#ffffff20', borderWidth: 1, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0, marginBottom: 0 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 20, textAlign: 'center' },
  btn: { backgroundColor: '#333333', padding: 15, borderRadius: 8, marginVertical: 10 },
  btnPrimary: { backgroundColor: '#4ade80', padding: 15, borderRadius: 8, marginVertical: 10 },
  btnExtra: { backgroundColor: '#6366f1', padding: 15, borderRadius: 8, marginVertical: 10 },
  mapBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 8, marginVertical: 10 },
  btnText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  mapBtnText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  imgPreview: { width: '100%', height: 200, borderRadius: 8, marginVertical: 10 },
  timer: { fontSize: 40, textAlign: 'center', marginVertical: 20, fontWeight: 'bold', color: '#ffffff' },
  cobroInfo: { textAlign: 'center', color: '#ff4444', fontSize: 16, marginBottom: 20 },
  warningBox: { backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: 15, borderRadius: 8, marginVertical: 10, borderColor: '#ef4444', borderWidth: 1 },
  warningText: { color: '#fca5a5', textAlign: 'center', fontWeight: 'bold', fontSize: 15 }
});
