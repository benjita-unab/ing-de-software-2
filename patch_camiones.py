import re

with open('frontend/src/components/CamionesFlota.jsx', 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()
content = '\n'.join(lines)

# Add Pagination import
if 'import Pagination from "./ui/Pagination";' not in content:
    content = content.replace(
        'import FormularioCamion from "./FormularioCamion";',
        'import FormularioCamion from "./FormularioCamion";\nimport Pagination from "./ui/Pagination";'
    )

old_state = '''  const [busqueda, setBusqueda] = useState("");
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

  const hayFiltroActivo = busqueda.trim() || filtroEstado !== FILTRO_ESTADO_TODOS;'''

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

content = content.replace(old_state, new_state)

content = content.replace('camionesVisibles.length', '(meta?.total_items ?? camiones.length)')
content = content.replace('camionesVisibles.map', 'camiones.map')

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

with open('frontend/src/components/CamionesFlota.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
