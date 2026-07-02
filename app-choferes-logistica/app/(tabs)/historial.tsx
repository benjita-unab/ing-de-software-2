import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChoferSessionBar } from '../../src/components/ChoferSessionBar';
import { bffFetch } from '../../src/services/bffService';
import { type RutaListItem } from '../../src/utils/rutaCardFormat';
import { formatDistanciaKm } from '../../src/utils/rutaCardFormat';

function esRutaCompletada(estado: string | null | undefined): boolean {
  const e = String(estado ?? '').trim().toUpperCase().replace(/\s+/g, '_');
  const excluidos = new Set(['ENTREGADO', 'FINALIZADO', 'COMPLETADO']);
  return excluidos.has(e);
}

export default function HistorialScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  const [rutasHistorial, setRutasHistorial] = useState<RutaListItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarHistorial = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await bffFetch('/api/rutas');
      const raw = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(raw?.message || raw?.error || `Error HTTP ${res.status}`);
      }

      const lista: RutaListItem[] = Array.isArray(raw)
        ? raw
        : raw && typeof raw === 'object' && Array.isArray((raw as any).data)
        ? (raw as any).data
        : [];

      // Filtrar solo las terminadas
      const terminadas = lista.filter((r) => esRutaCompletada(r.estado));
      setRutasHistorial(terminadas);
    } catch (e: unknown) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo cargar el historial';
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarHistorial();
  }, [cargarHistorial]);

  // Cálculo de ingresos del mes actual
  const ingresosMes = rutasHistorial.reduce((total, ruta) => {
    // Si la ruta no tiene fecha, usamos hoy o simplemente la sumamos
    // Pero asumiendo que "Historial" es lo que ya entregó, 
    // lo ideal sería checar la fecha de entrega, pero 'created_at' no está en RutaListItem.
    // Como simplificación temporal sumaremos todas las del historial o las que tengan pago:
    const pago = Number(ruta.pago_conductor_base_clp) || 0;
    return total + pago;
  }, 0);

  if (cargando) {
    return (
      <View style={styles.screenRoot}>
        <ChoferSessionBar onRefresh={() => void cargarHistorial()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.hint}>Cargando historial…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <ChoferSessionBar onRefresh={() => void cargarHistorial()} />
      
      {/* Dashboard Mini */}
      <View style={[styles.dashboardCard, { backgroundColor: '#FFFFFF' }]}>
        <Text style={[styles.dashboardTitle, { color: '#64748b' }]}>Ingresos Totales Acumulados</Text>
        <Text style={[styles.dashboardValue, { color: '#059669' }]}>
          ${ingresosMes.toLocaleString('es-CL')}
        </Text>
      </View>

      {error ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Error: {error}</Text>
        </View>
      ) : null}

      <ScrollView
        style={[styles.scrollArea, { backgroundColor: '#FAFAFA' }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90, paddingHorizontal: 24, paddingTop: 16 }}
      >
        <Text style={[styles.sectionTitle, { color: '#0F172A' }]}>
          Rutas Completadas ({rutasHistorial.length})
        </Text>

        {rutasHistorial.length === 0 ? (
          <Text style={styles.hint}>Aún no tienes rutas completadas en tu historial.</Text>
        ) : (
          rutasHistorial.map((ruta) => (
            <View key={ruta.id} style={[styles.rutaCard, { backgroundColor: '#FFFFFF' }]}>
              <View style={styles.rutaHeader}>
                <Text style={[styles.rutaId, { color: '#1e293b' }]} numberOfLines={1}>
                  {ruta.origen?.split(',')[0]} ➔ {ruta.destino?.split(',')[0]}
                </Text>
                <Text style={[styles.badge, { backgroundColor: '#10b981' }]}>
                  {ruta.estado}
                </Text>
              </View>
              
              <View style={styles.rutaDetalle}>
                <Text style={[styles.detalleTexto, { color: '#475569' }]}>
                  📦 Bultos/Slots: {ruta.bultos_despachados || 0}
                </Text>
                <Text style={[styles.detalleTexto, { color: '#475569' }]}>
                  📏 Distancia: {formatDistanciaKm(ruta.distancia_km) || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.footerCard}>
                <Text style={[styles.gananciaTexto, { color: '#64748b' }]}>Tu Ganancia:</Text>
                <Text style={[styles.gananciaValor, { color: '#059669' }]}>
                  ${Number(ruta.pago_conductor_base_clp || 0).toLocaleString('es-CL')}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, flexDirection: 'column', backgroundColor: '#FAFAFA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#FAFAFA' },
  hint: { marginTop: 12, color: '#64748b', textAlign: 'center' },
  banner: { backgroundColor: '#fef3c7', padding: 12, zIndex: 12 },
  bannerText: { color: '#92400e', fontSize: 13, textAlign: 'center' },
  dashboardCard: {
    margin: 24,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  dashboardTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  dashboardValue: { fontSize: 36, fontWeight: '900' },
  scrollArea: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  rutaCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rutaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rutaId: { fontSize: 16, fontWeight: '800', flex: 1, marginRight: 8 },
  badge: { color: '#fff', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  rutaDetalle: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detalleTexto: { fontSize: 14, fontWeight: '500' },
  footerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16 },
  gananciaTexto: { fontSize: 14, fontWeight: '600' },
  gananciaValor: { fontSize: 18, fontWeight: '800' }
});
