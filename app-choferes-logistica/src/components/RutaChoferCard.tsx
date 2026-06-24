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

const RouteCardColors = {
  light: {
    cardBg: '#FFFFFF',
    cardBorder: '#E2E8F0',
    text: '#0F172A',
    textSecondary: '#64748B',
    routeText: '#1E293B',
    arrow: '#3182CE',
    meta: '#475569',
    estadoBg: '#EFF6FF',
    estadoText: '#1D4ED8',
    divider: '#E5E7EB',
  },
  dark: {
    cardBg: '#151B2B',
    cardBorder: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    routeText: '#E2E8F0',
    arrow: '#93C5FD',
    meta: '#CBD5E1',
    estadoBg: '#1E3A5F',
    estadoText: '#93C5FD',
    divider: '#334155',
  },
} as const;

type RutaChoferCardProps = {
  ruta: RutaListItem;
} & Pick<PressableProps, 'onPress' | 'accessibilityLabel'>;

/**
 * Card de ruta para el selector del chofer (HU-26 #231).
 *
 * Render:
 *   Cliente: {nombre}     (si clientes.nombre)
 *   Origen → flecha → Destino
 *   Bultos / Distancia / Entrega estimada (solo si hay valor)
 *   Estado: {estado}
 */
export function RutaChoferCard({
  ruta,
  onPress,
  accessibilityLabel,
}: RutaChoferCardProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = RouteCardColors[scheme];

  const cliente = getClienteNombre(ruta);
  const origen = ruta.origen?.trim() || '—';
  const destino = ruta.destino?.trim() || '—';
  const bultos = tieneBultos(ruta.bultos_despachados)
    ? String(ruta.bultos_despachados)
    : null;
  const distancia = formatDistanciaKm(ruta.distancia_km);
  const fechaEntrega = formatFechaEstimadaEntrega(ruta.fecha_estimada_entrega);
  const estado = ruta.estado?.trim() || null;

  const metaParts: string[] = [];
  if (bultos != null) metaParts.push(`Bultos/Slots: ${bultos}`);
  if (distancia) metaParts.push(`Distancia: ${distancia}`);
  if (fechaEntrega) metaParts.push(`Entrega estimada: ${fechaEntrega}`);

  if (ruta.tarifa_base_total != null && Number(ruta.tarifa_base_total) > 0) {
    const formattedBase = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(ruta.tarifa_base_total));
    const formattedEspera = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(ruta.costo_espera_total || 0));
    const cobroFinal = Number(ruta.costo_servicio) > 0 ? Number(ruta.costo_servicio) : Number(ruta.total_pagar || ruta.tarifa_base_total);
    const formattedTotal = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(cobroFinal);
    
    metaParts.push(`Tarifa Base: ${formattedBase}`);
    if (Number(ruta.costo_espera_total) > 0) {
      metaParts.push(`Costo Espera: ${formattedEspera}`);
    }
    metaParts.push(`Total a Pagar: ${formattedTotal}`);
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: c.cardBg,
          borderColor: c.cardBorder,
        },
        pressed && styles.pressed,
      ]}
      android_ripple={{ color: scheme === 'light' ? '#BBDEFB' : '#334155' }}
    >
      {cliente ? (
        <Text style={[styles.clienteLabel, { color: c.textSecondary }]}>
          Cliente:{' '}
          <Text style={[styles.clienteNombre, { color: c.text }]}>{cliente}</Text>
        </Text>
      ) : null}

      <View style={styles.routeBlock}>
        <Text style={[styles.routeLine, { color: c.routeText }]} numberOfLines={2}>
          {origen}
        </Text>
        <Text style={[styles.arrow, { color: c.arrow }]}>↓</Text>
        <Text style={[styles.routeLine, { color: c.routeText }]} numberOfLines={2}>
          {destino}
        </Text>
      </View>

      {metaParts.length > 0 ? (
        <View style={[styles.metaBlock, { borderTopColor: c.divider }]}>
          {metaParts.map((line) => (
            <Text key={line} style={[styles.metaLine, { color: c.meta }]}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {estado ? (
        <View style={[styles.estadoRow, { backgroundColor: c.estadoBg }]}>
          <Text style={[styles.estadoLabel, { color: c.estadoText }]}>
            Estado: {estado.toUpperCase()}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  pressed: { opacity: 0.92 },
  clienteLabel: { fontSize: 13, fontWeight: '500' },
  clienteNombre: { fontSize: 15, fontWeight: '700' },
  routeBlock: { gap: 4, paddingVertical: 2 },
  routeLine: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  arrow: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    paddingVertical: 2,
    textAlign: 'center',
  },
  metaBlock: {
    gap: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaLine: { fontSize: 14, lineHeight: 20 },
  estadoRow: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 2,
  },
  estadoLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
});
