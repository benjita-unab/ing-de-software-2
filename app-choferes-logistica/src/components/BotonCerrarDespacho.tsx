import { useState, useRef } from "react";
import { TouchableOpacity, Text, Alert, StyleSheet, View, ActivityIndicator, Dimensions } from "react-native";
import { cerrarDespachoYEnviarComprobante, enviarQRPrevio, guardarFirmaEnSupabase } from "../services/cierreDespachoService";
import { CameraView, useCameraPermissions } from "expo-camera";
import SignatureScreen from "react-native-signature-canvas";

export type BotonCerrarDespachoProps = {
  rutaId: string;
  className?: string;
  etiquetaListo?: string;
};

export function BotonCerrarDespacho({
  rutaId,
  etiquetaListo = "Cerrar despacho y enviar",
}: BotonCerrarDespachoProps) {
  const [cargando, setCargando] = useState(false);
  const [estadoFlujo, setEstadoFlujo] = useState<"inicio" | "escanearQR" | "firmar" | "hecho">("inicio");
  const [estadoTexto, setEstadoTexto] = useState("");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const signatureRef = useRef<any>(null);

  async function manejarEnviarQR(): Promise<void> {
    if (cargando) return;
    setCargando(true);
    setEstadoTexto("Enviando QR...");
    try {
      const resultado = await enviarQRPrevio(rutaId);
      Alert.alert(
        "Éxito",
        `Código QR enviado correctamente al cliente (${resultado.emailEnviadoA}).`
      );
      
      // Pedir permisos de cámara si no hay
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      setEstadoFlujo("escanearQR");
      
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Ocurrió un error inesperado al enviar QR.";
      Alert.alert("Error", mensaje);
    } finally {
      setCargando(false);
      setEstadoTexto("");
    }
  }

  function onQrScanned(result: any) {
    if (estadoFlujo !== "escanearQR") return;
    
    // Validar que el QR contenga datos esperados (JSON o al menos caracteres y no cualquier cosa del ambiente)
    if (!result.data || result.data.length < 10) return;

    // Solo para prevenir multiples escaneos en rafaga
    setEstadoFlujo("firmar");
    Alert.alert("QR Escaneado", "QR de cliente validado. Por favor, proceda con la firma.");
  }

  async function manejarFirmaOK(firmaBase64: string) {
    if (cargando) return;
    setCargando(true);
    setEstadoTexto("Guardando firma y generando PDF...");
    
    try {
      // 1. Guardar la firma en la DB/Storage
      await guardarFirmaEnSupabase(rutaId, firmaBase64);
      
      // 2. Generar el PDF y enviar correo
      const resultado = await cerrarDespachoYEnviarComprobante(rutaId);
      
      Alert.alert(
        "Despacho Finalizado",
        `La guía de despacho PDF (con firma) se generó y envió exitosamente a ${resultado.emailEnviadoA}. La entrega quedó validada.`
      );
      setEstadoFlujo("hecho");
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "Ocurrió un error inesperado.";
      Alert.alert("Error", mensaje);
    } finally {
      setCargando(false);
      setEstadoTexto("");
    }
  }

  const handleSignatureEmpty = () => {
    Alert.alert("Error", "Por favor dibuje su firma antes de guardar.");
  };

  const handleClearSignature = () => {
    signatureRef.current?.clearSignature();
  };

  const handleSaveSignature = () => {
    signatureRef.current?.readSignature();
  };

  if (estadoFlujo === "escanearQR") {
    if (!cameraPermission?.granted) {
      return (
        <View style={styles.container}>
          <Text>Se requiere permiso de cámara para escanear el QR.</Text>
          <TouchableOpacity style={styles.boton} onPress={requestCameraPermission}>
            <Text style={styles.texto}>Otorgar Permiso</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.container, { height: 400 }]}>
        <Text style={styles.instruccionTexto}>Busque y escanee el QR del cliente...</Text>
        <View style={{ flex: 1, borderRadius: 12, overflow: "hidden", marginBottom: 60 }}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={onQrScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
        </View>
        <TouchableOpacity 
          style={[styles.boton, { position: 'absolute', bottom: 0, alignSelf:'center', width: '80%' }]} 
          onPress={() => setEstadoFlujo("inicio")}>
          <Text style={styles.texto}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (estadoFlujo === "firmar") {
    return (
      <View style={[styles.container, { height: 500, paddingBottom: 20 }]}>
        <Text style={styles.instruccionTexto}>Firma del receptor (Cliente)</Text>
        {cargando ? (
          <View style={{flex: 1, justifyContent:'center', alignItems:'center'}}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={{marginTop: 10}}>{estadoTexto}</Text>
          </View>
        ) : (
          <>
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, overflow: 'hidden', marginHorizontal: 5, backgroundColor: "#fff" }}>
              <SignatureScreen
                ref={signatureRef}
                onOK={manejarFirmaOK}
                onEmpty={handleSignatureEmpty}
                webStyle={`
                  .m-signature-pad { 
                    box-shadow: none; 
                    border: none; 
                  }
                  .m-signature-pad--footer {
                    display: none;
                    margin: 0px;
                  }
                  body, html {
                    width: 100%; height: 100%; margin: 0; padding: 0;
                  }
                `}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 5, marginTop: 15 }}>
              <TouchableOpacity style={[styles.boton, { flex: 1, marginRight: 5, backgroundColor: "#d32f2f", paddingVertical: 10 }]} onPress={handleClearSignature}>
                <Text style={[styles.texto, { fontSize: 14 }]}>Limpiar Pizarra</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.boton, { flex: 1, marginLeft: 5, backgroundColor: "#2e7d32", paddingVertical: 10 }]} onPress={handleSaveSignature}>
                <Text style={[styles.texto, { fontSize: 14 }]}>Guardar Firma</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.boton, { marginTop: 10, alignSelf:'center', width: '90%', backgroundColor: '#9e9e9e', paddingVertical: 10 }]} 
              onPress={() => setEstadoFlujo("escanearQR")}>
              <Text style={styles.texto}>Volver al escáner QR</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {estadoFlujo === "inicio" && (
        <TouchableOpacity
          onPress={manejarEnviarQR}
          disabled={cargando || !String(rutaId).trim()}
          style={[styles.boton, styles.botonQR, cargando && styles.botonDeshabilitado]}
        >
          {cargando ? (
            <Text style={styles.texto}>{estadoTexto || "Cargando..."}</Text>
          ) : (
            <Text style={styles.texto}>1. Enviar Código QR a Cliente</Text>
          )}
        </TouchableOpacity>
      )}

      {estadoFlujo === "hecho" && (
        <View style={styles.successContainer}>
          <Text style={styles.successTexto}>¡Entrega completada exitosamente!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 15,
    paddingHorizontal: 10,
  },
  instruccionTexto: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  successContainer: {
    backgroundColor: "#e8f5e9",
    padding: 15,
    borderRadius: 8,
    alignItems: "center"
  },
  successTexto: {
    color: "#2e7d32",
    fontWeight: "bold",
    fontSize: 16,
  },
  boton: {
    backgroundColor: "#ff6600",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 6,
  },
  botonQR: {
    backgroundColor: "#1565c0",
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  texto: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
