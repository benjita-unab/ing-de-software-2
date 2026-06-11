import React from "react";
import MensajesConductor from "./MensajesConductor";

/**
 * HU-40 Fase 1: estados y emergencias del conductor agrupados por ruta.
 * Reutiliza MensajesConductor con copy orientado a alertas.
 */
export default function AlertasConductor(props) {
  return <MensajesConductor {...props} variant="alertas" />;
}
