import { useState } from "react";
import { TouchableOpacity, Text, Alert, StyleSheet } from "react-native";
import { cerrarDespachoYEnviarComprobante } from "../services/cierreDespachoService";

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

  async function manejarClic(): Promise<void> {
    if (cargando) return;
    setCargando(true);
    try {
      const resultado = await cerrarDespachoYEnviarComprobante(rutaId);
      Alert.alert(
        "Éxito",
        `Comprobante enviado a ${resultado.emailEnviadoA}. La entrega quedó validada.`
      );
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "Ocurrió un error inesperado.";
      Alert.alert("Error", mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <TouchableOpacity
      onPress={manejarClic}
      disabled={cargando || !String(rutaId).trim()}
      style={[styles.boton, cargando && styles.botonDeshabilitado]}
    >
      <Text style={styles.texto}>
        {cargando ? "Cargando..." : etiquetaListo}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  boton: {
    backgroundColor: "#ff6600", // Color naranjo LogiTrack (puedes cambiarlo)
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
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