import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { useAutoSyncScheduler } from '../src/hooks/useAutoSyncScheduler';

/** Claves internas (coinciden con backend etapa). HU-21: evidencia libre usa EVIDENCIA_ADICIONAL */
const EVIDENCIA_ADICIONAL = 'EVIDENCIA_ADICIONAL';

const CATEGORIAS = ['Carga', 'Salida', 'Transito', 'Entrega', 'Ficha', EVIDENCIA_ADICIONAL];

const LABEL_CATEGORIA = {
  Carga: 'Carga',
  Salida: 'Salida',
  Transito: 'Tránsito',
  Entrega: 'Entrega',
  Ficha: 'Ficha',
  [EVIDENCIA_ADICIONAL]: 'Evid. adicional',
};

/** Mínimo 1 evidencia **sincronizada** por categoría para cerrar despacho */
const CATEGORIAS_OBLIGATORIAS = ['Carga', 'Salida', 'Transito', 'Entrega', 'Ficha'];

function storageKeyFromRutaId(rutaId) {
  const id = String(rutaId ?? '').trim();
  return id ? `hu1_traceability_records_${id}` : 'hu1_traceability_records_sin_ruta';
}

function normalizarEtapa(v) {
  if (!v) return 'Carga';
  const s = String(v).trim();
  if (s === 'Extra') return EVIDENCIA_ADICIONAL;
  const map = {
    tránsito: 'Transito',
    transito: 'Transito',
    Tránsito: 'Transito',
  };
  if (map[s]) return map[s];
  if (CATEGORIAS.includes(s)) return s;
  if (s === 'Tránsito') return 'Transito';
  return s;
}

function inferirTipo(etapa) {
  return String(etapa).trim() === 'Ficha' ? 'FICHA_DESPACHO' : 'EVIDENCIA';
}

function migrarRegistro(raw, rutaId) {
  const etapa = normalizarEtapa(raw.etapa ?? raw.stage);
  const tipo = raw.tipo || inferirTipo(etapa);
  return {
    id: raw.id,
    ruta_id: String(raw.ruta_id ?? rutaId ?? '').trim() || String(rutaId),
    etapa,
    tipo,
    photoUri: raw.photoUri,
    latitude: typeof raw.latitude === 'number' ? raw.latitude : Number(raw.latitud) || 0,
    longitude: typeof raw.longitude === 'number' ? raw.longitude : Number(raw.longitud) || 0,
    timestamp: raw.timestamp,
    synced: !!raw.synced,
  };
}

function contarPorCategoria(registros, cat) {
  return registros.filter((r) => r.etapa === cat).length;
}

function tieneSyncEnCategoria(registros, cat) {
  return registros.some((r) => r.etapa === cat && r.synced);
}

function categoriasObligatoriasFaltantes(registros) {
  return CATEGORIAS_OBLIGATORIAS.filter((c) => !tieneSyncEnCategoria(registros, c));
}

function puedeCerrarDespacho(registros) {
  const pend = registros.filter((r) => !r.synced).length;
  if (pend > 0) return false;
  return categoriasObligatoriasFaltantes(registros).length === 0;
}

export default function RegistroViaje({ onSyncComplete, rutaId }) {
  const STORAGE_KEY = storageKeyFromRutaId(rutaId);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Carga');
  const [registros, setRegistros] = useState([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const registrosRef = useRef(registros);
  registrosRef.current = registros;

  const recordsRevision = useMemo(
    () => registros.map((r) => `${r.id}:${r.synced ? 1 : 0}:${r.etapa}`).join(';'),
    [registros],
  );

  const applySyncedIds = useCallback(
    async (syncedIds) => {
      const current = registrosRef.current;
      const next = current.map((record) =>
        syncedIds.includes(record.id) ? { ...record, synced: true } : record,
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setRegistros(next);
    },
    [STORAGE_KEY],
  );

  useAutoSyncScheduler({
    rutaId,
    registrosRef,
    applySyncedIds,
    setIsSyncing,
    recordsRevision,
  });

  useEffect(() => {
    let cancelled = false;
    setCategoriaSeleccionada('Carga');
    setRegistros([]);
    setIsCameraOpen(false);
    setIsCapturing(false);
    setIsSyncing(false);

    async function cargar(idActual) {
      const key = storageKeyFromRutaId(idActual);
      try {
        const raw = await AsyncStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        const migrados = Array.isArray(parsed)
          ? parsed.map((row) => migrarRegistro(row, idActual))
          : [];
        if (!cancelled) setRegistros(migrados);
      } catch {
        if (!cancelled) Alert.alert('Error', 'No se pudieron cargar registros locales.');
      }
    }

    void cargar(rutaId);
    return () => {
      cancelled = true;
    };
  }, [rutaId]);

  const persistRecords = async (nextRecords) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    setRegistros(nextRecords);
  };

  const pendingCount = registros.filter((r) => !r.synced).length;
  const totalEvidencias = registros.length;
  const faltanObl = categoriasObligatoriasFaltantes(registros);
  const listoCierre = puedeCerrarDespacho(registros);

  useEffect(() => {
    onSyncComplete?.(listoCierre);
  }, [listoCierre, onSyncComplete]);

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

  const abrirCamara = async () => {
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

      const fileExt = photo.uri.split('.').pop() || 'jpg';
      const etapa = categoriaSeleccionada;
      const recordId = `${etapa}-${Date.now()}`;
      const newPath = `${FileSystem.documentDirectory}${recordId}.${fileExt}`;
      await FileSystem.copyAsync({
        from: photo.uri,
        to: newPath,
      });

      const newRecord = {
        id: recordId,
        ruta_id: String(rutaId).trim(),
        etapa,
        tipo: inferirTipo(etapa),
        photoUri: newPath,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: captureTimestamp,
        synced: false,
      };

      await persistRecords([...registros, newRecord]);
      setIsCameraOpen(false);
      Alert.alert('Guardado', `Evidencia (${LABEL_CATEGORIA[etapa] ?? etapa}) en cola de sincronizacion.`);
    } catch {
      Alert.alert('Error', 'No se pudo capturar foto y ubicacion.');
    } finally {
      setIsCapturing(false);
    }
  };

  const sortedRegistros = useMemo(() => {
    return [...registros].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [registros]);

  const chipAncho = Math.min((Dimensions.get('window').width - 48) / 3, 120);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isCameraOpen ? (
          <View style={styles.cameraContainer}>
            <CameraView style={styles.camera} facing="back" ref={cameraRef} />
            <View style={styles.cameraActions}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setIsCameraOpen(false)}>
                <Text style={styles.btnLightText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnCapture} onPress={manejarCapturaFoto} disabled={isCapturing}>
                {isCapturing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnLightText}>Capturar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Evidencias del viaje</Text>
              <Text style={styles.subtitle}>Ruta activa · selecciona categoría y añade fotos</Text>
            </View>

            <Text style={styles.sectionLabel}>Categorías</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}
            >
              {CATEGORIAS.map((cat) => {
                const n = contarPorCategoria(registros, cat);
                const oblig = CATEGORIAS_OBLIGATORIAS.includes(cat);
                const cumpleSync = tieneSyncEnCategoria(registros, cat);
                const soloPendiente =
                  oblig &&
                  registros.some((r) => r.etapa === cat && !r.synced) &&
                  !cumpleSync;
                const sinFotos = n === 0 && oblig;

                let chipStyle = styles.catChip;
                if (categoriaSeleccionada === cat) chipStyle = { ...chipStyle, ...styles.catChipSelected };
                if (!oblig) {
                  chipStyle = { ...chipStyle, ...styles.catChipExtra };
                } else if (cumpleSync) {
                  chipStyle = { ...chipStyle, ...styles.catChipOk };
                } else if (soloPendiente || sinFotos) {
                  chipStyle = { ...chipStyle, ...styles.catChipWarn };
                }

                return (
                  <TouchableOpacity
                    key={cat}
                    style={[chipStyle, { minWidth: chipAncho }]}
                    onPress={() => setCategoriaSeleccionada(cat)}
                  >
                    <Text style={styles.catChipText} numberOfLines={2}>
                      {LABEL_CATEGORIA[cat] ?? cat}
                    </Text>
                    <Text style={styles.catChipCount}>({n})</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.btnAdd, (isCapturing || isSyncing) && styles.btnDisabled]}
              onPress={abrirCamara}
              disabled={isCapturing || isSyncing}
            >
              <Text style={styles.btnAddText}>+ Añadir Evidencia</Text>
            </TouchableOpacity>

            <View style={styles.resumenCard}>
              <Text style={styles.resumenLine}>
                Total evidencias: <Text style={styles.resumenStrong}>{totalEvidencias}</Text>
              </Text>
              <Text style={styles.resumenLine}>
                Pendientes por subir: <Text style={styles.resumenStrong}>{pendingCount}</Text>
              </Text>
              {isSyncing ? (
                <View style={styles.syncRow}>
                  <ActivityIndicator size="small" color="#6D28D9" />
                  <Text style={styles.syncText}> Sincronizando…</Text>
                </View>
              ) : null}
              {faltanObl.length > 0 ? (
                <Text style={styles.alertReq}>
                  Faltan evidencias obligatorias sincronizadas: {faltanObl.map((c) => LABEL_CATEGORIA[c] ?? c).join(', ')}
                </Text>
              ) : null}
              {pendingCount > 0 ? (
                <Text style={styles.alertPend}>Hay evidencias pendientes de sincronización</Text>
              ) : null}
              {listoCierre ? (
                <Text style={styles.okCierre}>Listo para cerrar despacho (requisitos cumplidos)</Text>
              ) : null}
            </View>

            <Text style={styles.sectionLabel}>Registro del viaje</Text>
            {sortedRegistros.length === 0 ? (
              <Text style={styles.emptyText}>Aún no hay evidencias. Usa el botón superior para añadir.</Text>
            ) : (
              sortedRegistros.map((r) => (
                <View key={r.id} style={styles.thumbRow}>
                  <Image source={{ uri: r.photoUri }} style={styles.thumbSmall} />
                  <View style={styles.thumbMeta}>
                    <Text style={styles.thumbTitle}>{LABEL_CATEGORIA[r.etapa] ?? r.etapa}</Text>
                    <Text style={styles.thumbSub}>{new Date(r.timestamp).toLocaleString()}</Text>
                    <Text style={styles.thumbSub}>
                      GPS: {Number(r.latitude).toFixed(5)}, {Number(r.longitude).toFixed(5)}
                    </Text>
                    <Text style={[styles.thumbSub, r.synced ? styles.syncOk : styles.syncNo]}>
                      {r.synced ? 'Sincronizado' : 'Pendiente'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FB' },
  scrollContent: { flexGrow: 1, paddingBottom: 28 },
  header: {
    padding: 18,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#E5EAF2',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1D2A3A' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 6 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475467',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  catRow: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  catChip: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginRight: 8,
    alignItems: 'center',
  },
  catChipSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  catChipOk: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  catChipWarn: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  catChipExtra: {
    borderColor: '#94A3B8',
    backgroundColor: '#F8FAFC',
  },
  catChipText: { fontSize: 13, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  catChipCount: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600' },
  btnAdd: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnAddText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  btnDisabled: { opacity: 0.55 },
  resumenCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    gap: 6,
  },
  resumenLine: { fontSize: 14, color: '#334155' },
  resumenStrong: { fontWeight: '800', color: '#0f172a' },
  syncRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  syncText: { fontSize: 13, color: '#6D28D9', fontWeight: '600' },
  alertReq: { fontSize: 13, color: '#C2410C', fontWeight: '600', marginTop: 6 },
  alertPend: { fontSize: 13, color: '#B45309', fontWeight: '600' },
  okCierre: { fontSize: 13, color: '#15803D', fontWeight: '700', marginTop: 4 },
  emptyText: { marginHorizontal: 16, color: '#94A3B8', fontSize: 14 },
  thumbRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    overflow: 'hidden',
  },
  thumbSmall: { width: 96, height: 96, backgroundColor: '#E5E7EB' },
  thumbMeta: { flex: 1, padding: 10, justifyContent: 'center' },
  thumbTitle: { fontSize: 15, fontWeight: '700', color: '#1D2939' },
  thumbSub: { fontSize: 12, color: '#475467', marginTop: 2 },
  syncOk: { color: '#15803D', fontWeight: '700' },
  syncNo: { color: '#C2410C', fontWeight: '700' },
  cameraContainer: { flex: 1, minHeight: 420, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#000',
  },
  btnSecondary: {
    backgroundColor: 'rgba(17,24,39,0.85)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  btnCapture: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 130,
    alignItems: 'center',
  },
  btnLightText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
