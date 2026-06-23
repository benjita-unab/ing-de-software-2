import React, { useCallback, useEffect, useState } from "react";
import { Layers, AlertTriangle } from "lucide-react";
import {
  obtenerConsolidacion,
  consolidarPedidoEnRuta,
} from "../lib/rutasService";
import OccupancyBar from "./ui/OccupancyBar";
import Spinner from "./ui/Spinner";
import ConsolidacionMapaParadas from "./ConsolidacionMapaParadas";

function advertenciaClass(bloqueante) {
  return bloqueante
    ? "lt-alert-banner lt-alert-banner--error"
    : "lt-alert-banner lt-alert-banner--warning";
}

export default function ConsolidacionRutaPanel({ rutaId, onConsolidado }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState("");
  const [consolidando, setConsolidando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [confirmarOcupacion, setConfirmarOcupacion] = useState(false);
  const [confirmarDistancia, setConfirmarDistancia] = useState(false);
  const [advertenciasPendientes, setAdvertenciasPendientes] = useState([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await obtenerConsolidacion(rutaId);
    if (res.error) {
      setError(res.error);
      setInfo(null);
    } else {
      setInfo(res.data);
    }
    setLoading(false);
  }, [rutaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const ejecutarConsolidacion = async (opciones = {}) => {
    if (!pedidoSeleccionado) {
      setMensaje({ tipo: "error", texto: "Seleccione un pedido para consolidar." });
      return;
    }

    setConsolidando(true);
    setMensaje(null);

    const res = await consolidarPedidoEnRuta(rutaId, pedidoSeleccionado, opciones);

    if (res.success) {
      setInfo(res.data);
      setPedidoSeleccionado("");
      setConfirmarOcupacion(false);
      setConfirmarDistancia(false);
      setAdvertenciasPendientes([]);
      setMensaje({ tipo: "ok", texto: "Pedido consolidado correctamente." });
      onConsolidado?.();
    } else if (res.requiere_confirmacion) {
      setAdvertenciasPendientes(res.advertencias || []);
      setMensaje({ tipo: "warn", texto: res.error });
    } else {
      setMensaje({ tipo: "error", texto: res.error });
    }

    setConsolidando(false);
  };

  const handleConsolidar = () => {
    const opciones = {};
    if (confirmarOcupacion) opciones.ignorar_advertencias_ocupacion = true;
    if (confirmarDistancia) opciones.ignorar_advertencias_distancia = true;
    ejecutarConsolidacion(opciones);
  };

  if (loading) {
    return <Spinner message="Cargando consolidación…" />;
  }

  if (error) {
    return (
      <div className="lt-alert-banner lt-alert-banner--error" role="alert">
        {error}
      </div>
    );
  }

  if (!info) return null;

  const { capacidad, pedidos, pedidos_disponibles, paradas_mapa, advertencias } = info;
  const hayAdvertenciaOcupacion = advertenciasPendientes.some(
    (a) => a.tipo === "ocupacion_baja",
  );
  const hayAdvertenciaDistancia = advertenciasPendientes.some(
    (a) => a.tipo === "distancia_destinos",
  );
  const necesitaConfirmacion =
    advertenciasPendientes.length > 0 &&
    (!hayAdvertenciaOcupacion || confirmarOcupacion) &&
    (!hayAdvertenciaDistancia || confirmarDistancia) &&
    (hayAdvertenciaOcupacion || hayAdvertenciaDistancia);

  return (
    <div className="lt-consolidacion-panel lt-form-subsection" style={{ marginTop: 0 }}>
      <div className="lt-form-subsection__header" style={{ marginBottom: 12 }}>
        <Layers size={18} />
        <span>Consolidación de pedidos (HU-59)</span>
      </div>

      <div className="lt-field-group" style={{ marginBottom: 16, maxWidth: 420 }}>
        <span className="lt-label">Ocupación de la ruta</span>
        <OccupancyBar
          slotsUtilizados={capacidad?.slots_utilizados_ruta ?? 0}
          slotsTotales={capacidad?.slots ?? 96}
        />
        <p className="lt-list-item__sub" style={{ marginTop: 6 }}>
          Capacidad restante: <strong>{capacidad?.slots_disponibles ?? 0}</strong> slots
          · Talla camión: <strong>{capacidad?.talla ?? "—"}</strong>
        </p>
      </div>

      {(advertencias?.length > 0 || advertenciasPendientes.length > 0) && (
        <div style={{ marginBottom: 12 }}>
          {[...(advertencias || []), ...advertenciasPendientes]
            .filter(
              (a, idx, arr) =>
                arr.findIndex((x) => x.tipo === a.tipo && x.mensaje === a.mensaje) === idx,
            )
            .map((adv, i) => (
              <div
                key={`${adv.tipo}-${i}`}
                className={advertenciaClass(adv.bloqueante)}
                role="alert"
                style={{ marginBottom: 8 }}
              >
                <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                {adv.mensaje}
              </div>
            ))}
        </div>
      )}

      <div className="lt-form-subsection" style={{ marginBottom: 16 }}>
        <span className="lt-label" style={{ display: "block", marginBottom: 8 }}>
          Pedidos consolidados en esta ruta
        </span>
        {pedidos?.length ? (
          <div className="lt-table-wrap">
            <table className="lt-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Bultos</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.nombre_ruta?.trim() ||
                        (p.es_maestra ? "Ruta maestra" : "Pedido consolidado")}
                    </td>
                    <td>{p.cliente_nombre || "—"}</td>
                    <td>{p.origen || "—"}</td>
                    <td>{p.destino || "—"}</td>
                    <td>{p.bultos_despachados ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="lt-list-item__sub">Sin pedidos en el grupo.</p>
        )}
      </div>

      <div className="lt-field-group" style={{ marginBottom: 12 }}>
        <span className="lt-label">Mapa de consolidación</span>
        <ConsolidacionMapaParadas
          paradas={paradas_mapa || []}
          rutaMaestraId={info.ruta_maestra_id}
        />
      </div>

      {pedidos_disponibles?.length > 0 ? (
        <div className="lt-form-grid" style={{ alignItems: "end" }}>
          <div className="lt-field-group">
            <label className="lt-label" htmlFor={`consolidar-pedido-${rutaId}`}>
              Consolidar pedido
            </label>
            <select
              id={`consolidar-pedido-${rutaId}`}
              className="lt-select"
              value={pedidoSeleccionado}
              onChange={(e) => {
                setPedidoSeleccionado(e.target.value);
                setAdvertenciasPendientes([]);
                setConfirmarOcupacion(false);
                setConfirmarDistancia(false);
                setMensaje(null);
              }}
            >
              <option value="">Seleccione un pedido…</option>
              {pedidos_disponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.cliente_nombre || "Cliente"} — {p.origen} → {p.destino}
                  {p.bultos_despachados != null ? ` (${p.bultos_despachados} bultos)` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="lt-form-actions" style={{ marginTop: 0 }}>
            {hayAdvertenciaOcupacion && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}>
                <input
                  type="checkbox"
                  checked={confirmarOcupacion}
                  onChange={(e) => setConfirmarOcupacion(e.target.checked)}
                />
                Ignorar advertencia de ocupación
              </label>
            )}
            {hayAdvertenciaDistancia && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}>
                <input
                  type="checkbox"
                  checked={confirmarDistancia}
                  onChange={(e) => setConfirmarDistancia(e.target.checked)}
                />
                Ignorar advertencia de distancia
              </label>
            )}
            <button
              type="button"
              className="lt-btn lt-btn--primary"
              disabled={consolidando || !pedidoSeleccionado}
              onClick={handleConsolidar}
            >
              {consolidando
                ? "Consolidando…"
                : necesitaConfirmacion
                  ? "Confirmar consolidación"
                  : "Consolidar pedido"}
            </button>
          </div>
        </div>
      ) : (
        <p className="lt-list-item__sub">
          No hay pedidos disponibles para consolidar en esta ruta.
        </p>
      )}

      {mensaje?.texto && (
        <div
          className={
            mensaje.tipo === "ok"
              ? "lt-alert-banner lt-alert-banner--success"
              : mensaje.tipo === "warn"
                ? "lt-alert-banner lt-alert-banner--warning"
                : "lt-alert-banner lt-alert-banner--error"
          }
          role="status"
          style={{ marginTop: 12 }}
        >
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}
