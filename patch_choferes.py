import re

with open('frontend/src/components/ChoferesFlota.jsx', 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()
content = '\n'.join(lines)

if 'import Pagination from "./ui/Pagination";' not in content:
    content = content.replace(
        'import EmptyState from "./ui/EmptyState";',
        'import EmptyState from "./ui/EmptyState";\nimport Pagination from "./ui/Pagination";'
    )

old_state = '''  const [conductores, setConductores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [conductorDetalle, setConductorDetalle] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState(ORDEN_CHOFERES.NOMBRE_ASC);

  useEffect(() => {
    let cancelled = false;

    async function cargarConductores() {
      setCargando(true);
      const res = await obtenerConductoresActivos();
      if (cancelled) return;

      if (res.error) {
        setMensaje({ tipo: "error", texto: `Error cargando conductores: ${res.error}` });
        setConductores([]);
      } else {
        setConductores(res.data || []);
      }
      setCargando(false);
    }

    cargarConductores();
    return () => { cancelled = true; };
  }, []);

  const conductoresVisibles = useMemo(
    () => filtrarYOrdenarConductores(conductores, busqueda, orden),
    [conductores, busqueda, orden],
  );

  const mostrarDisponibilidad = tieneDisponibilidad(conductores);
  const nombreDependeDeApi = conductores.length > 0
    && conductores.every((c) => !c.nombre && !c.usuarios?.nombre);'''

new_state = '''  const [conductores, setConductores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [conductorDetalle, setConductorDetalle] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");
  const [orden, setOrden] = useState(ORDEN_CHOFERES.NOMBRE_ASC);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBusqueda(busqueda), 400);
    return () => clearTimeout(timer);
  }, [busqueda]);

  useEffect(() => {
    setPage(1);
  }, [debouncedBusqueda, orden, limit]);

  useEffect(() => {
    let cancelled = false;

    async function cargarConductores() {
      setCargando(true);
      const res = await obtenerConductoresActivos({
        page,
        limit,
        search: debouncedBusqueda,
        orden,
      });
      if (cancelled) return;

      if (res.error) {
        setMensaje({ tipo: "error", texto: `Error cargando conductores: ${res.error}` });
        setConductores([]);
        setMeta(null);
      } else {
        setConductores(res.data || []);
        setMeta(res.meta || null);
      }
      setCargando(false);
    }

    cargarConductores();
    return () => { cancelled = true; };
  }, [page, limit, debouncedBusqueda, orden]);

  const mostrarDisponibilidad = tieneDisponibilidad(conductores);
  const nombreDependeDeApi = conductores.length > 0
    && conductores.every((c) => !c.nombre && !c.usuarios?.nombre);'''

content = content.replace(old_state, new_state)

content = content.replace('conductoresVisibles.length', '(meta?.total_items ?? conductores.length)')
content = content.replace('conductoresVisibles.length === 0', 'conductores.length === 0')
content = content.replace('conductoresVisibles.map', 'conductores.map')

old_table_end = '''              </table>
            </div>'''
new_table_end = '''              </table>
              {meta && (
                <Pagination
                  currentPage={meta.current_page}
                  totalPages={meta.total_pages}
                  totalItems={meta.total_items}
                  limit={meta.limit}
                  onPageChange={setPage}
                  onLimitChange={setLimit}
                />
              )}
            </div>'''
content = content.replace(old_table_end, new_table_end)

with open('frontend/src/components/ChoferesFlota.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
