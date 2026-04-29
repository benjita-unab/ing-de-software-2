import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import RegistroViaje from '../../scripts/RegistroViaje';
import { BotonCerrarDespacho } from '../../src/components/BotonCerrarDespacho';
import { bffFetch } from '../../src/services/bffService';

/** Persistencia local del UUID de ruta elegido por el chofer */
const STORAGE_RUTA_ACTIVA_ID = 'logitrack_ruta_activa_id';

const FALLBACK_RUTA_ID =
  process.env.EXPO_PUBLIC_RUTA_ID ??
  Constants.expoConfig?.extra?.rutaId ??
  '36515438-9272-4841-b3e4-c0d3b943b1c7';

type RutaApi = {
  id: string;
  estado?: string | null;
  origen?: string | null;
  destino?: string | null;
};

function esRutaOperativa(estado?: string | null): boolean {
  const e = String(estado ?? '')
    .trim()
    .toUpperCase();
  return e !== 'ENTREGADO' && e !== 'CANCELADO';
}

/** UUID pueden llegar con distinta capitalización desde API vs estado local */
function mismoId(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return (
    String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()
  );
}

/** Etiqueta legible para lista de rutas */
function etiquetaRutaDesdeApi(r: RutaApi): string {
  const o = r.origen?.trim() || '—';
  const d = r.destino?.trim() || '—';
  return `${o} → ${d}`;
}

export default function HomeScreen() {
  const [todoSincronizado, setTodoSincronizado] = useState(false);
  const [rutaActivaId, setRutaActivaId] = useState<string | null>(null);
  const [rutasOperativas, setRutasOperativas] = useState<RutaApi[]>([]);
  const [cargandoRutas, setCargandoRutas] = useState(true);
  const [errorRutas, setErrorRutas] = useState<string | null>(null);

  const cargarRutas = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setCargandoRutas(true);
    setErrorRutas(null);
    try {
      const res = await bffFetch('/api/rutas');
      const raw = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          raw &&
          typeof raw === 'object' &&
          raw !== null &&
          ('message' in raw || 'error' in raw)
            ? String(
                (raw as { message?: string; error?: string }).message ??
                  (raw as { message?: string; error?: string }).error,
              )
            : `Error HTTP ${res.status}`;
        throw new Error(msg || `Error HTTP ${res.status}`);
      }
      const lista: RutaApi[] = Array.isArray(raw) ? raw : [];
      const activas = lista.filter((r) => esRutaOperativa(r.estado));
      setRutasOperativas(activas);

      const persisted = await AsyncStorage.getItem(STORAGE_RUTA_ACTIVA_ID);
      const persistedTrim = persisted?.trim() ?? '';

      /** Fuente única fuera del montaje inicial: AsyncStorage / selección manual */
      if (persistedTrim) {
        const encontrada = activas.find((r) => mismoId(r.id, persistedTrim));
        const usarId = encontrada ? encontrada.id : persistedTrim;
        setRutaActivaId(usarId);
        if (encontrada && usarId !== persistedTrim) {
          await AsyncStorage.setItem(STORAGE_RUTA_ACTIVA_ID, usarId);
        }
        return;
      }

      if (activas.length === 0) {
        console.log('SET AUTO:', FALLBACK_RUTA_ID);
        setRutaActivaId(FALLBACK_RUTA_ID);
        return;
      }

      if (activas.length > 1) {
        console.log('SET AUTO: elegir ruta (lista visible, sin id hasta tap)');
        setRutaActivaId(null);
        return;
      }

      const primera = activas[0].id;
      console.log('SET AUTO:', primera);
      setRutaActivaId(primera);
      await AsyncStorage.setItem(STORAGE_RUTA_ACTIVA_ID, primera);
    } catch (e: unknown) {
      const mensaje =
        e instanceof Error ? e.message : 'No se pudieron cargar las rutas';
      setErrorRutas(mensaje);
      try {
        const persisted = await AsyncStorage.getItem(STORAGE_RUTA_ACTIVA_ID);
        const pt = persisted?.trim();
        if (pt) {
          setRutaActivaId(pt);
        } else {
          console.log('SET AUTO:', FALLBACK_RUTA_ID);
          setRutaActivaId(FALLBACK_RUTA_ID);
        }
      } catch {
        console.log('SET AUTO:', FALLBACK_RUTA_ID);
        setRutaActivaId(FALLBACK_RUTA_ID);
      }
    } finally {
      if (!silent) setCargandoRutas(false);
    }
  }, []);

  useEffect(() => {
    void cargarRutas();
    // Solo montaje inicial; cargarRutas no debe depender de rutaActivaId ni reejecutarse al seleccionar
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, []);

  const seleccionarRuta = useCallback(async (rutaId: string) => {
    const trimmed = String(rutaId).trim();
    console.log('SET MANUAL:', trimmed);
    setRutaActivaId(trimmed);
    await AsyncStorage.setItem(STORAGE_RUTA_ACTIVA_ID, trimmed);
  }, []);

  const cambiarRuta = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_RUTA_ACTIVA_ID);
    setTodoSincronizado(false);
    setRutaActivaId(null);
  }, []);

  /** Curry estable: una función por id, sin arrow inline en cada Pressable */
  const handleSeleccionRuta = useCallback(
    (id: string) => () => {
      console.log('CLICK REAL:', id);
      void seleccionarRuta(id);
    },
    [seleccionarRuta],
  );

  const rutasMemo = useMemo(() => rutasOperativas, [rutasOperativas]);

  /** Referencia estable por fila → no recrea el callback en cada render del map */
  const onPressPorRutaId = useMemo(() => {
    const m = new Map<string, () => void>();
    for (const r of rutasMemo) {
      const id = String(r.id);
      m.set(id, handleSeleccionRuta(id));
    }
    return m;
  }, [rutasMemo, handleSeleccionRuta]);

  async function alFinalizarDespachoExitoso() {
    await AsyncStorage.removeItem(STORAGE_RUTA_ACTIVA_ID);
    setTodoSincronizado(false);
    await cargarRutas({ silent: true });
  }

  if (cargandoRutas) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.hint}>Cargando rutas…</Text>
      </View>
    );
  }

  const debeElegirRuta =
    rutasMemo.length > 1 && rutaActivaId === null;

  if (debeElegirRuta) {
    return (
      <View style={styles.screenRoot} collapsable={false}>
        {errorRutas ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Rutas: {errorRutas} (usando última ruta guardada o valor por defecto)
            </Text>
          </View>
        ) : null}
        <View style={styles.selectorStrip} collapsable={false}>
          <Text style={styles.selectorTitle}>Ruta activa — elige una para continuar</Text>
          {rutasMemo.map((ruta) => {
            const idStr = String(ruta.id);
            return (
              <Pressable
                key={idStr}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
                onPress={onPressPorRutaId.get(idStr)!}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar ruta ${etiquetaRutaDesdeApi(ruta)}`}
                android_ripple={{ color: '#bbdefb' }}
              >
                <Text style={styles.selectorMain}>{etiquetaRutaDesdeApi(ruta)}</Text>
                <Text style={styles.selectorMeta}>{ruta.estado ?? ''}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  if (!rutaActivaId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>Sin ruta para trabajar.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenRoot} collapsable={false}>
      {errorRutas ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Rutas: {errorRutas} (usando última ruta guardada o valor por defecto)
          </Text>
        </View>
      ) : null}

      {rutasMemo.length > 1 ? (
        <View style={styles.cambiarRutaBar}>
          <Pressable
            style={({ pressed }) => [
              styles.btnCambiarRuta,
              pressed && styles.cardPressed,
            ]}
            onPress={() => void cambiarRuta()}
            accessibilityRole="button"
            accessibilityLabel="Cambiar de ruta"
          >
            <Text style={styles.btnCambiarRutaText}>Cambiar ruta</Text>
          </Pressable>
        </View>
      ) : rutasMemo.length === 1 ? (
        <View style={styles.selectorSingle}>
          <Text style={styles.selectorSingleText}>
            Ruta: {etiquetaRutaDesdeApi(rutasMemo[0])}
          </Text>
        </View>
      ) : (
        <View style={styles.selectorSingle}>
          <Text style={styles.selectorSingleText}>
            Sin rutas activas en servidor — usando EXPO_PUBLIC_RUTA_ID / valor por defecto
          </Text>
        </View>
      )}

      <View style={styles.mainContent} collapsable={false}>
        {rutaActivaId ? (
          <>
            <RegistroViaje
              key={rutaActivaId}
              onSyncComplete={setTodoSincronizado}
              rutaId={rutaActivaId}
            />
            {todoSincronizado && (
              <BotonCerrarDespacho
                rutaId={rutaActivaId}
                onDespachoFinalizado={alFinalizarDespachoExitoso}
              />
            )}
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    flexDirection: 'column',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  hint: { marginTop: 12, color: '#64748b' },
  banner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 12,
    elevation: Platform.OS === 'android' ? 12 : 0,
  },
  bannerText: { color: '#92400e', fontSize: 13 },
  /** Por encima del ScrollView de RegistroViaje para que el toque no lo robe */
  selectorStrip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    zIndex: 10,
    elevation: Platform.OS === 'android' ? 10 : 0,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0f172a',
  },
  card: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  cardSelected: {
    borderColor: '#1976d2',
    borderWidth: 2,
    backgroundColor: '#e3f2fd',
  },
  cardPressed: {
    opacity: 0.92,
  },
  selectorMain: { fontSize: 15, color: '#0f172a' },
  selectorMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  /** flexShrink + minHeight evitan que el hijo flex:1 tape el selector */
  mainContent: {
    flex: 1,
    minHeight: 0,
  },
  selectorSingle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  selectorSingleText: { fontSize: 13, color: '#334155' },
  cambiarRutaBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e8f4fc',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#bfdbfe',
  },
  btnCambiarRuta: {
    alignSelf: 'flex-start',
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnCambiarRutaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
