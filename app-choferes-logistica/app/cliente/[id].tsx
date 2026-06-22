import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthTheme } from '@/src/hooks/use-auth-theme';
import { AuthSpacing } from '@/src/constants/authTheme';
import { getPortalPedidoById, PortalPedidoDetalleResponse } from '@/src/services/portalClienteService';
import { Ionicons } from '@expo/vector-icons';

export default function PedidoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, scheme } = useAuthTheme();

  const [detalle, setDetalle] = useState<PortalPedidoDetalleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDetalle();
  }, [id]);

  const loadDetalle = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!id) throw new Error('ID no válido');
      const res = await getPortalPedidoById(id);
      setDetalle(res);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el detalle');
    } finally {
      setLoading(false);
    }
  };

  const isCompletado = (estado: string | null) => {
    return String(estado || '').trim().toUpperCase() === 'ENTREGADO';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.center} />
      </SafeAreaView>
    );
  }

  if (error || !detalle) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error || 'No se encontró el pedido'}</Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <Text style={styles.btnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { ruta, historial_estados, entregas, incidencias, mensajes } = detalle;
  const entregado = isCompletado(ruta.estado);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Seguimiento</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Card Principal */}
        <View style={[styles.card, { backgroundColor: scheme === 'dark' ? '#334155' : colors.surface }]}>
          <View style={styles.row}>
            <Text style={[styles.subtitle, { color: colors.textPrimary }]}>
              {ruta.origen || '—'} a {ruta.destino || '—'}
            </Text>
            <View style={[styles.badge, entregado ? styles.badgeSuccess : styles.badgeInfo]}>
              <Text style={[styles.badgeText, entregado ? styles.badgeTextSuccess : styles.badgeTextInfo]}>
                {ruta.estado || '—'}
              </Text>
            </View>
          </View>
          <Text style={[styles.textBody, { color: colors.textSecondary }]}>
            <Ionicons name="time-outline" size={14} /> ETA: {ruta.fecha_estimada_entrega ? new Date(ruta.fecha_estimada_entrega).toLocaleString('es-CL') : '—'}
          </Text>
          <Text style={[styles.textBody, { color: colors.textSecondary }]}>
            <Ionicons name="cube-outline" size={14} /> Bultos despachados: {ruta.bultos_despachados ?? '—'}
          </Text>
        </View>

        {/* Mensajes Relevantes */}
        {mensajes && mensajes.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Mensajes del Conductor</Text>
            {mensajes.map((m) => (
              <View key={m.id} style={[styles.alertCard, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                <Ionicons name="warning" size={20} color="#d97706" style={styles.alertIcon} />
                <View style={styles.alertContent}>
                  <Text style={{ fontWeight: 'bold', color: '#92400e' }}>{m.tipo} - {m.prioridad}</Text>
                  <Text style={{ color: '#b45309' }}>{m.mensaje}</Text>
                  <Text style={{ color: '#d97706', fontSize: 12 }}>
                    {m.timestamp_evento ? new Date(m.timestamp_evento).toLocaleTimeString('es-CL') : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Incidencias */}
        {incidencias && incidencias.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Incidencias Reportadas</Text>
            {incidencias.map((i) => (
              <View key={i.id} style={[styles.alertCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                <Ionicons name="alert-circle" size={20} color="#dc2626" style={styles.alertIcon} />
                <View style={styles.alertContent}>
                  <Text style={{ fontWeight: 'bold', color: '#991b1b' }}>{i.tipo_incidencia}</Text>
                  <Text style={{ color: '#b91c1c' }}>{i.descripcion}</Text>
                  <Text style={{ color: '#dc2626', fontSize: 12 }}>Estado: {i.estado}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Línea de tiempo */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Historial de Estados</Text>
          {(!historial_estados || historial_estados.length === 0) ? (
            <Text style={[styles.textBody, { color: colors.textMuted }]}>No hay historial registrado.</Text>
          ) : (
            historial_estados.map((h, idx) => (
              <View key={h.id || idx} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineLine} />
                <View style={styles.timelineContent}>
                  <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>{h.estado}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {h.created_at ? new Date(h.created_at).toLocaleString('es-CL') : '—'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Entregas */}
        {entregas && entregas.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Detalle de Entrega</Text>
            {entregas.map((e) => (
              <View key={e.id} style={[styles.card, { backgroundColor: scheme === 'dark' ? '#334155' : colors.surface, marginBottom: 8 }]}>
                <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>Estado: {e.estado}</Text>
                <Text style={{ color: colors.textSecondary }}>Bultos recibidos: {e.bultos_recepcionados ?? '—'}</Text>
                <Text style={{ color: colors.textSecondary }}>
                  Fecha: {e.fecha_entrega_real ? new Date(e.fecha_entrega_real).toLocaleString('es-CL') : '—'}
                </Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AuthSpacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold' },
  scrollContent: { padding: AuthSpacing.screenPadding, paddingBottom: 40 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  subtitle: { fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 8 },
  textBody: { fontSize: 14, marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeInfo: { backgroundColor: '#e0f2fe' },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  badgeTextSuccess: { color: '#166534' },
  badgeTextInfo: { color: '#0369a1' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', opacity: 0.8 },
  alertCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  alertIcon: { marginRight: 8, marginTop: 2 },
  alertContent: { flex: 1 },
  timelineItem: { flexDirection: 'row', marginBottom: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#0ea5e9', marginTop: 4, zIndex: 2 },
  timelineLine: { position: 'absolute', left: 5, top: 16, bottom: -16, width: 2, backgroundColor: '#e2e8f0', zIndex: 1 },
  timelineContent: { flex: 1, paddingLeft: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  btn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
