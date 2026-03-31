import React, { useEffect, useRef, useState } from 'react';
import { Alert, ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import SignatureScreen from 'react-native-signature-canvas';
import { supabase } from '../lib/supabaseClient'; 
// (Asegúrate de que la ruta coincida con donde está tu archivo de Supabase)

type ScannerYFirmaMovilProps = {
  pasoPrevioCompletado: boolean;
};

const ScannerYFirmaMovil: React.FC<ScannerYFirmaMovilProps> = ({ pasoPrevioCompletado }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isCanvasVisible, setIsCanvasVisible] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const signatureRef = useRef<any>(null);
  const [rutaIdEscaneada, setRutaIdEscaneada] = useState<string | null>(null);
  const [mostrarCamara, setMostrarCamara] = useState(false);

  const getFibonacciWaitTime = (retryCount: number): number => {
    // retryCount 1 => 1s, 2 => 2s, 3 => 3s, 4 => 5s, ...
    if (retryCount <= 1) return 1;
    let a = 1;
    let b = 1;
    for (let i = 2; i <= retryCount; i++) {
      const next = a + b;
      a = b;
      b = next;
    }
    return b;
  };

  const syncFirmaConBackoff = async (signatureData: string, rutaId: string) => {
    const maxRetries = 7;
    let retry = 0;

    while (true) {
      try {
        const { error } = await supabase
          .from('entregas')
          // según esquema actual, no hay columna `estado`; usamos `firma_url` y `validado`
          .update({
            firma_url: signatureData,
            validado: true,
            fecha_entrega_real: new Date().toISOString(),
          })
          .eq('ruta_id', rutaId);

        if (error) {
          throw new Error(error.message);
        }

        return;
      } catch (err) {
        retry += 1;
        if (retry > maxRetries) {
          throw err;
        }

        const waitSeconds = getFibonacciWaitTime(retry);
        console.warn(`Supabase upload failed, reintentando en ${waitSeconds} segundos (intento ${retry}/${maxRetries})`, err);

        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
      }
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    // AQUÍ GUARDAMOS LO QUE DICE EL QR (que debería ser el ruta_id)
    console.log('[ScannerYFirmaMovil] QR detectado con los datos:', data);
    setRutaIdEscaneada(data);

    // automáticamente transitar a la pizarra de firma
    setMostrarCamara(false);
    setIsCanvasVisible(true);
  };

const handleSignatureOK = async (signatureData: string) => {
    if (!rutaIdEscaneada) {
      Alert.alert('Error', 'No se detectó un ID válido en el QR.');
      return;
    }

    try {
      console.log('Subiendo firma a Supabase para la ruta:', rutaIdEscaneada);
      await syncFirmaConBackoff(signatureData, rutaIdEscaneada);
      Alert.alert('¡Éxito!', 'Firma guardada en la base de datos central.');

      // Reiniciar estado para permitir nuevo ciclo si se requiere
      setScanned(false);
      setRutaIdEscaneada(null);
      setIsCanvasVisible(false);

    } catch (error) {
      console.error('Error al subir a Supabase tras reintentos:', error);
      Alert.alert('Error', 'No se pudo guardar la firma en el servidor después de varios intentos.');
    }
  };

  const handleSignatureEmpty = () => {
    console.log('[ScannerYFirmaMovil] canvas vacío');
    setSignature(null);
  };

  const handleClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
    }
    setSignature(null);
  };

  const handleGuardarFirma = () => {
    // 1. Le damos la orden directa al lienzo de que lea el dibujo actual
    if (signatureRef.current) {
      signatureRef.current.readSignature(); 
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.statusText}>Solicitando permiso de cámara...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Permiso de cámara denegado. No se puede escanear QR.</Text>
      </View>
    );
  }

  if (!pasoPrevioCompletado) {
    // HU-72 solo se activa tras completar paso 4.
    return null;
  }

  return (
    <View style={styles.container}>
      
      {/* 1. EL ESTADO DE REPOSO: Botón para activar tu tarea */}
      {!mostrarCamara && !scanned && !isCanvasVisible && (
        <View style={styles.standbyContainer}>
          <Button 
            title="Escanear QR del Cliente" 
            onPress={() => setMostrarCamara(true)} 
            color="#28a745" 
          />
        </View>
      )}

      {/* 2. LA CÁMARA: Solo se muestra si presionaron el botón */}
      {mostrarCamara && !scanned && (
        <View style={styles.cameraContainer}>
          <Text style={styles.title}>Escanea el QR para continuar</Text>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
          />
          {/* Un botón por si el chofer se arrepiente y quiere volver atrás */}
          <View style={{ marginTop: 10 }}>
            <Button title="Cancelar Escáner" onPress={() => setMostrarCamara(false)} color="#dc3545" />
          </View>
        </View>
      )}

      {scanned && !isCanvasVisible && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.statusText}>Validando QR ...</Text>
        </View>
      )}

      {isCanvasVisible && (
        <View style={styles.signatureContainer}>
          <Text style={styles.title}>Firma digital</Text>
          <View style={styles.signatureWrapper}>
            {signature ? <Text style={styles.statusText}>Firma lista para subir</Text> : null}
            <SignatureScreen
              ref={signatureRef}
              onOK={handleSignatureOK}
              onEmpty={handleSignatureEmpty}
              descriptionText="Dibuja tu firma abajo"
              clearText="Limpiar"
              confirmText="Finalizar"
              webStyle={`.m-signature-pad {box-shadow: none; border: 1px solid #CCC; border-radius: 8px;}.m-signature-pad--body {border: none;};`}
              autoClear={false}
            />
          </View>

          <View style={styles.actions}>
            <View style={styles.buttonWrapper}>
              <Button title="Limpiar" onPress={handleClear} color="#ff8c00" />
            </View>
            <View style={styles.buttonWrapper}>
              <Button title="Guardar Firma" onPress={handleGuardarFirma} color="#1e90ff" />
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    marginTop: 12,
  },
  cameraContainer: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
  },
  signatureContainer: {
    flex: 1,
    width: '100%',
    marginTop: 8,
  },
  signatureWrapper: {
    flex: 1,
    minHeight: 300,
    borderColor: '#bbb',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusText: {
    marginTop: 8,
    fontSize: 15,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 15,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  standbyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScannerYFirmaMovil;
