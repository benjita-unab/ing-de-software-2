import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LogiTrackLogo } from '@/src/components/auth/LogiTrackLogo';
import { SignOutButton } from '@/src/components/SignOutButton';
import { useAuth } from '@/src/context/AuthContext';
import { useAuthTheme } from '@/src/hooks/use-auth-theme';
import { AuthSpacing } from '@/src/constants/authTheme';
import { getPortalPedidos, PortalPedidoListItem } from '@/src/services/portalClienteService';
import { Ionicons } from '@expo/vector-icons';

export default function ClienteHomeScreen() {
  const { session } = useAuth();
  const { colors } = useAuthTheme();
  const router = useRouter();

  const [pedidos, setPedidos] = useState<PortalPedidoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPortalPedidos();
      setPedidos(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const isCompletado = (estado: string | null) => {
    return String(estado || '').trim().toUpperCase() === 'ENTREGADO';
  };

  const renderItem = ({ item }: { item: PortalPedidoListItem }) => {
    const entregado = isCompletado(item.estado);
    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: '#f8fafc' }]}
        onPress={() => router.push(`/cliente/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.routeText, { color: '#0f172a' }]}>
            {item.origen || '—'} a {item.destino || '—'}
          </Text>
          <View style={[styles.badge, entregado ? styles.badgeSuccess : styles.badgeInfo]}>
            <Text style={[styles.badgeText, entregado ? styles.badgeTextSuccess : styles.badgeTextInfo]}>
              {item.estado || '—'}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.detailText, { color: '#475569' }]}>
          ETA: {item.fecha_estimada_entrega ? new Date(item.fecha_estimada_entrega).toLocaleDateString('es-CL') : '—'}
        </Text>
        <Text style={[styles.detailText, { color: '#64748b' }]}>
          Bultos: {item.bultos_despachados ?? '—'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <LogiTrackLogo portalTitle="Portal Cliente" />
        
        <View style={styles.headerInfo}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Sesión iniciada como {session?.email ?? 'cliente'}.
            </Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Tus pedidos y seguimiento de despachos:
            </Text>
          </View>
        </View>

        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : error ? (
            <View style={styles.center}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={loadPedidos}>
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : pedidos.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No tienes pedidos</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Tus despachos asignados aparecerán aquí.</Text>
            </View>
          ) : (
            <FlatList
              data={pedidos}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.flatlistContent}
              refreshing={loading}
              onRefresh={loadPedidos}
            />
          )}
        </View>

        <View style={styles.footer}>
          <SignOutButton />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flex: 1,
    paddingTop: AuthSpacing.screenPadding,
  },
  headerInfo: {
    paddingHorizontal: AuthSpacing.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  body: { fontSize: 16, lineHeight: 24 },
  hint: { fontSize: 14, lineHeight: 22, marginTop: 4 },
  listContainer: { flex: 1 },
  flatlistContent: { paddingHorizontal: AuthSpacing.screenPadding, paddingBottom: 40 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeInfo: { backgroundColor: '#e0f2fe' },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  badgeTextSuccess: { color: '#166534' },
  badgeTextInfo: { color: '#0369a1' },
  detailText: { fontSize: 14, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loader: { flex: 1, justifyContent: 'center' },
  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySub: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  footer: { padding: 16, alignItems: 'center', justifyContent: 'center' },
});
