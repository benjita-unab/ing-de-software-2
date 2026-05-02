import { useState, useRef, useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import {
  cerrarDespachoYEnviarComprobante,
  enviarQRPrevio,
  guardarFirmaEnSupabase,
} from "../services/cierreDespachoService";
import { CameraView, useCameraPermissions } from "expo-camera";
import SignatureScreen from "react-native-signature-canvas";

export type BotonCerrarDespachoProps = {
  rutaId: string;
  className?: string;
  etiquetaListo?: string;
  /** Tras cerrar despacho OK en backend (firma + PDF + correo). Limpieza de ruta activa en el padre. */
  onDespachoFinalizado?: () => void | Promise<void>;
};

type EstadoFlujo = "inicio" | "escanearQR" | "firmar" | "hecho";

const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Intenta extraer el ruta_id desde el payload del QR.
 *
 * Formatos soportados:
 *   - JSON con cualquiera de: ruta_id, rutaId, id, entrega_id, entregaId, routeId
 *   - Texto plano que sea un UUID (o cualquier string corto: lo tratamos como rutaId)
 *
 * La comparación final contra la rutaId actual la hace `onQrScanned`,
 * acá solo extraemos candidatos.
 */
function parsearPayloadQR(raw: string): {
  rutaId: string | null;
  codigoOtp: string | null;
} {
  if (!raw) return { rutaId: null, codigoOtp: null };

  const limpio = raw.trim();

  try {
    const parsed = JSON.parse(limpio);
    const candidatos = [
      parsed?.ruta_id,
      parsed?.rutaId,
      parsed?.routeId,
      parsed?.id,
      parsed?.entrega_id,
      parsed?.entregaId,
    ];

    let rutaIdEnQR: string | null = null;
    for (const c of candidatos) {
      if (typeof c === "string" && c.trim()) {
        rutaIdEnQR = c.trim();
        break;
      }
    }

    const codigoOtp =
      typeof parsed?.codigo_otp === "string" && parsed.codigo_otp.trim()
        ? parsed.codigo_otp.trim()
        : typeof parsed?.codigoOtp === "string" && parsed.codigoOtp.trim()
          ? parsed.codigoOtp.trim()
          : null;

    return { rutaId: rutaIdEnQR, codigoOtp };
  } catch {
    // Texto plano. Si parece UUID, lo extraemos; si no, devolvemos
    // el string crudo y dejamos que la comparación contra rutaId actual
    // decida si es válido.
    const match = limpio.match(UUID_REGEX);
    return {
      rutaId: match ? match[0] : limpio || null,
      codigoOtp: null,
    };
  }
}

export function BotonCerrarDespacho({
  rutaId,
  etiquetaListo: _etiquetaListo = "Cerrar despacho y enviar",
  onDespachoFinalizado,
}: BotonCerrarDespachoProps) {
  const [cargando, setCargando] = useState(false);
  const [estadoFlujo, setEstadoFlujo] = useState<EstadoFlujo>("inicio");
  const [estadoTexto, setEstadoTexto] = useState("");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const signatureRef = useRef<any>(null);

  // Guard contra doble lectura del mismo QR (CameraView dispara
  // onBarcodeScanned en cada frame mientras el código siga visible).
  const scannedRef = useRef<boolean>(false);

  // Bloquea múltiples Alert.alert mientras hay uno abierto. Sin esto,
  // si el QR queda visible en cámara, cada frame dispara un Alert nuevo
  // y se apilan en el sistema.
  const alertOpenRef = useRef<boolean>(false);

  // Watchdog: si una operación bloqueante (envío de QR, firma + cierre
  // de despacho) deja el spinner colgado, este timer fuerza el reset
  // para que el usuario nunca quede atrapado en "loading infinito".
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function arrancarWatchdogLoading(ms: number = 15000) {
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn(`Watchdog: cargando seguía true tras ${ms}ms; forzando reset`);
      setCargando(false);
      setEstadoTexto("");
      loadingTimeoutRef.current = null;
    }, ms);
  }

  function cancelarWatchdogLoading() {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    return () => cancelarWatchdogLoading();
  }, []);

  /**
   * Helper único para alertas. Garantiza que solo haya un Alert a la vez
   * y que `scannedRef` se reactive (si corresponde) cuando el usuario
   * presiona OK. Acepta una bandera `resetScanned` para que las alertas
   * de éxito (donde sí queremos avanzar) no reabran el scanner.
   */
  function mostrarAlerta(
    titulo: string,
    mensaje: string,
    resetScanned: boolean = true,
  ) {
    if (alertOpenRef.current) return;
    alertOpenRef.current = true;
    Alert.alert(
      titulo,
      mensaje,
      [
        {
          text: "OK",
          onPress: () => {
            alertOpenRef.current = false;
            if (resetScanned) scannedRef.current = false;
          },
        },
      ],
      { cancelable: false },
    );
  }

  async function manejarEnviarQR(): Promise<void> {
    if (cargando) return;
    setCargando(true);
    setEstadoTexto("Enviando QR...");
    arrancarWatchdogLoading(20000);
    try {
      const resultado = await enviarQRPrevio(rutaId);
      Alert.alert(
        "Éxito",
        `Código QR enviado correctamente al cliente (${resultado.emailEnviadoA}).`,
      );

      if (!cameraPermission?.granted) {
        const permiso = await requestCameraPermission();
        if (!permiso?.granted) {
          Alert.alert(
            "Permiso requerido",
            "Necesitamos acceso a la cámara para escanear el QR del cliente.",
          );
          return;
        }
      }

      scannedRef.current = false;
      alertOpenRef.current = false;
      setEstadoFlujo("escanearQR");
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "Ocurrió un error inesperado al enviar QR.";
      Alert.alert("Error", mensaje);
    } finally {
      cancelarWatchdogLoading();
      setCargando(false);
      setEstadoTexto("");
    }
  }

  function onQrScanned(result: { data?: string }) {
    if (estadoFlujo !== "escanearQR") return;
    if (scannedRef.current) return;
    if (alertOpenRef.current) return;
    if (!result?.data || result.data.length < 3) return;

    // Bloqueamos el scanner ANTES de cualquier procesamiento. Si parsear
    // tira excepción y no resetamos, la cámara queda viva pero muda
    // (eso explicaba la "pantalla negra" sin alerta).
    scannedRef.current = true;

    try {
      // TEMP: diagnóstico de QR. Quitar luego de validar el flujo.
      console.log("QR SCANNED:", result.data);
      const payload = parsearPayloadQR(result.data);
      console.log("QR PARSED:", payload);

      if (!payload || !payload.rutaId) {
        mostrarAlerta(
          "QR inválido",
          "El código no es válido. Por favor escanee el QR enviado por correo.",
        );
        return;
      }

      const rutaActual = String(rutaId).trim();
      if (payload.rutaId !== rutaActual) {
        mostrarAlerta(
          "QR no corresponde",
          "Este código no pertenece a esta entrega.",
        );
        return;
      }

      // QR válido: avanzamos a firma. La alerta es informativa, no
      // reabrimos el scanner cuando el usuario presione OK (resetScanned=false).
      setEstadoFlujo("firmar");
      mostrarAlerta(
        "QR validado",
        payload.codigoOtp
          ? "Cliente verificado. Ahora dibuje su firma para finalizar."
          : "QR aceptado. Ahora dibuje su firma para finalizar.",
        false,
      );
    } catch (err: any) {
      console.error("QR ERROR:", err);
      mostrarAlerta(
        "Error",
        "No se pudo procesar el QR. Inténtalo de nuevo.",
      );
    }
  }

  async function manejarFirmaOK(firmaBase64: string) {
    if (cargando) return;
    setCargando(true);
    setEstadoTexto("Guardando firma...");
    // El cierre de despacho puede tardar más de un minuto cuando hay
    // muchas evidencias (descarga de imágenes + generación PDF + envío
    // de email + retries). Damos un margen amplio para evitar que el
    // watchdog cierre el spinner antes de que el backend responda.
    arrancarWatchdogLoading(180000);

    try {
      await guardarFirmaEnSupabase(rutaId, firmaBase64);
    } catch {
      cancelarWatchdogLoading();
      setCargando(false);
      setEstadoTexto("");
      Alert.alert(
        "Firma",
        "No se pudo guardar la firma. Intente nuevamente.",
      );
      return;
    }

    setEstadoTexto("Generando comprobante y enviando correo...");

    try {
      const resultado = await cerrarDespachoYEnviarComprobante(rutaId);

      setEstadoFlujo("hecho");
      try {
        await onDespachoFinalizado?.();
      } catch (cbErr) {
        console.warn("onDespachoFinalizado:", cbErr);
      }
      Alert.alert(
        "Despacho finalizado",
        `La guía de despacho PDF (con firma) se generó y envió exitosamente a ${resultado.emailEnviadoA}. La entrega quedó validada.`,
      );
    } catch (err) {
      console.warn("CIERRE DESPACHO ERROR:", err);
      const mensaje =
        err instanceof Error && err.message
          ? err.message
          : "No se pudo finalizar el despacho. Inténtalo nuevamente.";
      Alert.alert("Error al finalizar despacho", mensaje);
    } finally {
      cancelarWatchdogLoading();
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
        <Text style={styles.instruccionTexto}>
          Apunte la cámara al QR del cliente
        </Text>
        <View
          style={{
            flex: 1,
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 60,
          }}
        >
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
          style={[
            styles.boton,
            { position: "absolute", bottom: 0, alignSelf: "center", width: "80%" },
          ]}
          onPress={() => {
            scannedRef.current = false;
            alertOpenRef.current = false;
            setEstadoFlujo("inicio");
          }}
        >
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
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#ffffff",
              borderRadius: 12,
              marginHorizontal: 5,
              paddingHorizontal: 24,
            }}
          >
            <ActivityIndicator size="large" color="#1565c0" />
            <Text
              style={{
                marginTop: 16,
                fontSize: 15,
                fontWeight: "600",
                color: "#111827",
                textAlign: "center",
              }}
            >
              {estadoTexto || "Procesando..."}
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#6b7280",
                textAlign: "center",
              }}
            >
              No cierre la app. Esto puede tardar hasta dos minutos.
            </Text>
          </View>
        ) : (
          <>
            <View
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 8,
                overflow: "hidden",
                marginHorizontal: 5,
                backgroundColor: "#fff",
              }}
            >
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginHorizontal: 5,
                marginTop: 15,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.boton,
                  {
                    flex: 1,
                    marginRight: 5,
                    backgroundColor: "#d32f2f",
                    paddingVertical: 10,
                  },
                ]}
                onPress={handleClearSignature}
              >
                <Text style={[styles.texto, { fontSize: 14 }]}>
                  Limpiar Pizarra
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.boton,
                  {
                    flex: 1,
                    marginLeft: 5,
                    backgroundColor: "#2e7d32",
                    paddingVertical: 10,
                  },
                ]}
                onPress={handleSaveSignature}
              >
                <Text style={[styles.texto, { fontSize: 14 }]}>
                  Guardar Firma
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.boton,
                {
                  marginTop: 10,
                  alignSelf: "center",
                  width: "90%",
                  backgroundColor: "#9e9e9e",
                  paddingVertical: 10,
                },
              ]}
              onPress={() => {
                scannedRef.current = false;
                alertOpenRef.current = false;
                setEstadoFlujo("escanearQR");
              }}
            >
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
          style={[
            styles.boton,
            styles.botonQR,
            cargando && styles.botonDeshabilitado,
          ]}
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
          <Text style={styles.successTexto}>
            ¡Entrega completada exitosamente!
          </Text>
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
    alignItems: "center",
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
