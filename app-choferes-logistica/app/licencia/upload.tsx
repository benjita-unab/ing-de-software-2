import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';

// A mock date picker. In a real app, use @react-native-community/datetimepicker
// or similar. For simplicity here, we'll hardcode or just ask for string.
import { TextInput } from 'react-native-gesture-handler';

export default function UploadLicenseScreen() {
  const { licenseStatus, session, refreshLicenseStatus, signOut } = useAuth();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');

  const pickAndUpload = async () => {
    if (!expiryDate || expiryDate.length !== 10) {
      Alert.alert('Error', 'Ingresa una fecha de vencimiento válida (YYYY-MM-DD)');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];

      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);
      formData.append('expiryDate', expiryDate);

      const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || '';
      
      const response = await fetch(`${baseUrl}/api/conductores/upload-license`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Error al subir la licencia');
      }

      Alert.alert('Éxito', 'Licencia subida correctamente. Espera a que un operador la revise.');
      await refreshLicenseStatus();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (licenseStatus?.status === 'PENDING') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Licencia en Revisión</Text>
        <Text style={styles.text}>
          Tu licencia ha sido recibida y está pendiente de validación por un operador.
          Te notificaremos cuando puedas acceder a la plataforma.
        </Text>
        <TouchableOpacity style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Validación de Licencia</Text>
      <Text style={styles.text}>
        Para continuar utilizando la aplicación, debes subir tu licencia de conducir vigente.
      </Text>
      
      {licenseStatus?.status === 'REJECTED' && (
        <Text style={[styles.text, { color: 'red' }]}>
          Tu licencia anterior fue rechazada. Por favor, sube una nueva.
        </Text>
      )}

      <Text style={styles.label}>Fecha de Vencimiento (YYYY-MM-DD):</Text>
      <TextInput
        style={styles.input}
        value={expiryDate}
        onChangeText={setExpiryDate}
        placeholder="Ej: 2028-12-31"
        maxLength={10}
      />

      <TouchableOpacity 
        style={[styles.button, isUploading && styles.buttonDisabled]} 
        onPress={pickAndUpload}
        disabled={isUploading}
      >
        <Text style={styles.buttonText}>
          {isUploading ? 'Subiendo...' : 'Seleccionar Documento'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: '#64748b', marginTop: 10 }]} onPress={signOut}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#0f172a',
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  label: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
