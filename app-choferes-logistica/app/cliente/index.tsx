import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useAuth } from '@/src/context/AuthContext';
import { useAuthTheme } from '@/src/hooks/use-auth-theme';
import { AuthSpacing } from '@/src/constants/authTheme';
import { SignOutButton } from '@/src/components/SignOutButton';
import { obtenerRutasCliente, suscribirseARutasCliente } from '@/src/services/realtimeService';

interface Bulto {
  id: string;
  tamaño: string;
  cuadrados_equivalentes: number;
  tarifa_calculada_clp: number;
}

interface Ruta {
  id: string;
  origen: string;
  destino: string;
  estado: string;
  distancia_km: number;
  tarifa_base_total: number;
  costo_combustible_calculado: number;
  costo_tac_peajes_clp: number;
  pago_conductor_base_clp: number;
  total_pagar: number;
  is_tarifa_manual: boolean;
  created_at: string;
  bultos?: Bulto[];
}

export default function ClienteHomeScreen() {
  const { session } = useAuth();
  const { colors } = useAuthTheme();
  
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRuta, setSelectedRuta] = useState<Ruta | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ origin: any, dest: any, curve: any[] } | null>(null);
  const [loadingMap, setLoadingMap] = useState(false);

  // Generar puntos para la curva de Bézier ("media luna")
  const getBezierPoints = (o: any, d: any) => {
    const points = [];
    // Punto de control perpendicular a la línea recta
    const controlPoint = {
      latitude: (o.latitude + d.latitude) / 2 + (d.longitude - o.longitude) * 0.2,
      longitude: (o.longitude + d.longitude) / 2 - (d.latitude - o.latitude) * 0.2,
    };
    for (let t = 0; t <= 1; t += 0.05) {
      const lat = (1 - t) * (1 - t) * o.latitude + 2 * (1 - t) * t * controlPoint.latitude + t * t * d.latitude;
      const lng = (1 - t) * (1 - t) * o.longitude + 2 * (1 - t) * t * controlPoint.longitude + t * t * d.longitude;
      points.push({ latitude: lat, longitude: lng });
    }
    return points;
  };

  useEffect(() => {
    const loadMapData = async (origenStr: string, destStr: string) => {
      setLoadingMap(true);
      try {
        const originGeocode = await Location.geocodeAsync(origenStr);
        const destGeocode = await Location.geocodeAsync(destStr);
        
        if (originGeocode.length > 0 && destGeocode.length > 0) {
          const o = { latitude: originGeocode[0].latitude, longitude: originGeocode[0].longitude };
          const d = { latitude: destGeocode[0].latitude, longitude: destGeocode[0].longitude };
          
          const curve = getBezierPoints(o, d);
          setMapCoords({ origin: o, dest: d, curve });
        }
      } catch (err) {
        console.log('Error geocoding', err);
      }
      setLoadingMap(false);
    };

    if (selectedRuta && modalVisible) {
      loadMapData(selectedRuta.origen, selectedRuta.destino);
    } else {
      setMapCoords(null);
    }
  }, [selectedRuta, modalVisible]);

  const clienteId = session?.clienteId;

  // Cargar rutas del cliente
  const cargarRutas = useCallback(async () => {
    if (!clienteId) return;
    const res = await obtenerRutasCliente(clienteId);
    if (res.ok && res.data) {
      setRutas(res.data);
    }
    setLoading(false);
  }, [clienteId]);

  // Escucha de Supabase Realtime
  useEffect(() => {
    if (!clienteId) return;

    cargarRutas();

    // Suscribirse a cambios en tiempo real
    const desuscribir = suscribirseARutasCliente(clienteId, (payload) => {
      console.log("Evento recibido en mobile client:", payload.eventType);
      // Recargar la lista completa para traer bultos y campos calculados actualizados
      cargarRutas();
    });

    return () => {
      desuscribir();
    };
  }, [clienteId, cargarRutas]);

  const obtenerColorEstado = (estado: string) => {
    switch (estado) {
      case 'ENTREGADO': return '#10b981'; // Verde
      case 'CANCELADO': return '#ef4444'; // Rojo
      case 'PENDIENTE': return '#fbbf24'; // Amarillo
      default: return '#0ea5e9'; // Azul
    }
  };

  const formatearCLP = (valor: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(valor || 0);
  };

  const renderRutaCard = ({ item }: { item: Ruta }) => {
    const totalCuadrados = item.bultos?.reduce((acc, b) => acc + Number(b.cuadrados_equivalentes || 0), 0) || 0;
    
    return (
      <TouchableOpacity
        style={[styles.card, { borderColor: 'rgba(255, 255, 255, 0.08)' }]}
        onPress={() => {
          setSelectedRuta(item);
          setModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.routeIconWrapper}>
            <Ionicons name="navigate-circle" size={20} color="#38bdf8" />
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.destino.split(',')[0]}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: obtenerColorEstado(item.estado) + '20', borderColor: obtenerColorEstado(item.estado) + '50' }]}>
            <Text style={[styles.statusText, { color: obtenerColorEstado(item.estado) }]}>
              {item.estado}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.routeDetail}>Desde: {item.origen.split(',')[0]}</Text>
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardMetaText}>
              <Ionicons name="resize" size={12} color="#94a3b8" /> {totalCuadrados.toFixed(2)} / 6.00 bloques
            </Text>
            <Text style={styles.cardMetaText}>
              <Ionicons name="speedometer" size={12} color="#94a3b8" /> {item.distancia_km || 0} Km
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.priceLabel}>Total a Pagar:</Text>
          <Text style={styles.priceValue}>{formatearCLP(Number(item.costo_servicio) > 0 ? item.costo_servicio : item.total_pagar)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#0a0e1a' }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Portal Clientes</Text>
          <Text style={styles.emailText} numberOfLines={1}>{session?.email}</Text>
        </View>
        <SignOutButton />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Mis Pedidos Activos</Text>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText}>Cargando tus envíos...</Text>
          </View>
        ) : rutas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={60} color="rgba(255, 255, 255, 0.15)" />
            <Text style={styles.emptyTitle}>No tienes pedidos activos</Text>
            <Text style={styles.emptySubtitle}>
              Las entregas creadas en el panel de control aparecerán aquí automáticamente en tiempo real.
            </Text>
          </View>
        ) : (
          <FlatList
            data={rutas}
            keyExtractor={(item) => item.id}
            renderItem={renderRutaCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
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
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedRuta && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Estado General */}
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Estado del Pedido:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: obtenerColorEstado(selectedRuta.estado) + '20', borderColor: obtenerColorEstado(selectedRuta.estado) + '50' }]}>
                      <Text style={[styles.statusText, { color: obtenerColorEstado(selectedRuta.estado) }]}>
                        {selectedRuta.estado}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.detailSubtext}>Creado el: {new Date(selectedRuta.created_at).toLocaleDateString()}</Text>
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

                {/* Bultos */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeader}>Detalle de Carga</Text>
                  {selectedRuta.bultos && selectedRuta.bultos.length > 0 ? (
                    selectedRuta.bultos.map((b, idx) => (
                      <View key={b.id} style={styles.bultoDetailRow}>
                        <Text style={styles.bultoName}>Bulto #{idx + 1} ({b.tamaño})</Text>
                        <Text style={styles.bultoSpecs}>
                          {Number(b.cuadrados_equivalentes || 0).toFixed(2)} Bloques
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noBultosText}>Sin detalle de bultos registrados.</Text>
                  )}
                </View>

                {/* Desglose de Pago */}
                <View style={[styles.detailSection, { borderBottomWidth: 0 }]}>
                  <Text style={styles.sectionHeader}>Desglose Financiero</Text>
                  <View style={styles.paymentRow}>
                    <Text style={[styles.paymentLabel, { color: '#f8fafc', fontWeight: 'bold' }]}>Total a Pagar</Text>
                    <Text style={[styles.paymentVal, { color: '#38bdf8', fontWeight: 'bold', fontSize: 18 }]}>{formatearCLP(Number(selectedRuta.costo_servicio) > 0 ? selectedRuta.costo_servicio : selectedRuta.total_pagar)}</Text>
                  </View>
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
    borderBottomColor: 'rgba(255, 255, 255, 0.06)'
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#38bdf8'
  },
  emailText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    maxWidth: 200
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 16,
    textAlign: 'left'
  },
  listContainer: {
    paddingBottom: 20
  },
  card: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  routeIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
    flex: 1,
    textAlign: 'left'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  cardBody: {
    marginBottom: 12,
    textAlign: 'left'
  },
  routeDetail: {
    fontSize: 13,
    color: '#cbd5e1',
    textAlign: 'left'
  },
  cardMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8
  },
  cardMetaText: {
    fontSize: 11,
    color: '#94a3b8'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10
  },
  priceLabel: {
    fontSize: 12,
    color: '#64748b'
  },
  priceValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#38bdf8'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14
  },
  emptyContainer: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 16,
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    maxHeight: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#38bdf8'
  },
  closeBtn: {
    padding: 4
  },
  modalScroll: {
    marginBottom: 20
  },
  detailSection: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 14
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailLabel: {
    fontSize: 14,
    color: '#94a3b8'
  },
  detailSubtext: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'left'
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#cbd5e1',
    marginBottom: 10,
    textAlign: 'left'
  },
  routePathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  routePathText: {
    fontSize: 13,
    color: '#f8fafc',
    flex: 1,
    textAlign: 'left'
  },
  routePathDistance: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'left'
  },
  bultoDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  bultoName: {
    fontSize: 13,
    color: '#f8fafc'
  },
  bultoSpecs: {
    fontSize: 13,
    color: '#94a3b8'
  },
  noBultosText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'left'
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  paymentLabel: {
    fontSize: 13,
    color: '#cbd5e1'
  },
  paymentVal: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '500'
  }
});
