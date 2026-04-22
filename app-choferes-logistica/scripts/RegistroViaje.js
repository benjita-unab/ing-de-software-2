import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { syncTraceabilityRecords } from '../src/services/syncEngine';

const ETAPAS = ['Carga', 'Salida', 'Transito', 'Entrega'];
const STORAGE_KEY = 'hu1_traceability_records';

function ProgressSteps({ etapaActual }) {
  return (
    <View style={styles.progressContainer}>
      {ETAPAS.map((etapa, index) => (
        <View key={etapa} style={styles.stepWrapper}>
          <View
            style={[
              styles.stepCircle,
              index < etapaActual && styles.stepCompleted,
              index === etapaActual && styles.stepActive,
              index > etapaActual && styles.stepInactive,
            ]}
          >
            <Text style={styles.stepText}>{index + 1}</Text>
          </View>
          <Text style={styles.stepLabel}>{etapa}</Text>
        </View>
      ))}
    </View>
  );
}

function StageCard({
  etapaActual,
  fotoActual,
  pendingCount,
  onOpenCamera,
  onSyncNow,
  isCapturing,
  isSyncing,
}) {
  return (
    <View style={styles.actionContainer}>
      <Text style={styles.instructionText}>Fase actual: {ETAPAS[etapaActual]}</Text>

      {fotoActual ? (
        <View style={styles.thumbnailContainer}>
          <Image source={{ uri: fotoActual.photoUri }} style={styles.thumbnail} />
          <View style={styles.thumbMeta}>
            <Text style={styles.thumbTitle}>Foto registrada</Text>
            <Text style={styles.thumbText}>
              GPS: {fotoActual.latitude.toFixed(5)}, {fotoActual.longitude.toFixed(5)}
            </Text>
            <Text style={styles.thumbText}>{new Date(fotoActual.timestamp).toLocaleString()}</Text>
            <Text style={styles.thumbText}>
              Estado: {fotoActual.synced ? 'Sincronizado' : 'Pendiente'}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.missingPhotoText}>Aun no hay foto de esta etapa.</Text>
      )}

      <TouchableOpacity style={styles.btnCamara} onPress={onOpenCamera} disabled={isCapturing || isSyncing}>
        {isCapturing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{fotoActual ? 'Tomar nueva fotografia' : 'Tomar fotografia'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btnSync, (pendingCount === 0 || isSyncing) && styles.btnDisabled]}
        onPress={onSyncNow}
        disabled={pendingCount === 0 || isSyncing}
      >
        {isSyncing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sincronizar ahora</Text>}
      </TouchableOpacity>

      <View style={styles.syncPill}>
        <Text style={styles.syncPillText}>
          {pendingCount > 0
            ? `Pendiente de Sincronizacion (${pendingCount})`
            : 'Todos los registros sincronizados'}
        </Text>
      </View>
    </View>
  );
}

export default function RegistroViaje({ onSyncComplete }) {
  const [etapaActual, setEtapaActual] = useState(0);
  const [registros, setRegistros] = useState([]);
  const [viajeFinalizado, setViajeFinalizado] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setRegistros(parsed);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar registros locales.');
    }
  };

  const persistRecords = async (nextRecords) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    setRegistros(nextRecords);
  };

  const ensurePermissions = async () => {
    let hasCameraPermission = cameraPermission?.granted;
    if (!hasCameraPermission) {
      const camResult = await requestCameraPermission();
      hasCameraPermission = camResult.granted;
    }
    if (!hasCameraPermission) {
      Alert.alert('Permiso requerido', 'Debes aceptar el permiso de camara.');
      return false;
    }

    const locationResult = await Location.requestForegroundPermissionsAsync();
    if (locationResult.status !== 'granted') {
      Alert.alert('Permiso requerido', 'Debes aceptar el permiso de ubicacion.');
      return false;
    }

    return true;
  };

  const openCamera = async () => {
    if (viajeFinalizado) return;
    const granted = await ensurePermissions();
    if (!granted) return;
    setIsCameraOpen(true);
  };

  const manejarCapturaFoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const captureTimestamp = new Date().toISOString();
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Guardar permanentemente en el documentDirectory para que no se borre
      const fileExt = photo.uri.split('.').pop() || 'jpg';
      const recordId = `${ETAPAS[etapaActual]}-${Date.now()}`;
      const newPath = `${FileSystem.documentDirectory}${recordId}.${fileExt}`;
      await FileSystem.copyAsync({
        from: photo.uri,
        to: newPath
      });

      const newRecord = {
        id: recordId,
        stage: ETAPAS[etapaActual],
        photoUri: newPath, // Usar la nueva ruta local segura
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: captureTimestamp,
        synced: false,
      };

      const nextRecords = [...registros, newRecord];
      await persistRecords(nextRecords);
      setIsCameraOpen(false);
      Alert.alert('Exito', `Foto de ${newRecord.stage} guardada en modo offline.`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo capturar foto y ubicacion.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      const unsyncedRecords = registros.filter((record) => !record.synced);
      if (unsyncedRecords.length === 0) {
        Alert.alert('Sin pendientes', 'No hay registros pendientes por sincronizar.');
        return;
      }

      setIsSyncing(true);
      const syncedIds = await syncTraceabilityRecords(unsyncedRecords);
      const nextRecords = registros.map((record) =>
        syncedIds.includes(record.id) ? { ...record, synced: true } : record
      );
      await persistRecords(nextRecords);
      Alert.alert('Sincronizacion completa', `${syncedIds.length} registro(s) sincronizado(s).`);
    } catch (error) {
      console.log(error);
      Alert.alert('Error de Sincronización', error?.message || 'No fue posible sincronizar en este momento.');
    } finally {
      setIsSyncing(false);
    }
  };

  const avanzarEtapa = () => {
    const etapa = ETAPAS[etapaActual];
    const hasPhotoInCurrentStage = registros.some((record) => record.stage === etapa);
    if (!hasPhotoInCurrentStage) {
      Alert.alert('Bloqueo', 'Debes capturar al menos una fotografia para avanzar.');
      return;
    }

    if (etapaActual < ETAPAS.length - 1) {
      setEtapaActual((prev) => prev + 1);
    } else {
      setViajeFinalizado(true);
      setIsCameraOpen(false);
    }
  };

  const iniciarNuevoViaje = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setEtapaActual(0);
      setViajeFinalizado(false);
      setRegistros([]);
      setIsCameraOpen(false);
      setIsCapturing(false);
      setIsSyncing(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo reiniciar el viaje.');
    }
  };

  const etapa = ETAPAS[etapaActual];
  const registrosEtapaActual = registros.filter((record) => record.stage === etapa);
  const fotoActual = registrosEtapaActual[registrosEtapaActual.length - 1] || null;
  const pendingCount = registros.filter((record) => !record.synced).length;
  const pendientes = registros.filter((record) => !record.synced).length;

  useEffect(() => {
    if (onSyncComplete) {
      const isTodoListo = viajeFinalizado && pendientes === 0;
      onSyncComplete(isTodoListo);
    }
  }, [viajeFinalizado, pendientes, onSyncComplete]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {viajeFinalizado ? (
          <View style={styles.finalContainer}>
            <View style={styles.finalIconCircle}>
              <Text style={styles.finalIcon}>✓</Text>
            </View>
            <Text style={styles.finalTitle}>¡Viaje Finalizado con Éxito!</Text>
            <Text style={styles.finalDescription}>
              La evidencia final ha sido asegurada y no puede modificarse en esta ruta.
            </Text>
            {pendientes > 0 ? (
              <>
                <Text style={styles.pendingWarning}>Faltan {pendientes} evidencias por subir</Text>
                <TouchableOpacity
                  style={[styles.btnNuevoViaje, styles.btnSyncTodo, isSyncing && styles.btnDisabled]}
                  onPress={handleSyncNow}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Sincronizar Todo</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.btnNuevoViaje} onPress={iniciarNuevoViaje}>
                <Text style={styles.btnText}>Iniciar Nuevo Viaje</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : isCameraOpen ? (
          <View style={styles.cameraContainer}>
            <CameraView style={styles.camera} facing="back" ref={cameraRef} />
            <View style={styles.cameraActions}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setIsCameraOpen(false)}>
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnCapture} onPress={manejarCapturaFoto} disabled={isCapturing}>
                {isCapturing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Capturar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Trazabilidad de Carga Valiosa</Text>
              <Text style={styles.subtitle}>Etapa {etapaActual + 1} de 4</Text>
            </View>

            <ProgressSteps etapaActual={etapaActual} />

            <StageCard
              etapaActual={etapaActual}
              fotoActual={fotoActual}
              pendingCount={pendingCount}
              onOpenCamera={openCamera}
              onSyncNow={handleSyncNow}
              isCapturing={isCapturing}
              isSyncing={isSyncing}
            />

            <View style={styles.footer}>
              <TouchableOpacity style={styles.btnAvanzar} onPress={avanzarEtapa}>
                <Text style={styles.btnText}>
                  {etapaActual === ETAPAS.length - 1 ? 'Finalizar Viaje' : 'Confirmar y Avanzar'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FB' },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#E5EAF2',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1D2A3A' },
  subtitle: { fontSize: 15, color: '#667085', marginTop: 6 },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  stepWrapper: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  stepCompleted: { backgroundColor: '#16A34A' },
  stepActive: { backgroundColor: '#2563EB' },
  stepInactive: { backgroundColor: '#C7D2E0' },
  stepText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stepLabel: { fontSize: 12, color: '#475467', textAlign: 'center' },
  actionContainer: { flex: 1, paddingHorizontal: 20, paddingVertical: 10 },
  instructionText: {
    fontSize: 18,
    marginBottom: 14,
    fontWeight: '600',
    color: '#101828',
    textAlign: 'center',
  },
  missingPhotoText: {
    textAlign: 'center',
    color: '#98A2B3',
    marginBottom: 16,
  },
  thumbnailContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    padding: 12,
    marginBottom: 16,
  },
  thumbnail: { width: '100%', height: 190, borderRadius: 10, marginBottom: 10 },
  thumbMeta: { gap: 4 },
  thumbTitle: { fontSize: 15, fontWeight: '700', color: '#1D2939' },
  thumbText: { fontSize: 13, color: '#475467' },
  syncPill: {
    marginTop: 14,
    alignSelf: 'center',
    backgroundColor: '#FFF4ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 50,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  syncPillText: { color: '#C2410C', fontWeight: '600', fontSize: 12 },
  footer: { padding: 20, paddingBottom: 34, backgroundColor: '#fff' },
  btnCamara: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSync: {
    marginTop: 10,
    backgroundColor: '#6D28D9',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAvanzar: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  finalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  finalIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  finalIcon: { fontSize: 42, color: '#16A34A', fontWeight: '700' },
  finalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#14532D',
    textAlign: 'center',
    marginBottom: 10,
  },
  finalDescription: {
    fontSize: 16,
    color: '#166534',
    textAlign: 'center',
    marginBottom: 24,
  },
  btnNuevoViaje: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSyncTodo: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#6D28D9',
  },
  pendingWarning: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B45309',
    textAlign: 'center',
    marginBottom: 14,
  },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraActions: {
    position: 'absolute',
    bottom: 28,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  btnSecondary: {
    backgroundColor: 'rgba(17,24,39,0.8)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 130,
    alignItems: 'center',
  },
  btnCapture: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 130,
    alignItems: 'center',
  },
});