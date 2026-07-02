import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { getPortalPedidos, getPortalPedidoById } from '@/src/services/portalClienteService';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { LogiTrackLogo } from '@/src/components/auth/LogiTrackLogo';
import { SignOutButton } from '@/src/components/SignOutButton';
import { useAuth } from '@/src/context/AuthContext';
import { useAuthTheme } from '@/src/hooks/use-auth-theme';
import { AuthSpacing } from '@/src/constants/authTheme';

/** Área mínima post-login cliente (portal web es el destino principal). */
export default function ClienteHomeScreen() {
  const { session } = useAuth();
  const { colors } = useAuthTheme();

  const [modalVisible, setModalVisible] = React.useState(false);
  const [selectedRuta, setSelectedRuta] = React.useState(null);
  const [loadingMap, setLoadingMap] = React.useState(false);
  const [mapCoords, setMapCoords] = React.useState(null);
  const [pedidos, setPedidos] = React.useState<any[]>([]);
  const [loadingPedidos, setLoadingPedidos] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('Todos');

  const SIZES: Record<string, number> = {
    'XS': 1, 'S': 4, 'M': 12, 'L': 24, 'XL': 48, 'MAXIMO': 96
  };

  React.useEffect(() => {
    async function loadPedidos() {
      try {
        const res = await getPortalPedidos();
        setPedidos(res.data || []);
      } catch (err) {
        console.warn('Error loading pedidos:', err);
      } finally {
        setLoadingPedidos(false);
      }
    }
    loadPedidos();
  }, []);

  const abrirDetalle = async (item: any) => {
    setSelectedRuta(item);
    setModalVisible(true);
    setLoadingMap(true);
    setMapCoords(null);
    try {
      const detail = await getPortalPedidoById(item.id);
      if (detail && detail.ruta) {
        setSelectedRuta({ ...detail.ruta, bultos: detail.bultos });

        let latOrig = -33.4489, lngOrig = -70.6693;
        let latDest = -33.0245, lngDest = -71.5518;
        
        try {
          const resOrig = await Location.geocodeAsync(detail.ruta.origen || item.origen || '');
          if (resOrig && resOrig.length > 0) {
            latOrig = resOrig[0].latitude;
            lngOrig = resOrig[0].longitude;
          }
          const resDest = await Location.geocodeAsync(detail.ruta.destino || item.destino || '');
          if (resDest && resDest.length > 0) {
            latDest = resDest[0].latitude;
            lngDest = resDest[0].longitude;
          }
        } catch(e) {
          console.warn("Geocoding fallback", e);
        }

        const curve = [];
        for (let i = 0; i <= 10; i++) {
          const t = i / 10;
          curve.push({
            latitude: latOrig + (latDest - latOrig) * t,
            longitude: lngOrig + (lngDest - lngOrig) * t,
          });
        }

        setMapCoords({
          origin: { latitude: latOrig, longitude: lngOrig },
          dest: { latitude: latDest, longitude: lngDest },
          curve
        });
      }
    } catch (err) {
      console.warn('Error fetching details', err);
    } finally {
      setLoadingMap(false);
    }
  };

  const getDisplayState = (p: any) => {
    if (!p) return '—';
    if (p.estado_pago !== 'pagado' && !['ENTREGADO', 'FINALIZADO', 'COMPLETADO'].includes(p.estado)) {
      return 'PENDIENTE DE PAGO';
    }
    return p.estado || '—';
  };

  const obtenerColorEstado = (estado: string) => {
    switch (estado?.toUpperCase()) {
      case 'PENDIENTE DE PAGO': return '#f59e0b';
      case 'PENDIENTE': return '#f59e0b';
      case 'ASIGNADO': return '#3b82f6';
      case 'EN_CURSO': return '#3b82f6';
      case 'ENTREGADO': return '#10b981';
      default: return '#64748b';
    }
  };

  const tabs = ['Todos', 'En Curso', 'Completados'];

  const pedidosFiltrados = pedidos.filter(p => {
    if (activeTab === 'Todos') return true;
    if (activeTab === 'En Curso') return ['ASIGNADO', 'EN_TRANSITO', 'EN_CAMINO_ORIGEN', 'EN_CARGA', 'EN_DESTINO'].includes(p.estado) && p.estado_pago === 'pagado';
    if (activeTab === 'Completados') return ['ENTREGADO', 'FINALIZADO', 'COMPLETADO'].includes(p.estado);
    return true;
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#FAFAFA' }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Portal Clientes</Text>
          <Text style={styles.emailText} numberOfLines={1}>{session?.email}</Text>
        </View>
        <SignOutButton />
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map(tab => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.content}>
        <Text style={[styles.body, { color: '#0F172A', marginBottom: 16, fontWeight: 'bold' }]}>
          Tus pedidos recientes
        </Text>
        
        {loadingPedidos ? (
          <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={pedidosFiltrados}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pedidoCard} onPress={() => abrirDetalle(item)}>
                <View style={styles.pedidoCardHeader}>
                  <Text style={styles.pedidoCardTitle}>{item.nombre_ruta || 'Pedido Sin Nombre'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: obtenerColorEstado(getDisplayState(item)) + '20', borderColor: obtenerColorEstado(getDisplayState(item)) + '50' }]}>
                    <Text style={[styles.statusText, { color: obtenerColorEstado(getDisplayState(item)) }]}>
                      {getDisplayState(item)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.pedidoCardText}><Text style={{ fontWeight: 'bold' }}>Origen:</Text> {item.origen}</Text>
                <Text style={styles.pedidoCardText}><Text style={{ fontWeight: 'bold' }}>Destino:</Text> {item.destino}</Text>
                {item.fecha_estimada_entrega && (
                  <Text style={styles.pedidoCardText}><Text style={{ fontWeight: 'bold' }}>Entrega Est.:</Text> {new Date(item.fecha_estimada_entrega).toLocaleDateString()}</Text>
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.emptyText}>No tienes pedidos registrados en esta categoría.</Text>}
          />
        )}
      </View>

      {/* MODAL DE DETALLE (UX LIQUIDGLASS) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle del Despacho</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {selectedRuta && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Estado General */}
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Estado del Pedido:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: obtenerColorEstado(getDisplayState(selectedRuta)) + '20', borderColor: obtenerColorEstado(getDisplayState(selectedRuta)) + '50' }]}>
                      <Text style={[styles.statusText, { color: obtenerColorEstado(getDisplayState(selectedRuta)) }]}>
                        {getDisplayState(selectedRuta)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.detailSubtext}>Creado el: {selectedRuta.created_at ? new Date(selectedRuta.created_at).toLocaleDateString() : 'Desconocido'}</Text>
                </View>

                {/* Ruta */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeader}>Trayecto</Text>
                  <View style={styles.routePathContainer}>
                    <Ionicons name="pin" size={16} color="#ef4444" />
                    <Text style={styles.routePathText}><Text style={{ fontWeight: 'bold' }}>Origen:</Text> {selectedRuta.origen}</Text>
                  </View>
                  <View style={[styles.routePathContainer, { marginTop: 8 }]}>
                    <Ionicons name="location" size={16} color="#10b981" />
                    <Text style={styles.routePathText}><Text style={{ fontWeight: 'bold' }}>Destino:</Text> {selectedRuta.destino}</Text>
                  </View>
                  <Text style={styles.routePathDistance}>
                    Distancia total: {selectedRuta.distancia_km} Km
                  </Text>
                </View>

                {/* Mapa */}
                <View style={[styles.detailSection, { height: 250, padding: 0, overflow: 'hidden' }]}>
                  {loadingMap ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#38bdf8" />
                      <Text style={{ color: '#94a3b8', marginTop: 8 }}>Cargando mapa...</Text>
                    </View>
                  ) : mapCoords ? (
                    <MapView
                      provider="google"
                      style={{ flex: 1 }}
                      initialRegion={{
                        latitude: (mapCoords.origin.latitude + mapCoords.dest.latitude) / 2,
                        longitude: (mapCoords.origin.longitude + mapCoords.dest.longitude) / 2,
                        latitudeDelta: Math.abs(mapCoords.origin.latitude - mapCoords.dest.latitude) * 2 + 0.5,
                        longitudeDelta: Math.abs(mapCoords.origin.longitude - mapCoords.dest.longitude) * 2 + 0.5,
                      }}
                    >
                      <Marker coordinate={mapCoords.origin} title="Origen" pinColor="#ef4444" />
                      <Marker coordinate={mapCoords.dest} title="Destino" pinColor="#10b981" />

                      <Polyline
                        coordinates={mapCoords.curve}
                        strokeColor="#38bdf8"
                        strokeWidth={4}
                        lineDashPattern={[10, 10]}
                      />

                      {/* Camión animado/estático a la mitad del trayecto */}
                      <Marker coordinate={mapCoords.curve[Math.floor(mapCoords.curve.length / 2)]}>
                        <View style={{ backgroundColor: '#1e293b', padding: 6, borderRadius: 20, borderWidth: 2, borderColor: '#38bdf8' }}>
                          <FontAwesome5 name="truck" size={16} color="#38bdf8" />
                        </View>
                      </Marker>
                    </MapView>
                  ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#94a3b8' }}>Mapa no disponible</Text>
                    </View>
                  )}
                </View>

                {/* Paquetes */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeader}>Detalles del Paquete</Text>
                  {selectedRuta.bultos && selectedRuta.bultos.length > 0 ? (
                    selectedRuta.bultos.map((b: any, idx: number) => {
                      const catUpper = (b.categoria || '').toUpperCase();
                      const slots = SIZES[catUpper] || 0;
                      return (
                        <View key={b.id} style={styles.bultoDetailRow}>
                          <Text style={styles.bultoName}>#{idx + 1} {b.categoria || 'Estándar'}</Text>
                          <Text style={styles.bultoSpecs}>
                            {slots} Slots usados
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noBultosText}>Sin detalle de paquetes registrados.</Text>
                  )}
                </View>


              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  tabsContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A'
  },
  emailText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    maxWidth: 200
  },
  content: {
    flex: 1,
    padding: AuthSpacing.screenPadding,
    gap: 16,
    justifyContent: 'center',
  },
  body: { fontSize: 16, lineHeight: 24 },
  hint: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  pedidoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pedidoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  pedidoCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8
  },
  pedidoCardText: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  closeBtn: {
    padding: 4
  },
  modalScroll: {
    padding: 16
  },
  detailSection: {
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '600'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  detailSubtext: {
    fontSize: 13,
    color: '#64748b'
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12
  },
  routePathContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 16
  },
  routePathText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 8,
    flex: 1
  },
  routePathDistance: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#38bdf8',
    textAlign: 'right'
  },
  bultoDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  bultoName: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600'
  },
  bultoSpecs: {
    fontSize: 13,
    color: '#64748b'
  },
  noBultosText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8
  }
});

