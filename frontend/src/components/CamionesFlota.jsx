import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Eye, Plus, Search } from "lucide-react";

import {

  FILTRO_ESTADO_TODOS,

  calcularDiasRestantesRevision,

  filtrarYOrdenarCamiones,

  formatCapacidadKg,

  formatDiasRestantesText,

  formatFechaCamion,

  estadoCamionBadge,

  obtenerEstadoRevision,

  ORDEN_CAMIONES,

  puedeGestionarCamiones,

  resolveProximaMantencion,

} from "../lib/camionUtils";

import { obtenerCamiones } from "../lib/camionesService";

import Badge from "./ui/Badge";

import DetalleCamionModal from "./DetalleCamionModal";

import EmptyState from "./ui/EmptyState";

import FormularioCamion from "./FormularioCamion";
import OccupancyBar from "./ui/OccupancyBar";



const OPCIONES_FILTRO = [

  { value: FILTRO_ESTADO_TODOS, label: "Todos" },

  { value: "DISPONIBLE", label: "Disponible" },

  { value: "EN_RUTA", label: "En ruta" },

  { value: "MANTENCION", label: "Mantención" },

];



const OPCIONES_ORDEN = [

  { value: ORDEN_CAMIONES.PATENTE_ASC, label: "Patente A-Z" },

  { value: ORDEN_CAMIONES.PATENTE_DESC, label: "Patente Z-A" },

  { value: ORDEN_CAMIONES.REVISION_PROXIMA, label: "Revisión más próxima" },

  { value: ORDEN_CAMIONES.REVISION_LEJANA, label: "Revisión más lejana" },

];



export default function CamionesFlota({ operator }) {

  const [camiones, setCamiones] = useState([]);

  const [cargando, setCargando] = useState(true);

  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const [camionDetalle, setCamionDetalle] = useState(null);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [busqueda, setBusqueda] = useState("");

  const [filtroEstado, setFiltroEstado] = useState(FILTRO_ESTADO_TODOS);

  const [orden, setOrden] = useState(ORDEN_CAMIONES.PATENTE_ASC);



  const puedeAgregar = puedeGestionarCamiones(operator?.role);



  const cargarCamiones = useCallback(async () => {

    setCargando(true);

    const res = await obtenerCamiones();



    if (res.error) {

      setMensaje({ tipo: "error", texto: `Error cargando camiones: ${res.error}` });

      setCamiones([]);

    } else {

      setCamiones(res.data || []);

    }

    setCargando(false);

  }, []);



  useEffect(() => {

    cargarCamiones();

  }, [cargarCamiones]);



  const camionesVisibles = useMemo(

    () => filtrarYOrdenarCamiones(camiones, busqueda, filtroEstado, orden),

    [camiones, busqueda, filtroEstado, orden],

  );



  const hayFiltroActivo = busqueda.trim() || filtroEstado !== FILTRO_ESTADO_TODOS;



  const alertClass =

    mensaje.tipo === "success"

      ? "lt-alert-banner--success"

      : mensaje.tipo === "warning"

      ? "lt-alert-banner--warning"

      : "lt-alert-banner--error";



  const handleCamionCreado = async (nuevoCamion) => {

    setMostrarFormulario(false);

    setMensaje({ tipo: "success", texto: "Camión agregado correctamente." });

    await cargarCamiones();

    if (nuevoCamion?.id) {

      setCamionDetalle(nuevoCamion);

    }

  };



  const handleCamionActualizado = async (actualizado) => {

    await cargarCamiones();

    if (actualizado?.id) {

      setCamionDetalle((prev) =>

        prev?.id === actualizado.id ? actualizado : prev,

      );

    }

  };



  return (

    <>

      <div className="lt-card lt-module-card">

        <div className="lt-card__body">

          <div

            style={{

              display: "flex",

              flexWrap: "wrap",

              alignItems: "center",

              justifyContent: "space-between",

              gap: 12,

              marginBottom: 12,

            }}

          >

            <h3 className="lt-module-card__title" style={{ margin: 0 }}>

              Camiones activos ({camionesVisibles.length}

              {hayFiltroActivo ? ` de ${camiones.length}` : ""})

            </h3>

            {puedeAgregar && (

              <button

                type="button"

                className="lt-btn lt-btn--primary"

                onClick={() => setMostrarFormulario(true)}

              >

                <Plus size={14} />

                Agregar camión

              </button>

            )}

          </div>



          <div className="lt-toolbar" style={{ marginBottom: 16, flexWrap: "wrap" }}>

            <div className="lt-search-wrap" style={{ flex: 1, minWidth: 220, maxWidth: 420 }}>

              <Search size={14} className="lt-search-icon" />

              <input

                type="text"

                className="lt-input"

                placeholder="Buscar por patente..."

                value={busqueda}

                onChange={(e) => setBusqueda(e.target.value)}

                aria-label="Buscar camiones por patente"

              />

            </div>

            <select

              className="lt-select"

              value={filtroEstado}

              onChange={(e) => setFiltroEstado(e.target.value)}

              aria-label="Filtrar camiones por estado"

              style={{ minWidth: 160 }}

            >

              {OPCIONES_FILTRO.map((op) => (

                <option key={op.value} value={op.value}>

                  {op.label}

                </option>

              ))}

            </select>

            <select

              className="lt-select"

              value={orden}

              onChange={(e) => setOrden(e.target.value)}

              aria-label="Ordenar camiones"

              style={{ minWidth: 220 }}

            >

              {OPCIONES_ORDEN.map((op) => (

                <option key={op.value} value={op.value}>

                  {op.label}

                </option>

              ))}

            </select>

          </div>



          {mensaje.texto && (

            <div className={`lt-alert-banner ${alertClass}`} role="alert">

              {mensaje.texto}

            </div>

          )}



          {cargando ? (

            <p className="lt-empty">Cargando camiones...</p>

          ) : camiones.length === 0 ? (

            <div className="lt-alert-banner lt-alert-banner--warning">

              No hay camiones activos

            </div>

          ) : camionesVisibles.length === 0 ? (

            <EmptyState

              title="Sin resultados"

              description="No hay camiones que coincidan con la búsqueda o el filtro seleccionado."

            />

          ) : (

            <div className="lt-table-wrap">

              <table className="lt-table">

                <thead>

                  <tr>

                    <th>Patente</th>

                    <th>Capacidad (slots)</th>

                    <th>Estado</th>

                    <th>Próxima revisión técnica</th>

                    <th>Días restantes</th>

                    <th>Estado revisión</th>

                    <th>Acciones</th>

                  </tr>

                </thead>

                <tbody>

                  {camionesVisibles.map((camion) => {

                    const proximaMantencion = resolveProximaMantencion(camion);

                    const revision = obtenerEstadoRevision(proximaMantencion);

                    const diasRestantes = calcularDiasRestantesRevision(proximaMantencion);

                    const estadoBadge = estadoCamionBadge(camion.estado);



                    return (

                      <tr key={camion.id}>

                        <td>{camion.patente || "—"}</td>

                        <td><OccupancyBar slotsTotales={camion.slots} slotsUtilizados={camion.slots_utilizados} /><div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>Talla: {camion.talla || "DESCONOCIDO"}</div></td>

                        <td>

                          <Badge variant={estadoBadge.variant} showDot={false}>

                            {estadoBadge.texto}

                          </Badge>

                        </td>

                        <td>{formatFechaCamion(proximaMantencion)}</td>

                        <td>{formatDiasRestantesText(diasRestantes)}</td>

                        <td>

                          <Badge variant={revision.variant} showDot={false}>

                            {revision.texto}

                          </Badge>

                        </td>

                        <td>

                          <button

                            type="button"

                            className="lt-btn lt-btn--ghost"

                            onClick={() => setCamionDetalle(camion)}

                          >

                            <Eye size={14} />

                            Ver detalle

                          </button>

                        </td>

                      </tr>

                    );

                  })}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>



      {camionDetalle && (

        <DetalleCamionModal

          camion={camionDetalle}

          operator={operator}

          onClose={() => setCamionDetalle(null)}

          onCamionActualizado={handleCamionActualizado}

        />

      )}



      {mostrarFormulario && (

        <FormularioCamion

          mode="create"

          onCancel={() => setMostrarFormulario(false)}

          onGuardado={handleCamionCreado}

        />

      )}

    </>

  );

}


