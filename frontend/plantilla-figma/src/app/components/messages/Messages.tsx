import { useState } from "react";
import { Search, Send, Phone, MoreHorizontal, Truck, CheckCheck, Check, Circle, Plus } from "lucide-react";

const conversations = [
  {
    id: "conv-1",
    name: "Carlos Mendez",
    role: "Conductor · V-01",
    avatar: "CM",
    status: "en_linea",
    lastMessage: "Llegando a Valparaíso, estacionamiento disponible ✓",
    time: "14:28",
    unread: 0,
    route: "RUT-2831",
    messages: [
      { id: 1, from: "driver", text: "Buenos días, saliendo del hub con carga completa (24 bultos)", time: "08:12", read: true },
      { id: 2, from: "ops", text: "Perfecto Carlos, confirma cuando llegues a la primera parada. Ruta despejada según GPS.", time: "08:14", read: true },
      { id: 3, from: "driver", text: "Pasando por el control de autopista. Todo normal.", time: "10:35", read: true },
      { id: 4, from: "driver", text: "Parada de descanso en Casablanca, 20 min", time: "12:10", read: true },
      { id: 5, from: "ops", text: "Ok, registrado. Avisa cuando retomes.", time: "12:11", read: true },
      { id: 6, from: "driver", text: "Retomando ruta. Tráfico fluido por la autopista.", time: "12:32", read: true },
      { id: 7, from: "driver", text: "Llegando a Valparaíso, estacionamiento disponible ✓", time: "14:28", read: false },
    ],
  },
  {
    id: "conv-2",
    name: "Pedro López",
    role: "Conductor · V-03",
    avatar: "PL",
    status: "alerta",
    lastMessage: "Vehículo detenido, esperando asistencia técnica",
    time: "13:41",
    unread: 2,
    route: "RUT-2833",
    messages: [
      { id: 1, from: "driver", text: "Buenos días, saliendo con mercadería industrial", time: "07:30", read: true },
      { id: 2, from: "ops", text: "Buen día Pedro. Tienes la ruta cargada en la app.", time: "07:32", read: true },
      { id: 3, from: "driver", text: "El vehículo ha hecho un sonido extraño en el motor. Parando a revisar.", time: "12:55", read: true },
      { id: 4, from: "ops", text: "¿Todo bien? Avisa la situación para coordinar.", time: "12:57", read: true },
      { id: 5, from: "driver", text: "Falla en sistema de enfriamiento. Llamando al taller.", time: "13:15", read: true },
      { id: 6, from: "driver", text: "Vehículo detenido, esperando asistencia técnica", time: "13:41", read: false },
      { id: 7, from: "driver", text: "ETA asistencia: 45 minutos aprox.", time: "13:43", read: false },
    ],
  },
  {
    id: "conv-3",
    name: "Ana Rodriguez",
    role: "Conductora · V-02",
    avatar: "AR",
    status: "en_linea",
    lastMessage: "Confirmo recepción en cliente, firmaron guía",
    time: "13:05",
    unread: 0,
    route: "RUT-2832",
    messages: [
      { id: 1, from: "driver", text: "Cargado, revisé todos los bultos. Saliendo.", time: "09:00", read: true },
      { id: 2, from: "ops", text: "Perfecto Ana. Recuerda que el cliente en Rancagua pide confirmación de llegada 30 min antes.", time: "09:02", read: true },
      { id: 3, from: "driver", text: "Llegando en 25 min, aviso al cliente.", time: "12:45", read: true },
      { id: 4, from: "driver", text: "Confirmo recepción en cliente, firmaron guía", time: "13:05", read: true },
    ],
  },
  {
    id: "conv-4",
    name: "Martina Vidal",
    role: "Conductora · V-04",
    avatar: "MV",
    status: "en_linea",
    lastMessage: "Todo bien, en ruta a Concepción",
    time: "11:22",
    unread: 0,
    route: "RUT-2834",
    messages: [
      { id: 1, from: "driver", text: "Saliendo al sur. Carga completa.", time: "06:45", read: true },
      { id: 2, from: "ops", text: "Ok Martina. Es ruta larga, ojo con los descansos obligatorios. Tienes parada programada en Curicó.", time: "06:47", read: true },
      { id: 3, from: "driver", text: "Entendido. Parada en Curicó confirmada.", time: "06:48", read: true },
      { id: 4, from: "driver", text: "Todo bien, en ruta a Concepción", time: "11:22", read: true },
    ],
  },
  {
    id: "conv-5",
    name: "Diego Salinas",
    role: "Conductor · V-05",
    avatar: "DS",
    status: "en_linea",
    lastMessage: "Parada de descanso en Rancagua, 30 min",
    time: "10:48",
    unread: 0,
    route: "RUT-2829",
    messages: [
      { id: 1, from: "driver", text: "Buenos días, carga farmacéutica lista. Temperatura OK.", time: "08:15", read: true },
      { id: 2, from: "ops", text: "Perfecto Diego. Mantén temperatura entre 2-8°C como indica el protocolo.", time: "08:17", read: true },
      { id: 3, from: "driver", text: "Parada de descanso en Rancagua, 30 min", time: "10:48", read: true },
    ],
  },
];

const statusColors = {
  en_linea: "#34D399",
  alerta: "#EF4444",
  desconectado: "#9B9BB4",
};

export function Messages() {
  const [activeConv, setActiveConv] = useState("conv-2");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  const filtered = conversations.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const current = conversations.find(c => c.id === activeConv);

  const handleSend = () => {
    if (!input.trim()) return;
    setInput("");
  };

  return (
    <div style={{ height: "100%", display: "flex", background: "#fff", fontFamily: "Inter, sans-serif" }}>
      {/* Left: conversation list */}
      <div style={{ width: 320, borderRight: "1px solid #EEEEF3", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid #EEEEF3" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: 17, color: "#0F0F1A", letterSpacing: "-0.3px" }}>Mensajes</h2>
            <button style={{
              width: 30, height: 30, borderRadius: 8, background: "#7C6CF6", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              boxShadow: "0 2px 6px rgba(124,108,246,0.3)",
            }}>
              <Plus size={14} color="#fff" />
            </button>
          </div>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9BB4" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversación..."
              style={{
                width: "100%", paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                borderRadius: 8, border: "1px solid #EEEEF3", fontSize: 12, color: "#0F0F1A",
                fontFamily: "Inter, sans-serif", background: "#F7F8FC", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.map(conv => (
            <div
              key={conv.id}
              onClick={() => setActiveConv(conv.id)}
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #F5F5FA",
                cursor: "pointer",
                background: activeConv === conv.id ? "#F7F6FF" : "#fff",
                borderLeft: activeConv === conv.id ? "3px solid #7C6CF6" : "3px solid transparent",
                transition: "all 0.1s",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: conv.status === "alerta" ? "#FEF2F2" : "linear-gradient(135deg, #7C6CF6, #A593FF)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: conv.status === "alerta" ? "2px solid #FCA5A5" : "none",
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: conv.status === "alerta" ? "#EF4444" : "#fff" }}>
                      {conv.avatar}
                    </span>
                  </div>
                  <div style={{
                    position: "absolute", bottom: -1, right: -1,
                    width: 10, height: 10, borderRadius: "50%",
                    background: statusColors[conv.status as keyof typeof statusColors],
                    border: "2px solid #fff",
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#0F0F1A" }}>{conv.name}</span>
                    <span style={{ fontSize: 10, color: "#9B9BB4", flexShrink: 0, marginLeft: 6 }}>{conv.time}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#9B9BB4", marginBottom: 4 }}>{conv.role}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#9B9BB4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                      {conv.lastMessage}
                    </span>
                    {conv.unread > 0 && (
                      <span style={{
                        width: 18, height: 18, borderRadius: "50%", background: "#EF4444",
                        color: "#fff", fontSize: 9, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: chat area */}
      {current ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Chat header */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #EEEEF3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: current.status === "alerta" ? "#FEF2F2" : "linear-gradient(135deg, #7C6CF6, #A593FF)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: current.status === "alerta" ? "2px solid #FCA5A5" : "none",
                }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: current.status === "alerta" ? "#EF4444" : "#fff" }}>
                    {current.avatar}
                  </span>
                </div>
                <div style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 10, height: 10, borderRadius: "50%",
                  background: statusColors[current.status as keyof typeof statusColors],
                  border: "2px solid #fff",
                }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#0F0F1A" }}>{current.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9B9BB4" }}>
                  <Truck size={10} />
                  {current.role} · {current.route}
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColors[current.status as keyof typeof statusColors], display: "inline-block" }} />
                  {current.status === "en_linea" ? "En línea" : current.status === "alerta" ? "⚠ Alerta activa" : "Desconectado"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #EEEEF3", background: "#fff", fontSize: 12, color: "#5A5A7A", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "Inter, sans-serif" }}>
                <Phone size={13} />
                Llamar
              </button>
              <button style={{ padding: "7px", borderRadius: 8, border: "1px solid #EEEEF3", background: "#fff", cursor: "pointer" }}>
                <MoreHorizontal size={16} color="#9B9BB4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 12, background: "#F7F8FC" }}>
            {current.messages.map(msg => {
              const isOps = msg.from === "ops";
              return (
                <div
                  key={msg.id}
                  style={{ display: "flex", justifyContent: isOps ? "flex-end" : "flex-start" }}
                >
                  {!isOps && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, background: current.status === "alerta" ? "#FEF2F2" : "linear-gradient(135deg, #7C6CF6, #A593FF)",
                      display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0, alignSelf: "flex-end",
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: current.status === "alerta" ? "#EF4444" : "#fff" }}>{current.avatar}</span>
                    </div>
                  )}
                  <div style={{ maxWidth: "65%" }}>
                    <div style={{
                      padding: "10px 14px", borderRadius: isOps ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: isOps ? "#7C6CF6" : "#fff",
                      border: isOps ? "none" : "1px solid #EEEEF3",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}>
                      <p style={{ margin: 0, fontSize: 13, color: isOps ? "#fff" : "#0F0F1A", lineHeight: 1.5 }}>{msg.text}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, justifyContent: isOps ? "flex-end" : "flex-start" }}>
                      <span style={{ fontSize: 10, color: "#9B9BB4" }}>{msg.time}</span>
                      {isOps && <CheckCheck size={11} color={msg.read ? "#7C6CF6" : "#9B9BB4"} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div style={{ padding: "16px 24px", borderTop: "1px solid #EEEEF3", background: "#fff" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1, background: "#F7F8FC", borderRadius: 12, border: "1px solid #EEEEF3", padding: "10px 14px" }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder="Escribe un mensaje al conductor..."
                  style={{
                    width: "100%", border: "none", background: "transparent", outline: "none",
                    fontSize: 13, color: "#0F0F1A", fontFamily: "Inter, sans-serif",
                  }}
                />
              </div>
              <button
                onClick={handleSend}
                style={{
                  width: 42, height: 42, borderRadius: 10, background: "#7C6CF6", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(124,108,246,0.3)", flexShrink: 0,
                }}
              >
                <Send size={16} color="#fff" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9B9BB4", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 32 }}>💬</div>
          <span style={{ fontSize: 13 }}>Selecciona una conversación</span>
        </div>
      )}
    </div>
  );
}
