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
  Modal,
  Pressable,
  TextInput,
  Linking,
  Platform,

} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { useAutoSyncScheduler } from '../src/hooks/useAutoSyncScheduler';
import { bffFetch } from '../src/services/bffService';
import {
  loadMensajeQueue,
  saveMensajeQueue,
  enqueueConductorMessage,
  sendEmergencyMessageInmediately,
} from '../src/services/mensajesConductorService';
import { useMensajesQueueScheduler } from '../src/hooks/useMensajesQueueScheduler';
import { MENSAJES_CATALOGO } from '../src/constants/mensajesCatalog';
import mqtt from 'mqtt';

/** Claves canónicas (etapa en API / carpeta en storage) */
const HOJA_DESPACHO = 'HOJA_DESPACHO';
const RECEPCION = 'RECEPCION';
const ENTREGADO = 'ENTREGADO';

const EVIDENCIA_ADICIONAL = 'EVIDENCIA_ADICIONAL';
const ANOMALIA = 'ANOMALIA';

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
  const ruta_id = String(raw.ruta_id ?? raw.rutaId ?? rutaId ?? '').trim() || String(rutaId ?? '').trim();
  return {
    id: raw.id,
    ruta_id,
    rutaId: ruta_id,
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
  const rutaDistinta =
    String(raw.ruta_id ?? raw.rutaId ?? '').trim() !== String(migrado.ruta_id ?? '');
  return etapaDistinta || tipoDistinto || rutaDistinta;
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
  const insets = useSafeAreaInsets();
  const STORAGE_KEY = storageKeyFromRutaId(rutaId);
  const [registros, setRegistros] = useState([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMessagesSyncing, setIsMessagesSyncing] = useState(false);
  const [mensajesQueue, setMensajesQueue] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [isAnomaliaModalVisible, setIsAnomaliaModalVisible] = useState(false);
  const [anomaliaTitulo, setAnomaliaTitulo] = useState('');
  const [anomaliaDescripcion, setAnomaliaDescripcion] = useState('');
  const [anomaliaEsPrioritario, setAnomaliaEsPrioritario] = useState(false);
  const [anomaliaFotoUri, setAnomaliaFotoUri] = useState(null);
  const [isSendingAnomalia, setIsSendingAnomalia] = useState(false);
  const [isAnomaliaPhotoMode, setIsAnomaliaPhotoMode] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  /** Si no es null, la próxima foto usa esta etapa (extra) sin cambiar el chip seleccionado */
  const etapaCapturaRef = useRef(null);
  const registrosRef = useRef(registros);
  registrosRef.current = registros;
  const mensajesQueueRef = useRef(mensajesQueue);
  mensajesQueueRef.current = mensajesQueue;

  const recordsRevision = useMemo(
    () => registros.map((r) => `${r.id}:${r.synced ? 1 : 0}:${r.etapa}`).join(';'),
    [registros],
  );

  const mensajesRevision = useMemo(
    () => mensajesQueue.map((item) => `${item.id}:${item.synced ? 1 : 0}`).join(';'),
    [mensajesQueue],
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

  const applySyncedMessageIds = useCallback(
    async (syncedIds) => {
      const current = mensajesQueueRef.current;
      const next = current.map((message) =>
        syncedIds.includes(message.id) ? { ...message, synced: true } : message,
      );
      await saveMensajeQueue(rutaId, next);
      setMensajesQueue(next);
    },
    [rutaId],
  );

  useAutoSyncScheduler({
    rutaId,
    registrosRef,
    applySyncedIds,
    setIsSyncing,
    recordsRevision,
  });

  useMensajesQueueScheduler({
    rutaId,
    queueRef: mensajesQueueRef,
    applySyncedIds: applySyncedMessageIds,
    setIsSyncing: setIsMessagesSyncing,
    queueRevision: mensajesRevision,
  });

  useEffect(() => {
    console.log('REGISTRO VIAJE -> ruta activa al entrar:', String(rutaId ?? '').trim() || '(vacía)');
  }, [rutaId]);

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

        const mensajes = await loadMensajeQueue(idActual);

        if (!cancelled) {
          setRegistros(migrados);
          setMensajesQueue(Array.isArray(mensajes) ? mensajes : []);
        }
      } catch {
        if (!cancelled) Alert.alert('Error', 'No se pudieron cargar registros locales.');
      }
    }

    void cargar(rutaId);
    return () => {
      cancelled = true;
    };
  }, [rutaId]);

  // =========================================================
  // MOTOR DE TRANSMISIÓN GPS AUTOMÁTICA VÍA MQTT
  // =========================================================
  useEffect(() => {
    if (!rutaId) return;

    let locationSubscription = null;
    
    // 1. Leemos la IP desde tu archivo .env
    const brokerUrl = process.env.EXPO_PUBLIC_MQTT_BROKER_URL;
    if (!brokerUrl) {
      console.warn("No se encontró EXPO_PUBLIC_MQTT_BROKER_URL en el .env");
      return;
    }

    // 2. Nos conectamos a Mosquitto
    const client = mqtt.connect(brokerUrl);

    client.on('connect', async () => {
      console.log('✅ Conectado a MQTT para transmisión GPS automática');

      // 3. Verificamos permisos de ubicación
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permiso de ubicación denegado. No se enviará GPS.');
        return;
      }

      // 4. Encendemos el rastreador automático de Expo
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,    // Transmitir cada 5 segundos
          distanceInterval: 10,  // O cada vez que avance 10 metros
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          
          const topic = `logitrack/rutas/${rutaId}/gps`;
          const payload = JSON.stringify({
            lat: latitude,
            lng: longitude,
            timestamp: new Date().toISOString()
          });

          // 5. ¡Disparamos el mensaje por el aire sin tocar botones!
          client.publish(topic, payload, { qos: 0 });
          console.log('📍 GPS Automático publicado:', latitude, longitude);
        }
      );
    });

    client.on('error', (err) => console.error('Error MQTT:', err));

    // 6. Limpieza: Cuando se cierra el viaje, apagamos el rastreador para ahorrar batería
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      client.end();
      console.log('🛑 Transmisión GPS detenida');
    };
  }, [rutaId]);
  // =========================================================

  const persistRecords = async (nextRecords) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    setRegistros(nextRecords);
  };

  const persistMessages = async (nextMessages) => {
    await saveMensajeQueue(rutaId, nextMessages);
    setMensajesQueue(nextMessages);
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
    setIsAnomaliaPhotoMode(false);
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

  const abrirCamaraParaAnomalia = async () => {
    etapaCapturaRef.current = ANOMALIA;
    setIsAnomaliaPhotoMode(true);
    const granted = await ensurePermissions();
    if (!granted) {
      etapaCapturaRef.current = null;
      setIsAnomaliaPhotoMode(false);
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

      if (etapa === ANOMALIA) {
        setAnomaliaFotoUri(newPath);
        cerrarCamara();
        return;
      }

      const ruta_id = String(rutaId ?? '').trim();
      const newRecord = {
        id: recordId,
        ruta_id,
        rutaId: ruta_id,
        etapa,
        tipo: inferirTipo(etapa),
        photoUri: newPath,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: captureTimestamp,
        synced: false,
      };

      console.log('REGISTRO VIAJE -> evidencia local guardada:', {
        id: newRecord.id,
        ruta_id: newRecord.ruta_id,
        etapa: newRecord.etapa,
        tipo: newRecord.tipo,
        photoUri: newRecord.photoUri,
        timestamp: newRecord.timestamp,
      });

      await persistRecords([...registros, newRecord]);
      cerrarCamara();
    } catch {
      Alert.alert('Error', 'No se pudo capturar foto y ubicacion.');
    } finally {
      setIsCapturing(false);
    }
  };

  const reportarEstado = async (option) => {
    if (!rutaId || !String(rutaId).trim()) {
      Alert.alert('Ruta no disponible', 'Debes seleccionar una ruta activa para enviar un mensaje.');
      return;
    }

    const esEmergencia = option.prioridad === 'ALTA' && option.tipo === 'EMERGENCIA';

    try {
      let message;
      let synced = false;

      if (esEmergencia) {
        const payload = {
          ruta_id: String(rutaId).trim(),
          mensaje: option.label,
          tipo: option.tipo,
          prioridad: option.prioridad,
        };
        console.log('EMERGENCIA payload:', payload);
        const result = await sendEmergencyMessageInmediately(rutaId, option.label);
        console.log('EMERGENCIA response:', result);
        message = result.message;
        synced = result.synced;

        if (synced) {
          const updatedQueue = [...mensajesQueueRef.current, message];
          await persistMessages(updatedQueue);
        } else {
          const freshQueue = await loadMensajeQueue(rutaId);
          setMensajesQueue(freshQueue);
        }
      } else {
        message = await enqueueConductorMessage(
          rutaId,
          option.label,
          option.tipo,
          option.prioridad,
        );
        const updatedQueue = [...mensajesQueueRef.current, message];
        await persistMessages(updatedQueue);
      }

      if (esEmergencia) {
        Alert.alert(
          'Emergencia reportada',
          synced
            ? 'La emergencia se envió inmediatamente al servidor.'
            : 'La emergencia se guardó localmente y se sincronizará cuando haya conexión.',
        );
      } else {
        Alert.alert(
          'Mensaje guardado',
          'El estado se ha guardado localmente y se sincronizará automáticamente.',
        );
      }
    } catch (error) {
      if (esEmergencia) {
        console.error('EMERGENCIA error:', error);
      }
      Alert.alert('Error', 'No se pudo guardar el mensaje. Intenta de nuevo.');
    }
  };


  const enviarAnomalia = async () => {
    console.log('[HU-29] Iniciando submit de anomalía');
    console.log('[HU-29] Estado inicial:', {
      rutaId,
      tieneFoto: Boolean(anomaliaFotoUri),
      tituloLength: anomaliaTitulo?.trim()?.length ?? 0,
      descripcionLength: anomaliaDescripcion?.trim()?.length ?? 0,
      prioritario: anomaliaEsPrioritario,
    });

    if (!anomaliaTitulo.trim() || !anomaliaDescripcion.trim()) {
      console.log('[HU-29] Validación fallida: faltan título o descripción');
      Alert.alert('Validación', 'Título y descripción son obligatorios.');
      return;
    }

    if (!rutaId || !String(rutaId).trim()) {
      console.log('[HU-29] Validación fallida: rutaId inválido');
      Alert.alert('Ruta no disponible', 'Debes tener una ruta activa para generar un reporte.');
      return;
    }

    // Evita bloqueos silenciosos si una promesa de red queda colgada.
    const withTimeout = (promise, ms, step) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout en ${step} (${ms}ms)`)), ms),
        ),
      ]);

    setIsSendingAnomalia(true);

    try {
      let foto_url;
      console.log('[HU-29] Preparando payload de anomalía');

      if (anomaliaFotoUri) {
        console.log('[HU-29] Preparando imagen para upload:', anomaliaFotoUri);
        const ext = anomaliaFotoUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
        const fileExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
        const mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;

        const formData = new FormData();
        formData.append('file', {
          uri: anomaliaFotoUri,
          name: `anomalia_${Date.now()}.${fileExtension}`,
          type: mimeType,
        });
        formData.append('bucket', 'fotos_anomalias');
        formData.append('folder', `anomalias/${rutaId}`);

        console.log('[HU-29] Subiendo a Storage...');
        const uploadResponse = await withTimeout(
          bffFetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
          }),
          20000,
          'subida de imagen',
        );

        const uploadPayload = await uploadResponse.json().catch(() => ({}));
        console.log('[HU-29] Respuesta upload:', {
          ok: uploadResponse.ok,
          status: uploadResponse.status,
          payload: uploadPayload,
        });

        if (!uploadResponse.ok) {
          throw new Error(uploadPayload?.error ?? 'No se pudo subir la fotografía.');
        }

        foto_url = uploadPayload.publicUrl ?? uploadPayload.filePath;
        console.log('[HU-29] Imagen subida, URL/path:', foto_url);
      } else {
        console.log('[HU-29] Submit sin fotografía');
      }

      const body = {
        titulo: anomaliaTitulo.trim(),
        es_prioritario: anomaliaEsPrioritario,
        descripcion: anomaliaDescripcion.trim(),
        ...(foto_url ? { foto_url } : {}),
      };

      console.log('[HU-29] Insertando en BD vía BFF /api/rutas/:id/anomalias');
      const response = await withTimeout(
        bffFetch(`/api/rutas/${rutaId}/anomalias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
        20000,
        'insert de anomalía',
      );

      const payload = await response.json().catch(() => ({}));
      console.log('[HU-29] Respuesta insert:', {
        ok: response.ok,
        status: response.status,
        payload,
      });

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo enviar el reporte.');
      }

      console.log('[HU-29] Submit exitoso, limpiando formulario');
      setAnomaliaTitulo('');
      setAnomaliaDescripcion('');
      setAnomaliaEsPrioritario(false);
      setAnomaliaFotoUri(null);
      setIsAnomaliaModalVisible(false);
      Alert.alert('Reporte enviado', 'La anomalía se registró correctamente.');
    } catch (error) {
      console.log('[HU-29] Error en catch:', error);
      const message = error instanceof Error ? error.message : 'No fue posible enviar el reporte.';
      Alert.alert('Error', message);
    } finally {
      console.log('[HU-29] Finalizando submit, liberando loading');
      setIsSendingAnomalia(false);
    }
  };

  const handleOpenWaze = useCallback(async () => {
    if (!rutaId || !String(rutaId).trim()) {
      Alert.alert('Ruta no disponible', 'Debes seleccionar una ruta activa para abrir Waze.');
      return;
    }

    try {
      // Intentar obtener la dirección de la ruta desde el BFF
      const res = await bffFetch(`/api/rutas/${rutaId}`);
      const body = await res.json().catch(() => null);
      const ruta = body && body.data ? body.data : body;
      const destinoRaw = ruta?.destino ?? ruta?.direccion ?? '';
      const destino = String(destinoRaw ?? '').trim();

      if (!destino) {
        Alert.alert('Destino no disponible', 'La ruta seleccionada no tiene una dirección de destino.');
        return;
      }

      const q = encodeURIComponent(destino);
      const nativeUrl = `waze://?q=${q}&navigate=yes`;
      const webUrl = `https://www.waze.com/ul?q=${q}&navigate=yes`;

      try {
        const can = await Linking.canOpenURL(nativeUrl);
        if (can) {
          await Linking.openURL(nativeUrl);
        } else {
          await Linking.openURL(webUrl);
        }
      } catch (err) {
        console.log('Error abriendo URL nativa, usando fallback web', err);
        await Linking.openURL(webUrl);
      }
    } catch (err) {
      console.log('Error al obtener la ruta o abrir Waze:', err);
      Alert.alert('Error', 'No fue posible abrir Waze. Intenta nuevamente más tarde.');
    }
  }, [rutaId]);

  const sortedRegistros = useMemo(() => {
    return [...registros].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [registros]);

  if (isCameraOpen) {
    return (
      <SafeAreaView style={styles.cameraScreen}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Evidencias del viaje</Text>
              <Text style={styles.subtitle}>
                Captura directa por tipo de evidencia
              </Text>
            </View>

            <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => setIsOptionsMenuOpen((prev) => !prev)}
                  style={styles.headerMenuButton}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir menú de opciones"
                >
                  <Text style={styles.headerMenuIcon}>⋮</Text>
                </TouchableOpacity>
                {isOptionsMenuOpen ? (
                  <View style={styles.headerDropdown}>
                    <TouchableOpacity
                      style={styles.headerDropdownItem}
                      onPress={() => {
                        setIsAnomaliaModalVisible(true);
                        setIsOptionsMenuOpen(false);
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={styles.headerDropdownText}>Generar Reporte</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
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

            <View style={styles.messageSection}>
              <TouchableOpacity
                style={styles.btnGestionEstado}
                onPress={() => setIsModalVisible(true)}
                accessibilityRole="button"
              >
                <Text style={styles.btnGestionEstadoText}>Notificar Estado</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnOpenWaze}
                onPress={handleOpenWaze}
                accessibilityRole="button"
              >
                <Text style={styles.btnOpenWazeText}>Abrir en Waze</Text>
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
      </ScrollView>

      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar modal"
          />
          <View
            style={[
              styles.modalCard,
              {
                marginTop: Math.max(insets.top, 12),
                marginBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gestión de Estado / Reportes</Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.modalCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Estado actual</Text>
                <Text style={styles.sectionSubtitle}>
                  Reporta el estado de tu viaje
                </Text>
                <View style={styles.messageGrid}>
                  {MENSAJES_CATALOGO.filter(option => option.tipo === 'ESTADO').map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => {
                        reportarEstado(option);
                        setIsModalVisible(false);
                      }}
                      style={styles.messageButton}
                      accessibilityRole="button"
                    >
                      <Text style={styles.messageButtonText}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Reportar</Text>
                <Text style={styles.sectionSubtitle}>
                  Reporta incidencias o emergencias
                </Text>
                <View style={styles.messageGrid}>
                  {MENSAJES_CATALOGO.filter(option => option.tipo !== 'ESTADO').map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => {
                        reportarEstado(option);
                        setIsModalVisible(false);
                      }}
                      style={[
                        styles.messageButton,
                        option.prioridad === 'ALTA' && styles.messageButtonHigh,
                      ]}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.messageButtonText,
                          option.prioridad === 'ALTA' && styles.messageButtonTextHigh,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isAnomaliaModalVisible && !isCameraOpen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setIsAnomaliaModalVisible(false)}
      >
        <View style={[styles.modalOverlay, styles.modalSolidOverlay]}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsAnomaliaModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar modal"
          />
          <View
            style={[
              styles.modalCard,
              {
                marginTop: Math.max(insets.top, 12),
                marginBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reporte de anomalía</Text>
              <TouchableOpacity
                onPress={() => setIsAnomaliaModalVisible(false)}
                style={styles.modalCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Título</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Describe brevemente la anomalía"
                  value={anomaliaTitulo}
                  onChangeText={setAnomaliaTitulo}
                  returnKeyType="done"
                />
              </View>

              <View style={[styles.modalSection, styles.checkboxRow]}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setAnomaliaEsPrioritario((prev) => !prev)}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      anomaliaEsPrioritario && styles.checkboxBoxChecked,
                    ]}
                  >
                    {anomaliaEsPrioritario ? (
                      <Text style={styles.checkboxCheck}>✓</Text>
                    ) : null}
                  </View>
                  <Text style={styles.checkboxLabel}>Marcar reporte como prioritario</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Descripción</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Escribe los detalles de la anomalía"
                  value={anomaliaDescripcion}
                  onChangeText={setAnomaliaDescripcion}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Fotografía</Text>
                <TouchableOpacity
                  style={styles.btnAttachPhoto}
                  onPress={abrirCamaraParaAnomalia}
                  accessibilityRole="button"
                >
                  <Text style={styles.btnAttachPhotoText}>
                    {anomaliaFotoUri ? 'Cambiar fotografía' : 'Adjuntar Fotografía'}
                  </Text>
                </TouchableOpacity>
                {anomaliaFotoUri ? (
                  <Image source={{ uri: anomaliaFotoUri }} style={styles.anomaliaThumbnail} />
                ) : null}
              </View>

              <View style={styles.modalRowButtons}>
                <TouchableOpacity
                  style={[styles.btnSecondary, styles.modalButton]}
                  onPress={() => setIsAnomaliaModalVisible(false)}
                  accessibilityRole="button"
                >
                  <Text style={styles.btnLightText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnCapture, styles.modalButton, isSendingAnomalia && styles.btnDisabled]}
                  onPress={enviarAnomalia}
                  disabled={isSendingAnomalia}
                  accessibilityRole="button"
                >
                  {isSendingAnomalia ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnLightText}>Enviar Reporte</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
    paddingRight: 16,
  },
  headerActions: {
    position: 'relative',
    alignItems: 'flex-end',
  },
  headerMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
  },
  headerMenuIcon: {
    fontSize: 22,
    color: '#1D2A3A',
    lineHeight: 24,
  },
  headerDropdown: {
    position: 'absolute',
    top: 46,
    right: 0,
    minWidth: 160,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
  headerDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  headerDropdownText: {
    fontSize: 14,
    color: '#0f172a',
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
  messageSection: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
    padding: 18,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  modalTextArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxBoxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkboxCheck: {
    color: '#fff',
    fontWeight: '700',
  },
  checkboxLabel: {
    color: '#0f172a',
    fontSize: 14,
    flexShrink: 1,
  },
  btnAttachPhoto: {
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  btnAttachPhotoText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '700',
  },
  anomaliaThumbnail: {
    width: '100%',
    height: 180,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
  },
  modalRowButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
  },
  btnGestionEstado: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGestionEstadoText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  btnOpenWaze: {
    backgroundColor: '#33c4ff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  btnOpenWazeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 14,
  },
  messageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  messageButton: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: '47%',
    flexBasis: '47%',
  },
  messageButtonHigh: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  messageButtonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
  messageButtonTextHigh: {
    color: '#991b1b',
  },
  queueSummary: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  queueSummaryText: {
    color: '#475569',
    fontSize: 13,
  },
  queueList: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  queueItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  queueItemLabel: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
  queueItemMeta: {
    marginTop: 4,
    color: '#475569',
    fontSize: 12,
  },
  cameraScreen: { flex: 1, backgroundColor: '#000' },
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalSolidOverlay: {
    backgroundColor: '#ffffff',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    paddingRight: 12,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#475569',
    fontWeight: '700',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalSection: {
    marginBottom: 18,
  },
});
