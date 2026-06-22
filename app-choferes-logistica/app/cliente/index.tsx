import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogiTrackLogo } from '@/src/components/auth/LogiTrackLogo';
import { SignOutButton } from '@/src/components/SignOutButton';
import { useAuth } from '@/src/context/AuthContext';
import { useAuthTheme } from '@/src/hooks/use-auth-theme';
import { AuthSpacing } from '@/src/constants/authTheme';

/** Área mínima post-login cliente (portal web es el destino principal). */
export default function ClienteHomeScreen() {
  const { session } = useAuth();
  const { colors } = useAuthTheme();

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
        <LogiTrackLogo portalTitle="Portal Cliente" />
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Sesión iniciada como {session?.email ?? 'cliente'}.
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          El seguimiento completo de pedidos está disponible en el portal web LogiTrack.
        </Text>
        <SignOutButton />
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
    padding: AuthSpacing.screenPadding,
    gap: 16,
    justifyContent: 'center',
  },
  body: { fontSize: 16, lineHeight: 24 },
  hint: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
});
