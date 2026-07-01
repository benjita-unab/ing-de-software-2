import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Plus, RefreshCw, Search } from "lucide-react";
import {
  actualizarRutaPlantilla,
  crearRutaPlantilla,
  desactivarRutaPlantilla,
  duplicarRutaPlantilla,
  getRutaPlantillaById,
  getRutasPlantilla,
} from "../lib/rutasPlantillaService";
import { getClientes } from "../lib/clientesService";
import { puedeAdministrarPlantillas } from "../lib/rolePermissions";
import FormularioRutaPlantilla from "./FormularioRutaPlantilla";
import Badge from "./ui/Badge";
import EmptyState from "./ui/EmptyState";
import Spinner from "./ui/Spinner";

const FILTRO_TODAS = "all";
const FILTRO_ACTIVAS = "true";
const FILTRO_INACTIVAS = "false";

function formatDistancia(km) {
  if (km == null || !Number.isFinite(Number(km))) return "—";
  return `${Number(km).toLocaleString("es-CL")} km`;
}

function formatTiempo(min) {
  if (min == null || !Number.isFinite(Number(min))) return "—";
  return `${Number(min).toLocaleString("es-CL")} min`;
}

export default function RutasPlantilla({ operator }) {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filtroActiva, setFiltroActiva] = useState(FILTRO_ACTIVAS);
  const [modoFormulario, setModoFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [soloLectura, setSoloLectura] = useState(false);
  const [accionId, setAccionId] = useState(null);
  const [clientesMap, setClientesMap] = useState({});
  const esAdminPlantillas = puedeAdministrarPlantillas(operator?.role);

  useEffect(() => {
    async function cargarClientes() {
      const data = await getClientes();
      const lista = Array.isArray(data) ? data : data?.data || [];
      const map = {};
      for (const c of lista) {
        map[c.id] = c.nombre;
      }
      setClientesMap(map);
    }
    cargarClientes();
  }, []);

  const loadRutas = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await getRutasPlantilla({
      nombre: search,
      activa: filtroActiva === FILTRO_TODAS ? undefined : filtroActiva,
    });
    if (res.error) {
      setError(res.error);
      setRutas([]);
    } else {
      setRutas(res.data?.data || []);
    }
    setLoading(false);
  }, [search, filtroActiva]);

  useEffect(() => {
    const t = setTimeout(loadRutas, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [loadRutas, search]);

  const rutasVisibles = useMemo(() => rutas, [rutas]);

  async function handleGuardado(payload, id) {
    const res = id
      ? await actualizarRutaPlantilla(id, payload)
      : await crearRutaPlantilla(payload);
    if (res.error) {
      setError(res.error);
      return;
    }
    setModoFormulario(false);
    setEditando(null);
    setSoloLectura(false);
    await loadRutas();
  }

  async function handleDuplicar(id) {
    setAccionId(id);
    setError("");
    const res = await duplicarRutaPlantilla(id);
    setAccionId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    await loadRutas();
  }

  async function handleDesactivar(ruta) {
    if (!window.confirm(`¿Desactivar la ruta «${ruta.nombre}»?`)) return;
    setAccionId(ruta.id);
    setError("");
    const res = await desactivarRutaPlantilla(ruta.id);
    setAccionId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    await loadRutas();
  }

  async function handleEditar(ruta) {
    setAccionId(ruta.id);
    setError("");
    const res = await getRutaPlantillaById(ruta.id);
    setAccionId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEditando(res.data);
    setSoloLectura(false);
    setModoFormulario(true);
  }

  async function handleVer(ruta) {
    setAccionId(ruta.id);
    setError("");
    const res = await getRutaPlantillaById(ruta.id);
    setAccionId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEditando(res.data);
    setSoloLectura(true);
    setModoFormulario(true);
  }

  if (modoFormulario) {
    return (
      <div className="lt-module-inner">
        <FormularioRutaPlantilla
          plantillaInicial={editando}
          soloLectura={soloLectura}
          onGuardado={handleGuardado}
          onCancel={() => {
            setModoFormulario(false);
            setEditando(null);
            setSoloLectura(false);
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="lt-module-inner" style={{ padding: "48px", textAlign: "center" }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="lt-module-inner">
      <div className="lt-toolbar" style={{ marginBottom: "16px" }}>
        <div className="lt-search-wrap">
          <Search size={16} className="lt-search-wrap__icon" />
          <input
            type="search"
            className="lt-input"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="lt-select"
          value={filtroActiva}
          onChange={(e) => setFiltroActiva(e.target.value)}
          aria-label="Filtrar activas/inactivas"
        >
          <option value={FILTRO_ACTIVAS}>Activas</option>
          <option value={FILTRO_INACTIVAS}>Inactivas</option>
          <option value={FILTRO_TODAS}>Todas</option>
        </select>
        <button type="button" className="lt-btn lt-btn--ghost" onClick={loadRutas}>
          <RefreshCw size={16} />
          Actualizar
        </button>
        {esAdminPlantillas ? (
          <button
            type="button"
            className="lt-btn lt-btn--primary"
            onClick={() => {
              setEditando(null);
              setSoloLectura(false);
              setModoFormulario(true);
            }}
          >
            <Plus size={16} />
            Nueva ruta
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="lt-alert lt-alert--danger" role="alert">
          {error}
        </p>
      ) : null}

      {rutasVisibles.length === 0 ? (
        <EmptyState
          title="Sin plantillas de ruta"
          description="Cree plantillas para originar pedidos."
        />
      ) : (
        <div className="lt-card lt-module-card">
          <div className="lt-card__body">
            <div className="lt-table-wrap">
              <table className="lt-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Cliente</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Distancia</th>
                    <th>Tiempo</th>
                    <th>Paradas</th>
                    <th>Pedidos</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rutasVisibles.map((r) => (
                    <tr key={r.id}>
                      <td>{r.nombre}</td>
                      <td>{r.clienteId ? clientesMap[r.clienteId] || "—" : "Global"}</td>
                      <td className="lt-table__col--truncate">{r.origen}</td>
                      <td className="lt-table__col--truncate">{r.destino}</td>
                      <td>{formatDistancia(r.distanciaEstimada)}</td>
                      <td>{formatTiempo(r.tiempoEstimado)}</td>
                      <td>{r.cantidadParadas ?? 0}</td>
                      <td>{r.cantidadPedidos ?? 0}</td>
                      <td>
                        <Badge variant={r.activa ? "success" : "muted"} showDot={false}>
                          {r.activa ? "Activa" : "Inactiva"}
                        </Badge>
                      </td>
                      <td>
                        <div className="lt-table__actions lt-table__actions--row">
                          {esAdminPlantillas ? (
                            <>
                              <button
                                type="button"
                                className="lt-btn lt-btn--secondary lt-btn--sm"
                                onClick={() => handleEditar(r)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="lt-btn lt-btn--secondary lt-btn--sm"
                                disabled={accionId === r.id}
                                onClick={() => handleDuplicar(r.id)}
                              >
                                <Copy size={14} /> Duplicar
                              </button>
                              {r.activa ? (
                                <button
                                  type="button"
                                  className="lt-btn lt-btn--secondary lt-btn--sm"
                                  disabled={accionId === r.id}
                                  onClick={() => handleDesactivar(r)}
                                >
                                  Desactivar
                                </button>
                              ) : null}
                            </>
                          ) : (
                            <button
                              type="button"
                              className="lt-btn lt-btn--secondary lt-btn--sm"
                              onClick={() => handleVer(r)}
                            >
                              Ver detalle
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
