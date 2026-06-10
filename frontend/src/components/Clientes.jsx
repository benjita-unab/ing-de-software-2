import React, { useState, useEffect } from "react";
import { Search, User, Mail, Phone, MapPin, Pencil, Building2 } from "lucide-react";
import { getClientes, getHistorialDespachos } from "../lib/clientesService";
import FormularioCliente from "./FormularioCliente";
import Badge from "./ui/Badge";
import Card from "./ui/Card";
import Spinner from "./ui/Spinner";
import EmptyState from "./ui/EmptyState";

function historialBadgeVariant(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "entregado" || e === "completado") return "success";
  if (e === "pendiente" || e === "en_ruta") return "warning";
  if (e === "cancelado" || e === "cancelada") return "danger";
  return "muted";
}

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialData, setHistorialData] = useState({});
  const [modoFormulario, setModoFormulario] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);

  const selectedCliente = clientes.find((c) => c.id === selectedId) ?? null;

  const fetchClientes = async (query = "") => {
    try {
      setLoading(true);
      const data = await getClientes(query);
      setClientes(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      } else if (selectedId && !data.find((c) => c.id === selectedId)) {
        setSelectedId(data[0]?.id ?? null);
      }
    } catch (error) {
      console.error("Error al cargar clientes", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchClientes(search);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  useEffect(() => {
    if (!selectedId || historialData[selectedId]) return;
    let cancelled = false;
    async function loadHistorial() {
      setHistorialLoading(true);
      try {
        const data = await getHistorialDespachos(selectedId);
        if (!cancelled) {
          setHistorialData((prev) => ({ ...prev, [selectedId]: data }));
        }
      } catch (err) {
        console.error("Error cargando historial", err);
      } finally {
        if (!cancelled) setHistorialLoading(false);
      }
    }
    loadHistorial();
    return () => { cancelled = true; };
  }, [selectedId, historialData]);

  const handleNuevoCliente = () => {
    setClienteEditando(null);
    setModoFormulario(true);
  };

  const handleEditar = (cliente) => {
    setClienteEditando(cliente);
    setModoFormulario(true);
  };

  const handleFormularioGuardado = () => {
    setModoFormulario(false);
    fetchClientes(search);
  };

  if (modoFormulario) {
    return (
      <div className="lt-module-inner">
        <FormularioCliente
          clienteInicial={clienteEditando}
          onGuardado={handleFormularioGuardado}
          onCancel={() => setModoFormulario(false)}
        />
      </div>
    );
  }

  const historial = selectedId ? historialData[selectedId] : null;

  return (
    <div className="lt-module-inner">
      <div className="lt-toolbar">
        <div className="lt-search-wrap" style={{ flex: 1, maxWidth: 420 }}>
          <Search size={14} className="lt-search-icon" />
          <input
            type="text"
            className="lt-input"
            placeholder="Buscar por nombre, RUT o contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="lt-btn lt-btn--primary" onClick={handleNuevoCliente}>
          + Nuevo cliente
        </button>
      </div>

      {loading ? (
        <Spinner message="Cargando clientes..." />
      ) : clientes.length === 0 ? (
        <EmptyState icon={Building2} title="Sin clientes" description="No se encontraron clientes con ese criterio." />
      ) : (
        <div className="lt-clientes-split">
          <aside className="lt-clientes-list lt-scroll">
            {clientes.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                className={`lt-clientes-list__item ${selectedId === cliente.id ? "lt-clientes-list__item--active" : ""}`}
                onClick={() => setSelectedId(cliente.id)}
              >
                <div className="lt-clientes-list__name">{cliente.nombre}</div>
                <div className="lt-clientes-list__rut">{cliente.rut || "—"}</div>
              </button>
            ))}
          </aside>

          <div className="lt-clientes-detail">
            {selectedCliente ? (
              <>
                <Card className="lt-clientes-detail__card">
                  <div className="lt-clientes-detail__header">
                    <div>
                      <h3 className="lt-clientes-detail__title">{selectedCliente.nombre}</h3>
                      <p className="lt-clientes-detail__subtitle">{selectedCliente.rut || "Sin RUT"}</p>
                    </div>
                    <button
                      type="button"
                      className="lt-btn lt-btn--secondary"
                      onClick={() => handleEditar(selectedCliente)}
                    >
                      <Pencil size={14} />
                      Editar
                    </button>
                  </div>
                  <div className="lt-clientes-detail__grid">
                    <InfoItem icon={MapPin} label="Dirección" value={selectedCliente.direccion || "N/A"} />
                    <InfoItem icon={User} label="Contacto" value={selectedCliente.contacto_nombre || "N/A"} />
                    <InfoItem icon={Phone} label="Teléfono" value={selectedCliente.contacto_telefono || "N/A"} />
                    <InfoItem icon={Mail} label="Email" value={selectedCliente.contacto_email || "N/A"} />
                  </div>
                </Card>

                <Card className="lt-clientes-detail__card">
                  <h4 className="lt-module-card__title">Historial de despachos</h4>
                  {historialLoading && !historial ? (
                    <Spinner message="Cargando historial..." />
                  ) : !historial || historial.length === 0 ? (
                    <p className="lt-empty">No hay despachos registrados para este cliente.</p>
                  ) : (
                    <div className="lt-table-wrap">
                      <table className="lt-table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Dirección / Ruta</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historial.map((hist) => (
                            <tr key={hist.id}>
                              <td>{new Date(hist.created_at).toLocaleDateString("es-CL")}</td>
                              <td>{hist.destino || `Ruta ${hist.id}`}</td>
                              <td>
                                <Badge variant={historialBadgeVariant(hist.estado)}>
                                  {hist.estado}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </>
            ) : (
              <EmptyState icon={User} title="Selecciona un cliente" description="Elige un cliente del listado para ver su detalle." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="lt-info-row">
      <span className="lt-info-row__label">
        <Icon size={12} />
        {label}
      </span>
      <span className="lt-info-row__value">{value}</span>
    </div>
  );
}
