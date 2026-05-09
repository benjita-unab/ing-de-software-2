import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encolarTiempoInspeccion, syncTiemposInspeccion } from '../services/syncEngine';

type Props = {
  rutaId: string;
};

const getStorageKeyLlegada = (rId: string) => `tiempos_llegada_${rId}`;
const getStorageKeyAprobada = (rId: string) => `tiempos_aprobada_${rId}`;

export function TiemposInspeccionBotones({ rutaId }: Props) {
  const [llegadaTimestamp, setLlegadaTimestamp] = useState<string | null>(null);
  const [aprobadaTimestamp, setAprobadaTimestamp] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Load initial states
    const cargarTiempos = async () => {
      try {
        const lleg = await AsyncStorage.getItem(getStorageKeyLlegada(rutaId));
        const aprob = await AsyncStorage.getItem(getStorageKeyAprobada(rutaId));
        if (lleg) setLlegadaTimestamp(lleg);
        if (aprob) setAprobadaTimestamp(aprob);
      } catch (e) {
        console.error('Error cargando tiempos guardados', e);
      } finally {
        setCargando(false);
      }
    };
    cargarTiempos();
  }, [rutaId]);

  // Attempt sync on component mount or button press
  useEffect(() => {
    syncTiemposInspeccion();
  }, []);

  const handleLlegada = async () => {
    try {
      const now = new Date().toISOString();
      await AsyncStorage.setItem(getStorageKeyLlegada(rutaId), now);
      setLlegadaTimestamp(now);
      await encolarTiempoInspeccion({
        id: `llegada_${Date.now()}`,
        rutaId,
        hora_llegada_destino: now,
      });
      syncTiemposInspeccion();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la llegada');
    }
  };

  const handleAprobada = async () => {
    try {
      const now = new Date().toISOString();
      await AsyncStorage.setItem(getStorageKeyAprobada(rutaId), now);
      setAprobadaTimestamp(now);
      await encolarTiempoInspeccion({
        id: `aprobada_${Date.now()}`,
        rutaId,
        hora_inspeccion_aprobada: now,
      });
      syncTiemposInspeccion();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la aprobación');
    }
  };

  if (cargando) {
    return <ActivityIndicator size="small" color="#0000ff" />;
  }

  // If both pressed, show nothing or just a small check text
  if (llegadaTimestamp && aprobadaTimestamp) {
    return (
      <View style={styles.container}>
        <Text style={styles.textSuccess}>Tiempos de inspección registrados ✓</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!llegadaTimestamp && (
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, styles.btnLlegada]}
          onPress={handleLlegada}
        >
          <Text style={styles.btnText}>📍 Llegada a Destino</Text>
        </Pressable>
      )}

      {llegadaTimestamp && !aprobadaTimestamp && (
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, styles.btnAprobada]}
          onPress={handleAprobada}
        >
          <Text style={styles.btnText}>✅ Inspección Aprobada / Inicio Descarga</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  btn: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  btnLlegada: {
    backgroundColor: '#0284c7', // Slate-blue
  },
  btnAprobada: {
    backgroundColor: '#16a34a', // Green
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  textSuccess: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
  }
});
