import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RegistroViajeLinear from '../../scripts/RegistroViajeLinear';
import { BotonCerrarDespacho } from '../../src/components/BotonCerrarDespacho';
import {
  ChoferSessionBar,
  STORAGE_RUTA_ACTIVA_ID,
} from '../../src/components/ChoferSessionBar';
import { bffFetch } from '../../src/services/bffService';
import { RutaChoferCard } from '../../src/components/RutaChoferCard';
import {
  etiquetaRutaAccesibilidad,
  type RutaListItem,
} from '../../src/utils/rutaCardFormat';

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
function etiquetaRutaDesdeApi(r: RutaListItem): string {
  if (r.nombre_ruta) {
    return r.nombre_ruta;
  }
  const o = r.origen?.trim() || '—';
  const d = r.destino?.trim() || '—';
  return `${o} → ${d}`;
}

/** Solo rutas en las que el chofer puede operar (excluye entregadas/canceladas/finalizadas). */
function esRutaOperativa(estado: string | null | undefined): boolean {
  const e = String(estado ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  const excluidos = new Set(['ENTREGADO', 'CANCELADO', 'FINALIZADO', 'COMPLETADO', 'PAGO_ATRASO_PENDIENTE']);
  return !excluidos.has(e);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [todoSincronizado, setTodoSincronizado] = useState(false);
  const [rutaActivaId, setRutaActivaId] = useState<string | null>(null);
  const [rutasOperativas, setRutasOperativas] = useState<RutaListItem[]>([]);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [cargandoRutas, setCargandoRutas] = useState(true);
  const [errorRutas, setErrorRutas] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const cargarRutas = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setCargandoRutas(true);
    setErrorRutas(null);
    try {
      const res = await bffFetch('/api/rutas');
      const raw = await res.json().catch(() => null);
      
      console.log("RESPUESTA RUTAS:", raw);
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
      const lista: RutaListItem[] = Array.isArray(raw)
        ? raw
        : raw && typeof raw === 'object' && Array.isArray((raw as any).data)
        ? (raw as any).data
        : [];
      const operativas = lista.filter((r) => esRutaOperativa(r.estado));
      setRutasOperativas(operativas);

      const persisted = await AsyncStorage.getItem(STORAGE_RUTA_ACTIVA_ID);
      const persistedTrim = persisted?.trim() ?? '';

      if (persistedTrim) {
        const encontrada = operativas.find((r) => mismoId(r.id, persistedTrim));
        if (encontrada) {
          console.log('USANDO RUTA GUARDADA');
          setRutaActivaId(encontrada.id);
          if (encontrada.id !== persistedTrim) {
            await AsyncStorage.setItem(STORAGE_RUTA_ACTIVA_ID, encontrada.id);
          }
          return;
        }
        await AsyncStorage.removeItem(STORAGE_RUTA_ACTIVA_ID);
      }

      if (operativas.length === 0) {
        setRutaActivaId(null);
        return;
      }

      if (operativas.length > 1) {
        console.log('MOSTRANDO SELECTOR DE RUTAS');
        setRutaActivaId(null);
        return;
      }

      const solo = operativas[0].id;
      console.log('SET AUTO SOLO UNA RUTA');
      setRutaActivaId(solo);
      await AsyncStorage.setItem(STORAGE_RUTA_ACTIVA_ID, solo);
    } catch (e: unknown) {
      const mensaje =
        e instanceof Error ? e.message : 'No se pudieron cargar las rutas';
      setErrorRutas(mensaje);
      setRutaActivaId(null);
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
    console.log('MOSTRANDO SELECTOR DE RUTAS');
  }, []);

  const handleSeleccionRuta = useCallback(
    (id: string) => () => {
      console.log('CLICK REAL:', id);
      const ruta = rutasOperativas.find(r => String(r.id) === id);
      if (ruta?.estado_pago !== 'pagado') {
        Alert.alert('Pago Pendiente', 'El cliente aún no ha pagado esta ruta. No puedes iniciarla.');
        return;
      }
      Alert.alert(
        'Comenzar Ruta',
        '¿Desea comenzar esta ruta?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sí, comenzar', onPress: () => void seleccionarRuta(id) }
        ]
      );
    },
    [seleccionarRuta, rutasOperativas],
  );

  const rutasMemo = useMemo(() => rutasOperativas, [rutasOperativas]);
  const rutaActiva = rutaActivaId
    ? rutasMemo.find((ruta) => mismoId(ruta.id, rutaActivaId))
    : undefined;

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
      <View style={styles.screenRoot}>
        <ChoferSessionBar onRefresh={() => void cargarRutas()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.hint}>Cargando rutas…</Text>
        </View>
      </View>
    );
  }

  const debeElegirRuta =
    rutasMemo.length > 1 && rutaActivaId === null;

  if (debeElegirRuta) {
    const selectorPadBottom = insets.bottom + 96;
    return (
      <View style={styles.screenRoot} collapsable={false}>
        <ChoferSessionBar onRefresh={() => void cargarRutas()} />
        {errorRutas ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Rutas: {errorRutas} (usando última ruta guardada o valor por defecto)
            </Text>
          </View>
        ) : null}
        <ScrollView
          style={[
            styles.selectorScroll,
            { backgroundColor: isDark ? '#0A0E1A' : '#F8FAFC' },
          ]}
          contentContainerStyle={[
            styles.selectorScrollContent,
            {
              paddingTop: 8,
              paddingBottom: selectorPadBottom,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          <View
            style={[
              styles.selectorStripInner,
              { backgroundColor: isDark ? '#0A0E1A' : '#F8FAFC' },
            ]}
            collapsable={false}
          >
            {(() => {
              const pagadas = rutasMemo.filter(r => r.estado_pago === 'pagado');
              const noPagadas = rutasMemo.filter(r => r.estado_pago !== 'pagado');

              return (
                <>
                  {pagadas.length > 0 && (
                    <>
                      <Text style={[styles.selectorTitle, { color: isDark ? '#F8FAFC' : '#0F172A', marginTop: 8 }]}>
                        Rutas listas para iniciar (Pagadas)
                      </Text>
                      {pagadas.map((ruta) => {
                        const idStr = String(ruta.id);
                        return (
                          <RutaChoferCard
                            key={idStr}
                            ruta={ruta}
                            onPress={onPressPorRutaId.get(idStr)!}
                            accessibilityLabel={`Seleccionar ${etiquetaRutaAccesibilidad(ruta)}`}
                          />
                        );
                      })}
                    </>
                  )}

                  {noPagadas.length > 0 && (
                    <>
                      <Text style={[styles.selectorTitle, { color: isDark ? '#94A3B8' : '#64748B', marginTop: 24 }]}>
                        Rutas pendientes de pago
                      </Text>
                      {noPagadas.map((ruta) => {
                        const idStr = String(ruta.id);
                        return (
                          <View key={idStr} style={{ opacity: 0.65 }}>
                            <RutaChoferCard
                              ruta={ruta}
                              onPress={onPressPorRutaId.get(idStr)!}
                              accessibilityLabel={`Seleccionar ${etiquetaRutaAccesibilidad(ruta)}`}
                            />
                          </View>
                        );
                      })}
                    </>
                  )}
                </>
              );
            })()}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!rutaActivaId) {
    return (
      <View style={styles.screenRoot}>
        <ChoferSessionBar onRefresh={() => void cargarRutas()} />
        <View style={styles.centered}>
          <Text style={styles.hint}>Sin ruta para trabajar.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenRoot} collapsable={false}>
      <ChoferSessionBar onRefresh={() => void cargarRutas()} />
      {errorRutas ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Rutas: {errorRutas} (usando última ruta guardada o valor por defecto)
          </Text>
        </View>
      ) : null}

      <View style={styles.selectorSingle}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.selectorSingleText}>
            Ruta Activa: {rutaActiva ? etiquetaRutaDesdeApi(rutaActiva) : '—'}
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
            onPress={async () => {
              if (rutaActivaId) {
                try {
                  setTodoSincronizado(false);
                  const res = await bffFetch(`/api/rutas/${rutaActivaId}/reset`, { method: 'POST' });
                  if (!res.ok) {
                    const raw = await res.json().catch(() => ({}));
                    throw new Error(raw.message || `Error HTTP ${res.status}`);
                  }
                  await cargarRutas();
                  setResetKey(prev => prev + 1);
                  Alert.alert('Éxito', 'Ruta reseteada correctamente para pruebas.');
                } catch (e: any) {
                  Alert.alert('Error', e.message || 'No se pudo resetear la ruta.');
                  console.error("Error al resetear la ruta", e);
                }
              }
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Reset (Dev)</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.mainContent} collapsable={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {rutaActivaId ? (
          <>
            <RegistroViajeLinear
              key={`${rutaActivaId}-${rutaActiva?.estado || 'init'}-${resetKey}`}
              onSyncComplete={setTodoSincronizado}
              rutaId={rutaActivaId}
              destino={rutaActiva?.destino}
              estadoPago={rutaActiva?.estado_pago}
              estadoRuta={rutaActiva?.estado}
              horaLlegadaDestino={rutaActiva?.hora_llegada_destino}
            />
            {todoSincronizado && (
              <>
                <BotonCerrarDespacho
                  rutaId={rutaActivaId}
                  bultosDespachadosOriginal={rutaActiva?.bultos_despachados ?? null}
                  onDespachoFinalizado={alFinalizarDespachoExitoso}
                />
              </>
            )}
          </>
        ) : null}
      </ScrollView>
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
  selectorScroll: {
    flex: 1,
    minHeight: 0,
  },
  selectorScrollContent: {
    flexGrow: 1,
  },
  /** Contenido del selector dentro del ScrollView */
  selectorStripInner: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  selectorTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardPressed: {
    opacity: 0.92,
  },
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
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f4fc',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#bfdbfe',
    zIndex: 50,
    elevation: Platform.OS === 'android' ? 50 : 0,
  },
  btnCambiarRuta: {
    alignSelf: 'center',
    backgroundColor: '#1976d2',
    paddingVertical: 14,
    paddingHorizontal: 22,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 10,
  },
  btnCambiarRutaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
