import re
import os

filepath = r'c:\Users\axels\Documents\GitHub\ing-de-software-2\frontend\src\components\ClientPortalShell.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace const styles with const getStyles
styles_def = """const getStyles = (isLight) => ({
  page: {
    minHeight: "100vh",
    background: isLight ? "#f8fafc" : "#0a0e1a",
    color: isLight ? "#0f172a" : "#e2e8f0",
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: "24px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "12px",
  },
  card: {
    padding: "16px",
    borderRadius: "12px",
    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.12)",
    background: isLight ? "#ffffff" : "rgba(15,23,42,0.85)",
    marginBottom: "12px",
    cursor: "pointer",
  },
  cardActive: {
    borderColor: "#0ea5e9",
  },
  badge: (estado) => ({
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    background:
      estado === "ENTREGADO"
        ? (isLight ? "#dcfce7" : "rgba(34,197,94,0.2)")
        : (isLight ? "#e0f2fe" : "rgba(14,165,233,0.2)"),
    color: estado === "ENTREGADO" ? (isLight ? "#166534" : "#86efac") : (isLight ? "#0369a1" : "#7dd3fc"),
  }),
  btn: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: isLight ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.2)",
    background: isLight ? "#ffffff" : "transparent",
    color: isLight ? "#334155" : "#fff",
    cursor: "pointer",
  },
  btnEvidencias: {
    marginTop: "16px",
    padding: "10px 16px",
    borderRadius: "8px",
    border: isLight ? "1px solid #93c5fd" : "1px solid rgba(59,130,246,0.45)",
    background: isLight ? "#eff6ff" : "rgba(59,130,246,0.18)",
    color: isLight ? "#1d4ed8" : "#93C5FD",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    fontFamily: "inherit",
  },
  detail: {
    marginTop: "20px",
    padding: "20px",
    borderRadius: "12px",
    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.12)",
    background: isLight ? "#ffffff" : "rgba(8,12,24,0.9)",
  },
  timelineItem: {
    padding: "8px 0",
    borderLeft: "2px solid #0ea5e9",
    paddingLeft: "12px",
    marginBottom: "8px",
    fontSize: "14px",
  },
  tabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  tab: (active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    borderRadius: "10px",
    border: active
      ? (isLight ? "1px solid #0ea5e9" : "1px solid rgba(14,165,233,0.65)")
      : (isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.12)"),
    background: active ? (isLight ? "#e0f2fe" : "rgba(14,165,233,0.18)") : (isLight ? "#f8fafc" : "rgba(15,23,42,0.6)"),
    color: active ? (isLight ? "#0284c7" : "#e0f2fe") : (isLight ? "#475569" : "rgba(226,232,240,0.85)"),
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: active ? 600 : 500,
    fontFamily: "inherit",
  }),
  tabCount: (variant) => ({
    display: "inline-block",
    minWidth: "22px",
    padding: "2px 8px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    textAlign: "center",
    background:
      variant === "completados"
        ? (isLight ? "#dcfce7" : "rgba(34,197,94,0.25)")
        : (isLight ? "#e0f2fe" : "rgba(14,165,233,0.25)"),
    color: variant === "completados" ? (isLight ? "#166534" : "#86efac") : (isLight ? "#0369a1" : "#7dd3fc"),
  }),
  emptyState: {
    textAlign: "center",
    padding: "48px 24px",
    borderRadius: "16px",
    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
    background: isLight ? "#ffffff" : "rgba(15,23,42,0.65)",
    maxWidth: "480px",
    margin: "24px auto 0",
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "16px",
    lineHeight: 1,
    opacity: 0.85,
  },
  emptyTitle: {
    margin: "0 0 10px",
    fontSize: "18px",
    fontWeight: 700,
    color: isLight ? "#0f172a" : "#f1f5f9",
  },
  emptyMessage: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.5,
    color: isLight ? "#64748b" : "#94a3b8",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    background: isLight ? "#ffffff" : "#0f172a",
    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "16px",
    padding: "24px",
    width: "100%",
    maxWidth: "600px",
    maxHeight: "90vh",
    overflowY: "auto",
    color: isLight ? "#0f172a" : "#e2e8f0",
  },
  input: {
    background: isLight ? "#f8fafc" : "rgba(255, 255, 255, 0.05)",
    border: isLight ? "1px solid #cbd5e1" : "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "8px",
    padding: "10px 12px",
    color: isLight ? "#0f172a" : "#fff",
    width: "100%",
    marginTop: "4px",
    fontSize: "14px",
  },
  bultoRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
    gap: "10px",
    alignItems: "end",
    marginBottom: "10px",
  },
});
/*_REMOVE_*/"""

c = c.replace("const styles = {", styles_def)

# regex remove original
c = re.sub(r'/\*_REMOVE_\*/.*?};\n\n/\*\*', '/**', c, flags=re.DOTALL)

# Propagate stylesObj
c = c.replace('function PortalPedidosEmptyState() {', 'function PortalPedidosEmptyState({ stylesObj }) {')
c = c.replace('<PortalPedidosEmptyState />', '<PortalPedidosEmptyState stylesObj={stylesObj} />')
c = c.replace('style={styles.', 'style={stylesObj.')
c = c.replace('...styles.', '...stylesObj.')
c = c.replace('styles.badge', 'stylesObj.badge')
c = c.replace('styles.tab(', 'stylesObj.tab(')
c = c.replace('styles.tabCount', 'stylesObj.tabCount')

state_str = '''
  const [isLight, setIsLight] = useState(false);
  const stylesObj = useMemo(() => getStyles(isLight), [isLight]);
'''
c = c.replace('export default function ClientPortalShell({ user, onSignOut }) {', 'export default function ClientPortalShell({ user, onSignOut }) {\\n' + state_str)

toggle_btn = '''
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={stylesObj.btn} onClick={() => setIsLight(!isLight)}>
            {isLight ? "🌙 Noche" : "☀️ Claro"}
          </button>
          <button style={stylesObj.btn} onClick={onSignOut}>
            Cerrar Sesión
          </button>
        </div>
'''
c = re.sub(r'<button style=\{stylesObj\.btn\} onClick=\{onSignOut\}>\s*Cerrar Sesión\s*</button>', toggle_btn, c)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print("SUCCESS")
