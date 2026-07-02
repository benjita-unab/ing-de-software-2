/**
 * Algoritmo comercial histórico (rama calculo-paquetes).
 * Solo para simulador visual en CreadorCarga — no es fuente de verdad del backend.
 */

const SLOTS_POR_CATEGORIA = {
  XS: 1,
  S: 4,
  M: 12,
  L: 24,
  XL: 48,
  MAXIMO: 96,
};

const DESCUENTO_POR_CATEGORIA = {
  XS: 1.0,
  S: 0.95,
  M: 0.9,
  L: 0.85,
  XL: 0.8,
  MAXIMO: 0.75,
};

const IVA_TARIFA_CLIENTE = 0.19;

/** Port de OBTENER_TARIFA_POR_TRAMO (calculo-paquetes / CreadorCarga.jsx). */
export function obtenerTarifaPorTramo(categoria, km) {
  const bloques50km = Math.ceil(Number(km) / 50) || 1;
  const precioBasePorSlot = 1000 + bloques50km * 550;
  const cat = String(categoria || 'XS').toUpperCase();
  const slots = SLOTS_POR_CATEGORIA[cat] ?? SLOTS_POR_CATEGORIA.XS;
  const desc = DESCUENTO_POR_CATEGORIA[cat] ?? 1.0;
  return Math.round(precioBasePorSlot * slots * desc);
}

function descomponerSlotsEnCategorias(slotsParada) {
  let slotsToPrice = slotsParada;
  const countXL = Math.floor(slotsToPrice / 48);
  slotsToPrice %= 48;
  const countL = Math.floor(slotsToPrice / 24);
  slotsToPrice %= 24;
  const countM = Math.floor(slotsToPrice / 12);
  slotsToPrice %= 12;
  const countS = Math.floor(slotsToPrice / 4);
  slotsToPrice %= 4;
  const countXS = slotsToPrice;
  return { countXL, countL, countM, countS, countXS };
}

function calcularBilledDistanceKm(parada, idx, totalParadas, modoRetorno) {
  const fromPrev = Number(parada.distanceFromPrev ?? parada.distanceKm ?? 0);
  const toOrigin = Number(parada.distanceToOrigin ?? fromPrev);

  if (modoRetorno) {
    return Math.round(fromPrev);
  }

  const isLastParada = idx === totalParadas - 1;
  return Math.round(fromPrev + (isLastParada ? toOrigin : 0));
}

/**
 * Consolidación por parada + descomposición greedy (calculo-paquetes).
 * Equivalente a consolidarTarifaBultosHistorica() del backend histórico.
 * @returns {{ tarifaBaseTotal: number, breakdown: Array<{ cat: string, qty: number, parada: string, kmFacturado: number, subtotal: number }> }}
 */
export function consolidarTarifaBultosHistorica({
  paradas,
  bultos,
  modoRetorno = false,
}) {
  let tarifaBaseTotal = 0;
  const breakdown = [];

  (paradas || []).forEach((p, idx) => {
    const bultosParada = (bultos || []).filter((b) => b.paradaId === p.id);
    const slotsParada = bultosParada.reduce(
      (acc, b) => acc + (Number(b.slots) || 0),
      0,
    );
    if (slotsParada === 0) return;

    const { countXL, countL, countM, countS, countXS } =
      descomponerSlotsEnCategorias(slotsParada);
    const billedDistanceKm = calcularBilledDistanceKm(
      p,
      idx,
      paradas.length,
      modoRetorno,
    );
    const shortAddr = String(p.address || '').split(',')[0];

    const pushLine = (cat, qty) => {
      if (qty <= 0) return;
      const unit = obtenerTarifaPorTramo(cat, billedDistanceKm);
      const subtotal = qty * unit;
      tarifaBaseTotal += subtotal;
      breakdown.push({
        cat,
        qty,
        parada: shortAddr,
        kmFacturado: billedDistanceKm,
        subtotal,
      });
    };

    pushLine('XL', countXL);
    pushLine('L', countL);
    pushLine('M', countM);
    pushLine('S', countS);
    pushLine('XS', countXS);
  });

  return { tarifaBaseTotal, breakdown };
}

/** @deprecated Alias de compatibilidad — usar consolidarTarifaBultosHistorica */
export const calcularIngresosComercialHistorico = consolidarTarifaBultosHistorica;

const TARIFAS_CONDUCTOR_DEFAULT = {
  precioPorRuta: 5000,
  precioPorEntrega: 3000,
  precioPorBulto: 500,
  precioPorKm: 150,
};

/**
 * Simulador de rentabilidad completo (ingresos + costos + margen).
 */
export function calcularSimuladorRentabilidadHistorico({
  paradas = [],
  bultos = [],
  modoRetorno = false,
  distanciaLogisticaKm = 0,
  rendimientoCamion = 4.5,
  precioDiesel = 1498,
  tarifasConfig = {},
  costoTac = 0,
  isTarifaManual = false,
  tarifaManualTotal = 0,
}) {
  const cfg = { ...TARIFAS_CONDUCTOR_DEFAULT, ...tarifasConfig };
  const { tarifaBaseTotal: tarifaCalculadaBultos, breakdown } =
    consolidarTarifaBultosHistorica({ paradas, bultos, modoRetorno });

  const tarifaBaseTotal = isTarifaManual
    ? Number(tarifaManualTotal || 0)
    : tarifaCalculadaBultos;

  const costoCombustibleCalculado =
    distanciaLogisticaKm > 0 && rendimientoCamion > 0
      ? Math.round((distanciaLogisticaKm / rendimientoCamion) * precioDiesel)
      : 0;

  const pagoConductorAutomatico =
    paradas.length === 0
      ? 0
      : cfg.precioPorRuta +
        paradas.length * cfg.precioPorEntrega +
        bultos.reduce((acc, b) => acc + (b.slots || 0), 0) * cfg.precioPorBulto +
        distanciaLogisticaKm * cfg.precioPorKm;

  const costosOperativosTerceros =
    Number(costoTac || 0) + pagoConductorAutomatico;
  const totalCostosOperativos =
    (modoRetorno ? 0 : costoCombustibleCalculado) + costosOperativosTerceros;

  const iva = Math.round(tarifaBaseTotal * IVA_TARIFA_CLIENTE);
  const totalPagar = tarifaBaseTotal + iva;
  const margenGanancia = tarifaBaseTotal - totalCostosOperativos;

  return {
    tarifaBaseTotal,
    iva,
    totalPagar,
    breakdown,
    costoCombustibleCalculado,
    pagoConductorAutomatico,
    costosOperativosTerceros,
    totalCostosOperativos,
    margenGanancia,
  };
}
