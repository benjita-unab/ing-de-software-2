import re

# CAMIONES
with open('frontend/src/components/CamionesFlota.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('import FormularioCamion from "./FormularioCamion";', 'import FormularioCamion from "./FormularioCamion";\nimport Pagination from "./ui/Pagination";')

state_pattern = re.compile(r'const \[busqueda, setBusqueda\] = useState\(""\);.*?const hayFiltroActivo = busqueda\.trim\(\) \|\| filtroEstado !== FILTRO_ESTADO_TODOS;', re.DOTALL)
new_state = '''  const [busqueda, setBusqueda] = useState("");
  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState(FILTRO_ESTADO_TODOS);
  const [orden, setOrden] = useState(ORDEN_CAMIONES.PATENTE_ASC);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState(null);
  const puedeAgregar = puedeGestionarCamiones(operator?.role);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBusqueda(busqueda), 400);
    return () => clearTimeout(timer);
  }, [busqueda]);
  useEffect(() => {
    setPage(1);
  }, [debouncedBusqueda, filtroEstado, orden, limit]);
  const cargarCamiones = useCallback(async () => {
    setCargando(true);
    const res = await obtenerCamiones({
      page,
      limit,
      search: debouncedBusqueda,
      estado: filtroEstado,
      orden,
    });
    if (res.error) {
      setMensaje({ tipo: "error", texto: `Error cargando camiones: ${res.error}` });
      setCamiones([]);
      setMeta(null);
    } else {
      setCamiones(res.data || []);
      setMeta(res.meta || null);
    }
    setCargando(false);
  }, [page, limit, debouncedBusqueda, filtroEstado, orden]);
  useEffect(() => {
    cargarCamiones();
  }, [cargarCamiones]);
  const hayFiltroActivo = debouncedBusqueda.trim() || filtroEstado !== FILTRO_ESTADO_TODOS;'''
text = state_pattern.sub(new_state, text)

text = text.replace('camionesVisibles.length', '(meta?.total_items ?? camiones.length)')
text = text.replace('camionesVisibles.map', 'camiones.map')

table_pattern = re.compile(r'</table>\s*</div>', re.DOTALL)
new_table = '''</table>
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
text = table_pattern.sub(new_table, text, count=1)

with open('frontend/src/components/CamionesFlota.jsx', 'w', encoding='utf-8') as f:
    f.write(text)


# CHOFERES
with open('frontend/src/components/ChoferesFlota.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('import EmptyState from "./ui/EmptyState";', 'import EmptyState from "./ui/EmptyState";\nimport Pagination from "./ui/Pagination";')

state_pattern_chof = re.compile(r'const \[conductores, setConductores\] = useState\(\[\]\);.*?const nombreDependeDeApi = conductores\.length > 0\s*&& conductores\.every\(\(c\) => !c\.nombre && !c\.usuarios\?\.nombre\);', re.DOTALL)
new_state_chof = '''  const [conductores, setConductores] = useState([]);
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
  const nombreDependeDeApi = conductores.length > 0 && conductores.every((c) => !c.nombre && !c.usuarios?.nombre);'''

text = state_pattern_chof.sub(new_state_chof, text)

text = text.replace('conductoresVisibles.length', '(meta?.total_items ?? conductores.length)')
text = text.replace('conductoresVisibles.length === 0', 'conductores.length === 0')
text = text.replace('conductoresVisibles.map', 'conductores.map')

text = table_pattern.sub(new_table, text, count=1)

with open('frontend/src/components/ChoferesFlota.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
