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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { useAutoSyncScheduler } from '../src/hooks/useAutoSyncScheduler';

/** Claves canónicas (etapa en API / carpeta en storage) */
const HOJA_DESPACHO = 'HOJA_DESPACHO';
const RECEPCION = 'RECEPCION';
const ENTREGADO = 'ENTREGADO';

const EVIDENCIA_ADICIONAL = 'EVIDENCIA_ADICIONAL';

const ETAPAS_CANONICAS = [RECEPCION, ENTREGADO, HOJA_DESPACHO, EVIDENCIA_ADICIONAL];

const LABEL_CATEGORIA = {
  [RECEPCION]: 'Recepción de carga',
  [ENTREGADO]: 'Entrega final',
  [HOJA_DESPACHO]: 'Hoja de despacho',
  [EVIDENCIA_ADICIONAL]: 'Evidencia extra',
  // Etiquetas legibles para datos antiguos no migrados en memoria
  Carga: 'Carga',
  Salida: 'Salida',
  Transito: 'Tránsito',
  Entrega: 'Entrega',
  Ficha: 'Ficha',
};

/**
 * Mínimo 1 evidencia sincronizada por categoría principal para cerrar despacho.
 * Orden del mensaje de faltantes: recepción → entrega final → hoja de despacho.
 */
const CATEGORIAS_OBLIGATORIAS = [RECEPCION, ENTREGADO, HOJA_DESPACHO];

function storageKeyFromRutaId(rutaId) {
  const id = String(rutaId ?? '').trim();
  return id ? `hu1_traceability_records_${id}` : 'hu1_traceability_records_sin_ruta';
}

function sinTildesUpper(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

/**
 * Convierte cualquier etapa almacenada (nueva o legacy) a una categoría canónica.
 * Compatibilidad: Ficha→HOJA_DESPACHO; Carga/Salida/Transito→RECEPCION; Entrega→ENTREGADO;
 * Extra/EVIDENCIA_ADICIONAL→EVIDENCIA_ADICIONAL.
 */
function aEtapaCanonico(v) {
  if (v == null || v === '') return RECEPCION;
  let s = String(v).trim();
  const lower = s.toLowerCase();

  if (lower === 'tránsito' || lower === 'transito') s = 'Transito';

  const upper = sinTildesUpper(s);
  if (upper === 'HOJA_DESPACHO') return HOJA_DESPACHO;
  if (upper === 'RECEPCION') return RECEPCION;
  if (upper === 'ENTREGADO') return ENTREGADO;
  if (upper === 'EVIDENCIA_ADICIONAL') return EVIDENCIA_ADICIONAL;

  if (s === 'Ficha' || upper === 'FICHA_DESPACHO') return HOJA_DESPACHO;
  if (s === 'Entrega') return ENTREGADO;
  if (s === 'Carga' || s === 'Salida' || s === 'Transito' || s === 'Tránsito') return RECEPCION;
  if (s === EVIDENCIA_ADICIONAL || lower === 'extra') return EVIDENCIA_ADICIONAL;

  if (ETAPAS_CANONICAS.includes(s)) return s;

  return RECEPCION;
}

function inferirTipo(etapa) {
  const e = String(etapa).trim().toUpperCase();
  if (e === HOJA_DESPACHO) return 'FICHA_DESPACHO';
  return 'EVIDENCIA';
}

function migrarRegistro(raw, rutaId) {
  const etapa = aEtapaCanonico(raw.etapa ?? raw.stage);
  const tipo = inferirTipo(etapa);
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

function registroNecesitaPersistenciaMigracion(raw, migrado) {
  if (!raw || typeof raw !== 'object') return false;
  const rawEtapa = raw.etapa ?? raw.stage;
  const etapaDistinta = String(rawEtapa ?? '').trim() !== migrado.etapa;
  const tipoDistinto = String(raw.tipo ?? '') !== String(migrado.tipo ?? '');
  return etapaDistinta || tipoDistinto;
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

function etiquetaParaRegistro(r) {
  return LABEL_CATEGORIA[r.etapa] ?? r.etapa;
}

export default function RegistroViaje({ onSyncComplete, rutaId }) {
  const STORAGE_KEY = storageKeyFromRutaId(rutaId);
  const [registros, setRegistros] = useState([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  /** Si no es null, la próxima foto usa esta etapa (extra) sin cambiar el chip seleccionado */
  const etapaCapturaRef = useRef(null);
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

        if (Array.isArray(parsed) && migrados.length === parsed.length) {
          const algunoCambio = migrados.some((m, i) => registroNecesitaPersistenciaMigracion(parsed[i], m));
          if (algunoCambio) {
            await AsyncStorage.setItem(key, JSON.stringify(migrados));
          }
        }

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

  const cerrarCamara = () => {
    etapaCapturaRef.current = null;
    setIsCameraOpen(false);
  };

  /** Abre la cámara para una etapa específica */
  const abrirCamaraParaEtapa = async (etapa) => {
    etapaCapturaRef.current = etapa;
    const granted = await ensurePermissions();
    if (!granted) {
      etapaCapturaRef.current = null;
      return;
    }
    setIsCameraOpen(true);
  };

  const manejarCapturaFoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const captureTimestamp = new Date().toISOString();
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.55 });

      const fileExt = photo.uri.split('.').pop() || 'jpg';
      const etapa = etapaCapturaRef.current ?? RECEPCION;
      const recordId = `${etapa}-${Date.now()}`;
      const newPath = `${FileSystem.documentDirectory}${recordId}.${fileExt}`;

      const [, position] = await Promise.all([
        FileSystem.copyAsync({
          from: photo.uri,
          to: newPath,
        }),
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        }),
      ]);

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
      cerrarCamara();
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isCameraOpen ? (
          <View style={styles.cameraContainer}>
            <CameraView style={styles.camera} facing="back" ref={cameraRef} />
            <View style={styles.cameraActions}>
              <TouchableOpacity style={styles.btnSecondary} onPress={cerrarCamara}>
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
              <Text style={styles.subtitle}>
                Captura directa por tipo de evidencia
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Captura rápida</Text>
            <View style={styles.directButtonsGrid}>
              <TouchableOpacity
                style={[styles.btnDirect, isCapturing && styles.btnDisabled]}
                onPress={() => abrirCamaraParaEtapa(RECEPCION)}
                disabled={isCapturing}
              >
                <Text style={styles.btnDirectText}>Recepción de carga</Text>
                <Text style={styles.btnDirectCount}>({contarPorCategoria(registros, RECEPCION)})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnDirect, isCapturing && styles.btnDisabled]}
                onPress={() => abrirCamaraParaEtapa(ENTREGADO)}
                disabled={isCapturing}
              >
                <Text style={styles.btnDirectText}>Entrega final</Text>
                <Text style={styles.btnDirectCount}>({contarPorCategoria(registros, ENTREGADO)})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnDirect, isCapturing && styles.btnDisabled]}
                onPress={() => abrirCamaraParaEtapa(HOJA_DESPACHO)}
                disabled={isCapturing}
              >
                <Text style={styles.btnDirectText}>Hoja de despacho</Text>
                <Text style={styles.btnDirectCount}>({contarPorCategoria(registros, HOJA_DESPACHO)})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnDirect, isCapturing && styles.btnDisabled]}
                onPress={() => abrirCamaraParaEtapa(EVIDENCIA_ADICIONAL)}
                disabled={isCapturing}
              >
                <Text style={styles.btnDirectText}>Evidencia extra</Text>
                <Text style={styles.btnDirectCount}>({contarPorCategoria(registros, EVIDENCIA_ADICIONAL)})</Text>
              </TouchableOpacity>
            </View>

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
                  Faltan evidencias obligatorias sincronizadas:{' '}
                  {faltanObl.map((c) => LABEL_CATEGORIA[c] ?? c).join(', ')}
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
              <Text style={styles.emptyText}>
                Aún no hay evidencias. Usa los botones de captura rápida.
              </Text>
            ) : (
              sortedRegistros.map((r) => (
                <View key={r.id} style={styles.thumbRow}>
                  <Image source={{ uri: r.photoUri }} style={styles.thumbSmall} />
                  <View style={styles.thumbMeta}>
                    <Text style={styles.thumbTitle}>{etiquetaParaRegistro(r)}</Text>
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
  directButtonsGrid: {
    paddingHorizontal: 16,
    gap: 10,
  },
  btnDirect: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#C4B5FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDirectText: { color: '#5B21B6', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  btnDirectCount: { fontSize: 12, color: '#6D28D9', marginTop: 4, fontWeight: '700' },
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
