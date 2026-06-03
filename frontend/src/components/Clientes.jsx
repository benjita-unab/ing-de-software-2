import React, { useState, useEffect } from "react";
import { getClientes, getHistorialDespachos } from "../lib/clientesService";
import FormularioCliente from "./FormularioCliente";
import PagosCliente from "./PagosCliente";

const styles = {
  container: {
    padding: "20px",
    color: "#fff",
    fontFamily: "'Inter', 'Poppins', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
  },
  searchInput: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(15,23,42,0.65)",
    color: "#fff",
    width: "300px",
    outline: "none",
  },
  buttonPrimary: {
    padding: "10px 16px",
    background: "#0EA5E9",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  buttonSecondary: {
    padding: "8px 12px",
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
  },
  accordionItem: {
    background: "rgba(15,23,42,0.65)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    marginBottom: "10px",
    overflow: "hidden",
  },
  accordionHeader: {
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    background: "rgba(8,8,12,0.4)",
  },
  accordionContent: {
    padding: "20px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
  },
  clientInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "14px",
    color: "#cbd5e1"
  },
  historyTable: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "16px",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    padding: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.2)",
    color: "#94a3b8",
  },
  td: {
    padding: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  badge: (estado) => {
    let bg = "#334155";
    if (estado === "entregado" || estado === "completado") bg = "#166534";
    if (estado === "pendiente" || estado === "en_ruta") bg = "#b45309";
    return {
      padding: "4px 8px",
      borderRadius: "12px",
      fontSize: "11px",
      background: bg,
      color: "#fff",
      textTransform: "capitalize"
    };
  }
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialData, setHistorialData] = useState({});
  const [tabActiva, setTabActiva] = useState({});

  const [modoFormulario, setModoFormulario] = useState(false); // true: creacion o edicion
  const [clienteEditando, setClienteEditando] = useState(null);

  const fetchClientes = async (query = "") => {
    try {
      setLoading(true);
      const data = await getClientes(query);
      setClientes(data);
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

  const toggleAccordion = async (cliente) => {
    const id = cliente.id;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    
    if (!historialData[id]) {
      try {
        setHistorialLoading(true);
        const data = await getHistorialDespachos(id);
        setHistorialData(prev => ({ ...prev, [id]: data }));
      } catch (err) {
        console.error("Error cargando historial", err);
      } finally {
        setHistorialLoading(false);
      }
    }
  };

  const handleNuevoCliente = () => {
    setClienteEditando(null);
    setModoFormulario(true);
  };

  const handleEditar = (e, cliente) => {
    e.stopPropagation();
    setClienteEditando(cliente);
    setModoFormulario(true);
  };

  const handleFormularioGuardado = () => {
    setModoFormulario(false);
    fetchClientes(search);
  };

  if (modoFormulario) {
    return (
      <div style={styles.container}>
        <FormularioCliente 
          clienteInicial={clienteEditando} 
          onGuardado={handleFormularioGuardado} 
          onCancel={() => setModoFormulario(false)}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Clientes B2B</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <input 
            type="text" 
            placeholder="Buscar por nombre, RUT o contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <button style={styles.buttonPrimary} onClick={handleNuevoCliente}>
            + Nuevo Cliente
          </button>
        </div>
      </div>

      {loading ? (
        <p>Cargando clientes...</p>
      ) : clientes.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>No se encontraron clientes.</p>
      ) : (
        <div>
          {clientes.map(cliente => (
            <div key={cliente.id} style={styles.accordionItem}>
              <div style={styles.accordionHeader} onClick={() => toggleAccordion(cliente)}>
                <div style={{ flex: 1 }}>
                  <strong>{cliente.nombre}</strong> <span style={{ color: "#94a3b8", marginLeft: "10px" }}>{cliente.rut}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                    {expandedId === cliente.id ? "Ocultar Detalles ▲" : "Ver Detalles ▼"}
                  </span>
                </div>
              </div>

              {expandedId === cliente.id && (
                <div style={styles.accordionContent}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={styles.clientInfo}>
                      <div><strong style={{ color: '#fff' }}>Dirección:</strong> {cliente.direccion || "N/A"}</div>
                      <div><strong style={{ color: '#fff' }}>Contacto:</strong> {cliente.contacto_nombre || "N/A"} - {cliente.contacto_telefono || "N/A"}</div>
                      <div><strong style={{ color: '#fff' }}>Email:</strong> {cliente.contacto_email || "N/A"}</div>
                    </div>
                    <button style={styles.buttonSecondary} onClick={(e) => handleEditar(e, cliente)}>
                      ✏️ Editar Cliente
                    </button>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '20px 0' }} />
                  
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <button 
                      style={(!tabActiva[cliente.id] || tabActiva[cliente.id] === 'despachos') ? styles.buttonPrimary : styles.buttonSecondary}
                      onClick={() => setTabActiva({ ...tabActiva, [cliente.id]: 'despachos' })}
                    >
                      Historial de Despachos
                    </button>
                    <button 
                      style={tabActiva[cliente.id] === 'pagos' ? styles.buttonPrimary : styles.buttonSecondary}
                      onClick={() => setTabActiva({ ...tabActiva, [cliente.id]: 'pagos' })}
                    >
                      Pagos
                    </button>
                  </div>

                  {(!tabActiva[cliente.id] || tabActiva[cliente.id] === 'despachos') && (
                    <>
                      {historialLoading && !historialData[cliente.id] ? (
                        <p style={{ fontSize: '13px', color: '#94a3b8' }}>Cargando historial...</p>
                      ) : (!historialData[cliente.id] || historialData[cliente.id].length === 0) ? (
                        <p style={{ fontSize: '13px', color: '#94a3b8' }}>No hay despachos registrados para este cliente.</p>
                      ) : (
                        <table style={styles.historyTable}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Fecha</th>
                          <th style={styles.th}>Dirección / Ruta</th>
                          <th style={styles.th}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historialData[cliente.id].map(hist => (
                          <tr key={hist.id}>
                            <td style={styles.td}>
                              {new Date(hist.created_at).toLocaleDateString("es-CL")}
                            </td>
                            <td style={styles.td}>
                              {hist.destino || `Ruta ${hist.id}`}
                            </td>
                            <td style={styles.td}>
                              <span style={styles.badge(hist.estado)}>
                                {hist.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                    </>
                  )}

                  {tabActiva[cliente.id] === 'pagos' && (
                    <PagosCliente clienteId={cliente.id} />
                  )}

                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}