import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/apiClient";
import { crearRuta } from "../lib/rutasService";

const base = {
  container: {
    minHeight: "100%",
    background: "transparent",
    color: "#fff",
    padding: "10px",
    fontFamily: "'Inter', 'Poppins', sans-serif",
    overflow: "auto",
  },
  card: {
    background: "rgba(8,8,12,0.72)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    padding: "18px",
    marginBottom: "14px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px)",
  },
  title: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#fff",
    marginBottom: "8px",
    letterSpacing: "0.06em",
  },
  subtitle: {
    fontSize: "13px",
    color: "rgba(226,232,240,0.75)",
    marginBottom: "16px",
    lineHeight: 1.5,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "12px",
  },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.75)",
    fontSize: "12px",
    fontWeight: 600,
    background: "rgba(255,255,255,0.03)",
  },
  td: {
    padding: "12px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontSize: "14px",
    color: "#e2e8f0",
    verticalAlign: "top",
  },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 600,
    background: "rgba(58,12,163,0.45)",
    color: "#ffffff",
    border: "1px solid rgba(76,201,240,0.35)",
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 18px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
  },
  btnWaze: {
    background: "#33ccff",
    color: "#0f172a",
    border: "none",
    borderRadius: "8px",
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "12px",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "rgba(226,232,240,0.9)",
    marginBottom: "6px",
    marginTop: "10px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(15,23,42,0.65)",
    color: "#f8fafc",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(15,23,42,0.95)",
    color: "#f8fafc",
    fontSize: "14px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "12px 16px",
    marginTop: "8px",
  },
  alertOk: {
    padding: "10px 14px",
    borderRadius: "10px",
    background: "rgba(34,197,94,0.15)",
    border: "1px solid rgba(34,197,94,0.45)",
    color: "#86efac",
    fontSize: "13px",
    marginBottom: "12px",
  },
  alertErr: {
    padding: "10px 14px",
    borderRadius: "10px",
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(248,113,113,0.45)",
    color: "#fecaca",
    fontSize: "13px",
    marginBottom: "12px",
  },
};

function openWazeNavigation(destinoTexto) {
  const q = String(destinoTexto || "").trim();
  if (!q) return;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes&utm_source=logitrack`;
  window.open(wazeUrl, "_blank", "noopener,noreferrer");
}

/** datetime-local → ISO (UTC) para el backend */
function localDatetimeToIso(localVal) {
  if (!localVal || !String(localVal).trim()) return null;
  const d = new Date(localVal);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CL", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

export default function RutasActivas() {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const [form, setForm] = useState({
    clienteId: "",
    conductorId: "",
    camionId: "",
    origen: "",
    destino: "",
    fechaInicio: "",
    eta: "",
  });

  const cargarRutas = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch("/api/rutas");
    if (!res.ok) {
      setRutas([]);
      setMensaje({ tipo: "error", texto: res.error || "No se pudieron cargar las rutas." });
      setLoading(false);
      return;
    }
    const payload = res.data;
    const lista = Array.isArray(payload) ? payload : payload?.data ?? [];
    setRutas(lista);
    setLoading(false);
  }, []);

  const cargarListas = useCallback(async () => {
    setListsLoading(true);
    const [cRes, coRes, caRes] = await Promise.all([
      apiFetch("/api/clientes"),
      apiFetch("/api/conductores"),
      apiFetch("/api/camiones/disponibles"),
    ]);

    if (cRes.ok) {
      const p = cRes.data;
      setClientes(Array.isArray(p) ? p : p?.data ?? []);
    } else setClientes([]);

    if (coRes.ok) {
      const p = coRes.data;
      setConductores(Array.isArray(p) ? p : p?.data ?? []);
    } else setConductores([]);

    if (caRes.ok) {
      const p = caRes.data;
      setCamiones(Array.isArray(p) ? p : p?.data ?? []);
    } else {
      const fallback = await apiFetch("/api/camiones");
      if (fallback.ok) {
        const p = fallback.data;
        setCamiones(Array.isArray(p) ? p : p?.data ?? []);
      } else setCamiones([]);
    }

    setListsLoading(false);
  }, []);

  useEffect(() => {
    cargarRutas();
    cargarListas();
  }, [cargarRutas, cargarListas]);

  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const enviarFormulario = async (e) => {
    e.preventDefault();
    setMensaje(null);
    setSaving(true);

    const payload = {
      cliente_id: form.clienteId.trim(),
      origen: form.origen.trim(),
      destino: form.destino.trim(),
    };

    if (form.conductorId.trim()) payload.conductor_id = form.conductorId.trim();
    if (form.camionId.trim()) payload.camion_id = form.camionId.trim();

    const fi = localDatetimeToIso(form.fechaInicio);
    const eta = localDatetimeToIso(form.eta);
    if (fi) payload.fecha_inicio = fi;
    if (eta) payload.eta = eta;

    const resultado = await crearRuta(payload);
    setSaving(false);

    if (!resultado.success) {
      setMensaje({
        tipo: "error",
        texto: resultado.error || "No se pudo crear la ruta. Revise los datos o intente nuevamente.",
      });
      return;
    }

    setMensaje({ tipo: "ok", texto: "Ruta creada correctamente." });
    setForm({
      clienteId: "",
      conductorId: "",
      camionId: "",
      origen: "",
      destino: "",
      fechaInicio: "",
      eta: "",
    });
    setShowForm(false);
    await cargarRutas();
  };

  return (
    <div style={base.container} className="premium-scroll operator-section">
      <div style={base.card} className="operator-glass-card">
        <div style={base.title}>Gestión de rutas</div>
        <p style={base.subtitle}>
          Creá y consultá rutas operativas. El seguimiento y las evidencias siguen siendo responsabilidad de LogiTrack (app móvil y trazabilidad).
        </p>

        {mensaje?.tipo === "ok" && (
          <div style={base.alertOk}>{mensaje.texto}</div>
        )}
        {mensaje?.tipo === "error" && (
          <div style={base.alertErr}>{mensaje.texto}</div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <button
            type="button"
            style={base.btnPrimary}
            onClick={() => {
              setShowForm((v) => !v);
              setMensaje(null);
            }}
          >
            {showForm ? "Ocultar formulario" : "Crear nueva ruta"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={enviarFormulario} style={{ ...base.card, padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontWeight: 700, marginBottom: "8px", color: "#e2e8f0" }}>Nueva ruta</div>
            <div style={base.formGrid}>
              <div>
                <label style={base.label}>Cliente *</label>
                <select
                  style={base.select}
                  required
                  value={form.clienteId}
                  onChange={(e) => actualizarCampo("clienteId", e.target.value)}
                  disabled={listsLoading}
                >
                  <option value="">Seleccionar…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre || c.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={base.label}>Conductor (opcional)</label>
                <select
                  style={base.select}
                  value={form.conductorId}
                  onChange={(e) => actualizarCampo("conductorId", e.target.value)}
                  disabled={listsLoading}
                >
                  <option value="">—</option>
                  {conductores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.rut || c.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={base.label}>Camión (opcional)</label>
                <select
                  style={base.select}
                  value={form.camionId}
                  onChange={(e) => actualizarCampo("camionId", e.target.value)}
                  disabled={listsLoading}
                >
                  <option value="">—</option>
                  {camiones.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.patente || c.id} {c.estado ? `(${c.estado})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={base.label}>Origen *</label>
                <input
                  style={base.input}
                  required
                  value={form.origen}
                  onChange={(e) => actualizarCampo("origen", e.target.value)}
                  placeholder="Ej: Centro de distribución Santiago"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={base.label}>Destino *</label>
                <input
                  style={base.input}
                  required
                  value={form.destino}
                  onChange={(e) => actualizarCampo("destino", e.target.value)}
                  placeholder="Ej: Av. Los Leones 123, Providencia"
                />
              </div>
              <div>
                <label style={base.label}>Fecha inicio (opcional)</label>
                <input
                  style={base.input}
                  type="datetime-local"
                  value={form.fechaInicio}
                  onChange={(e) => actualizarCampo("fechaInicio", e.target.value)}
                />
              </div>
              <div>
                <label style={base.label}>ETA (opcional)</label>
                <input
                  style={base.input}
                  type="datetime-local"
                  value={form.eta}
                  onChange={(e) => actualizarCampo("eta", e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: "18px", display: "flex", gap: "12px", alignItems: "center" }}>
              <button type="submit" style={base.btnPrimary} disabled={saving || listsLoading}>
                {saving ? "Guardando…" : "Guardar ruta"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div style={base.card} className="operator-glass-card">
        <div style={{ ...base.title, fontSize: "15px" }}>Navegación con Waze</div>
        <p style={{ ...base.subtitle, marginBottom: 0 }}>
          Waze se utiliza solo como apoyo para navegación. El seguimiento, evidencias y cierre de despacho se mantienen dentro de LogiTrack.
        </p>
      </div>

      <div style={base.card} className="operator-glass-card">
        <div style={{ ...base.title, fontSize: "16px" }}>Rutas registradas</div>
        {loading ? (
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>Cargando rutas…</p>
        ) : rutas.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>No hay rutas para mostrar. Cree una con el botón superior.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={base.table}>
              <thead>
                <tr>
                  <th style={base.th}>Origen</th>
                  <th style={base.th}>Destino</th>
                  <th style={base.th}>Cliente</th>
                  <th style={base.th}>Estado</th>
                  <th style={base.th}>Conductor / Camión</th>
                  <th style={base.th}>ETA</th>
                  <th style={base.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rutas.map((ruta) => (
                  <tr key={ruta.id}>
                    <td style={base.td}>{ruta.origen || "—"}</td>
                    <td style={base.td}>{ruta.destino || "—"}</td>
                    <td style={base.td}>{ruta.clientes?.nombre || "—"}</td>
                    <td style={base.td}>
                      <span style={base.badge}>{ruta.estado || "—"}</span>
                    </td>
                    <td style={base.td}>
                      <div>{ruta.conductores?.rut || "—"}</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                        {ruta.camiones?.patente || "—"}
                      </div>
                    </td>
                    <td style={base.td}>{fmtDate(ruta.eta)}</td>
                    <td style={base.td}>
                      <button
                        type="button"
                        style={base.btnWaze}
                        onClick={() => openWazeNavigation(ruta.destino)}
                        disabled={!String(ruta.destino || "").trim()}
                      >
                        Abrir en Waze
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
