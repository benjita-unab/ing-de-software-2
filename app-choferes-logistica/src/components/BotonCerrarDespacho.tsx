import { useState, useRef, useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
  View,
  ActivityIndicator,
  TextInput,
  Modal,
  Keyboard,
} from "react-native";
import {
  cerrarDespachoYEnviarComprobante,
  enviarQRPrevio,
  guardarFirmaEnSupabase,
} from "../services/cierreDespachoService";
import { bffFetch } from "../services/bffService";
import { CameraView, useCameraPermissions } from "expo-camera";
import SignatureScreen from "react-native-signature-canvas";

export type BotonCerrarDespachoProps = {
  rutaId: string;
  bultosDespachadosOriginal?: number | null;
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
  bultosDespachadosOriginal = null,
  etiquetaListo: _etiquetaListo = "Cerrar despacho y enviar",
  onDespachoFinalizado,
}: BotonCerrarDespachoProps) {
  const [cargando, setCargando] = useState(false);
  const [estadoFlujo, setEstadoFlujo] = useState<EstadoFlujo>("inicio");
  const [estadoTexto, setEstadoTexto] = useState("");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [bultosRecepcionados, setBultosRecepcionados] = useState("");
  const [comentarioDiferenciaBultos, setComentarioDiferenciaBultos] = useState("");
  const signatureRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const [abrirCamaraDespacho, setAbrirCamaraDespacho] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [fotoHojaTomada, setFotoHojaTomada] = useState(false);

  const bultosDespachadosOriginalValue =
    typeof bultosDespachadosOriginal === "number" &&
    Number.isFinite(bultosDespachadosOriginal) &&
    bultosDespachadosOriginal >= 0
      ? bultosDespachadosOriginal
      : null;

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
    if (!fotoHojaTomada) {
      Alert.alert("Foto requerida", "Debe tomar la foto de la hoja de despacho antes de continuar.");
      return;
    }
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
      // Detener el reloj automáticamente de parte del backend y calcular penalizaciones
      await bffFetch(`/api/rutas/${rutaId}/scan-qr`, { method: "POST" });
    } catch {
      cancelarWatchdogLoading();
      setCargando(false);
      setEstadoTexto("");
      Alert.alert(
        "Firma",
        "No se pudo guardar la firma o procesar el tiempo de entrega. Intente nuevamente.",
      );
      return;
    }

    setEstadoTexto("Generando comprobante y enviando correo...");

    try {
      const trimmed = bultosRecepcionados.trim();
      const bultosRecepcionadosValue =
        trimmed === "" ? null : parseInt(trimmed, 10);

      if (
        trimmed !== "" &&
        (bultosRecepcionadosValue === null ||
          Number.isNaN(bultosRecepcionadosValue) ||
          bultosRecepcionadosValue < 0)
      ) {
        Alert.alert(
          "Error",
          "Cantidad de bultos/slots recepcionados debe ser un número entero no negativo.",
        );
        setCargando(false);
        setEstadoTexto("");
        return;
      }

      if (
        bultosRecepcionadosValue !== null &&
        bultosDespachadosOriginalValue !== null &&
        bultosRecepcionadosValue > bultosDespachadosOriginalValue
      ) {
        Alert.alert(
          "Error",
          "No puede recepcionar más bultos/slots de los despachados",
        );
        setCargando(false);
        setEstadoTexto("");
        return;
      }

      const comentarioTrim = comentarioDiferenciaBultos.trim();
      if (
        bultosRecepcionadosValue !== null &&
        bultosDespachadosOriginalValue !== null &&
        bultosRecepcionadosValue !== bultosDespachadosOriginalValue &&
        comentarioTrim === ""
      ) {
        Alert.alert(
          "Error",
          "Justificación obligatoria: debe ingresar un comentario cuando los bultos/slots recibidos difieren de los despachados.",
        );
        setCargando(false);
        setEstadoTexto("");
        return;
      }

      const resultado = await cerrarDespachoYEnviarComprobante(
        rutaId,
        bultosRecepcionadosValue,
        comentarioTrim || null,
      );

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
      if (
        err instanceof Error &&
        err.message.includes("Justificación obligatoria por diferencia de bultos/slots")
      ) {
        Alert.alert(
          "Error",
          "Debe ingresar un comentario justificando la diferencia de bultos/slots",
        );
      } else {
        const mensaje =
          err instanceof Error && err.message
            ? err.message
            : "No se pudo finalizar el despacho. Inténtalo nuevamente.";
        Alert.alert("Error al finalizar despacho", mensaje);
      }
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
    const trimmed = bultosRecepcionados.trim();
    const bultosRecepcionadosValue =
      trimmed === "" ? null : parseInt(trimmed, 10);

    if (
      trimmed !== "" &&
      (bultosRecepcionadosValue === null ||
        Number.isNaN(bultosRecepcionadosValue) ||
        bultosRecepcionadosValue < 0)
    ) {
      Alert.alert(
        "Error",
        "Cantidad de bultos/slots recepcionados debe ser un número entero no negativo.",
      );
      return;
    }

    if (
      bultosRecepcionadosValue !== null &&
      bultosDespachadosOriginalValue !== null &&
      bultosRecepcionadosValue > bultosDespachadosOriginalValue
    ) {
      Alert.alert(
        "Error",
        "No puede recepcionar más bultos/slots de los despachados",
      );
      return;
    }

    const comentarioTrim = comentarioDiferenciaBultos.trim();
    if (
      bultosRecepcionadosValue !== null &&
      bultosDespachadosOriginalValue !== null &&
      bultosRecepcionadosValue !== bultosDespachadosOriginalValue &&
      comentarioTrim === ""
    ) {
      Alert.alert(
        "Error",
        "Justificación obligatoria: debe ingresar un comentario cuando los bultos/slots recibidos difieren de los despachados.",
      );
      return;
    }

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
      <Modal visible transparent={false} animationType="slide">
        <View style={styles.modalRoot}>
          <Text style={styles.instruccionTexto}>Firma del receptor (Cliente)</Text>
          {cargando ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1565c0" />
              <Text style={styles.loadingText}>{estadoTexto || "Procesando..."}</Text>
              <Text style={styles.loadingSubtext}>
                No cierre la app. Esto puede tardar hasta dos minutos.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.signatureContainer}>
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
              <View style={styles.bottomContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Cantidad de Bultos/Slots Recepcionados</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    value={bultosRecepcionados}
                    onChangeText={setBultosRecepcionados}
                    placeholder="Ej: 10"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Comentario diferencia de bultos/slots/slots</Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    multiline
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    numberOfLines={3}
                    value={comentarioDiferenciaBultos}
                    onChangeText={setComentarioDiferenciaBultos}
                    placeholder="Ingrese justificación si los bultos/slots difieren"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={styles.buttonRow}>
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
                    <Text style={[styles.texto, { fontSize: 14 }]}>Limpiar Pizarra</Text>
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
                    <Text style={[styles.texto, { fontSize: 14 }]}>Guardar Firma</Text>
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
              </View>
            </>
          )}
        </View>
      </Modal>
    );
  }


  return (
    <View style={styles.container}>
      {abrirCamaraDespacho && (
        <Modal animationType="slide" visible={true} onRequestClose={() => setAbrirCamaraDespacho(false)}>
          <CameraView style={{ flex: 1 }} ref={cameraRef} facing="back">
            <View style={{ flex: 1, justifyContent: "flex-end", alignItems: "center", paddingBottom: 40 }}>
               {subiendoFoto ? (
                 <ActivityIndicator size="large" color="#ffffff" />
               ) : (
                 <>
                   <TouchableOpacity
                     style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: "white" }}
                     onPress={async () => {
                       if (cameraRef.current) {
                         setSubiendoFoto(true);
                         try {
                           const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
                           const response = await bffFetch(`/api/entregas/${rutaId}/photo`, {
                             method: "POST",
                             headers: { "Content-Type": "application/json" },
                             body: JSON.stringify({ base64Photo: photo.base64 }),
                           });
                           if (!response.ok) throw new Error("Error backend");
                           Alert.alert("Éxito", "Hoja de despacho subida correctamente.");
                           setFotoHojaTomada(true);
                           setAbrirCamaraDespacho(false);
                         } catch (err) {
                           Alert.alert("Error", "No se pudo subir la foto de la hoja de despacho.");
                         } finally {
                           setSubiendoFoto(false);
                         }
                       }
                     }}
                   />
                   <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setAbrirCamaraDespacho(false)}>
                     <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>Cancelar</Text>
                   </TouchableOpacity>
                 </>
               )}
            </View>
          </CameraView>
        </Modal>
      )}

      {estadoFlujo === "inicio" && (
        <>
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

          <TouchableOpacity
            onPress={async () => {
              if (!cameraPermission?.granted) {
                const permiso = await requestCameraPermission();
                if (!permiso?.granted) {
                  Alert.alert("Permiso requerido", "Necesitamos acceso a la cámara.");
                  return;
                }
              }
              setAbrirCamaraDespacho(true);
            }}
            disabled={cargando || !String(rutaId).trim()}
            style={[
              styles.boton,
              { backgroundColor: '#f59e0b', marginTop: 10 },
              cargando && styles.botonDeshabilitado,
            ]}
          >
            <Text style={styles.texto}>Tomar Foto Hoja de Despacho</Text>
          </TouchableOpacity>
        </>
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
    marginTop: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
    borderRadius: 10,
    borderColor: '#ffffff20',
    borderWidth: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
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
  label: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#ffffff",
    color: "#111827",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingTop: 20,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  signatureContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 16,
    minHeight: 320,
  },
  bottomContainer: {
    width: "100%",
    paddingBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 14,
    color: "#111827",
    textAlign: "center",
  },
  loadingSubtext: {
    fontSize: 13,
    color: "#4b5563",
    marginTop: 8,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 12,
  },
});
