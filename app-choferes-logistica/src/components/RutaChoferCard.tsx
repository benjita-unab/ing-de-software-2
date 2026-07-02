import React from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';
import { useColorScheme } from 'react-native';
import {
  formatDistanciaKm,
  formatFechaEstimadaEntrega,
  getClienteNombre,
  tieneBultos,
  type RutaListItem,
} from '@/src/utils/rutaCardFormat';
import { Ionicons } from '@expo/vector-icons';

const PastelPalette = [
  { bg: '#E4F1EE', text: '#1B4D3E', meta: '#5A7D71' }, // Light Green
  { bg: '#FDF0E1', text: '#805B10', meta: '#9B7B3E' }, // Light Yellow/Orange
  { bg: '#EAEBFA', text: '#2C346B', meta: '#5F658E' }, // Light Purple/Blue
];

function getPastelColor(str: string = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PastelPalette[Math.abs(hash) % PastelPalette.length];
}

const RouteCardColors = {
  light: {
    cardBg: '#FFFFFF',
    text: '#0F172A',
    estadoBg: '#F1F5F9',
    meta: '#64748B',
  },
  dark: {
    cardBg: '#1E293B',
    text: '#F8FAFC',
    estadoBg: '#334155',
    meta: '#94A3B8',
  },
} as const;

type RutaChoferCardProps = {
  ruta: RutaListItem;
  isActive?: boolean;
  isUnpaid?: boolean;
} & Pick<PressableProps, 'onPress' | 'accessibilityLabel'>;

export function RutaChoferCard({
  ruta,
  isActive,
  isUnpaid,
  onPress,
  accessibilityLabel,
}: RutaChoferCardProps) {
  const scheme = 'light';
  const c = RouteCardColors[scheme];
  const isDark = false;

  const cliente = getClienteNombre(ruta) || 'Sin Cliente';
  const origen = ruta.origen?.trim() || '—';
  const destino = ruta.destino?.trim() || '—';
  const nombreRuta = ruta.nombre_ruta?.trim();
  const bultos = tieneBultos(ruta.bultos_despachados) ? String(ruta.bultos_despachados) : null;
  const distancia = formatDistanciaKm(ruta.distancia_km);
  const estado = ruta.estado?.trim() || null;

  // En modo oscuro usamos los colores del tema, en claro los pasteles
  let pastel = isDark ? { bg: c.cardBg, text: c.text, meta: c.meta } : getPastelColor(ruta.id || cliente);

  if (!isActive) {
    pastel = isDark 
      ? { bg: '#334155', text: '#94A3B8', meta: '#64748B' }
      : { bg: '#F1F5F9', text: '#475569', meta: '#94A3B8' };
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pastel.bg },
        isActive && { borderWidth: 2, borderColor: '#10b981' },
        isUnpaid && { opacity: 0.65 },
        pressed && styles.pressed,
      ]}>
      
      <View style={styles.cardContent}>
        <View style={styles.mainInfo}>
          <View style={styles.headerRow}>
            <Text style={[styles.clienteText, { color: pastel.text }]} numberOfLines={1}>
              {cliente}
            </Text>
            <Text style={{ color: pastel.meta, fontSize: 16, fontWeight: '900', letterSpacing: 2 }}>···</Text>
          </View>
          
          <Text style={[styles.routeSubtitle, { color: pastel.meta }]} numberOfLines={1}>
            {estado || (nombreRuta ? nombreRuta : `${origen} → ${destino}`)}
          </Text>

          <View style={styles.statsRow}>
            {distancia && (
              <View style={[styles.statBadge, { backgroundColor: isDark ? '#ffffff20' : '#ffffffB3' }]}>
                <Ionicons name="arrow-redo-outline" size={14} color={pastel.meta} style={{ marginRight: 4 }} />
                <Text style={[styles.statText, { color: pastel.meta }]}>{distancia}</Text>
              </View>
            )}
            {bultos && (
              <View style={[styles.statBadge, { backgroundColor: isDark ? '#ffffff20' : '#ffffffB3' }]}>
                <Ionicons name="cube-outline" size={14} color={pastel.meta} style={{ marginRight: 4 }} />
                <Text style={[styles.statText, { color: pastel.meta }]}>{bultos} bultos</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    marginBottom: 14,
    padding: 20,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clienteText: {
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  routeSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
