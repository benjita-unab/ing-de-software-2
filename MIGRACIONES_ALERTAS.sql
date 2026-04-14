-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRACIONES SQL PARA SISTEMA DE MONITOREO DE LICENCIAS
-- Logitrack - Sistema de Gestión Logística
-- ─────────────────────────────────────────────────────────────────────────────
-- Estos scripts deben ejecutarse en la consola SQL de Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. TABLA: alertas_sistema
-- ═══════════════════════════════════════════════════════════════════════════════
-- Tabla principal para almacenar todas las alertas del sistema

CREATE TABLE IF NOT EXISTS alertas_sistema (
  -- Identificadores
  id BIGSERIAL PRIMARY KEY,
  
  -- Información de la alerta
  tipo VARCHAR(50) NOT NULL,
    -- Valores: "vencimiento_licencia", "vencimiento_revision_tecnica"
  prioridad VARCHAR(20) NOT NULL DEFAULT 'Normal',
    -- Valores: "Crítica", "Alta", "Normal", "Baja"
  descripcion TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'No leída',
    -- Valores: "No leída", "Leída"
  
  -- Referencias a entidades
  entidad_id BIGINT NOT NULL,
    -- ID del conductor o camión
  entidad_tipo VARCHAR(50) NOT NULL,
    -- Valores: "conductor", "camion"
  relacionado_id BIGINT,
    -- ID de la licencia o revisión técnica relacionada
  
  -- Timestamps
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_lectura TIMESTAMP,
  
  -- Índices para queries frecuentes
  CONSTRAINT valid_estado CHECK (estado IN ('No leída', 'Leída')),
  CONSTRAINT valid_prioridad CHECK (prioridad IN ('Crítica', 'Alta', 'Normal', 'Baja')),
  CONSTRAINT valid_entidad_tipo CHECK (entidad_tipo IN ('conductor', 'camion'))
);

-- Índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_alertas_estado 
  ON alertas_sistema(estado);

CREATE INDEX IF NOT EXISTS idx_alertas_entidad 
  ON alertas_sistema(entidad_id, entidad_tipo);

CREATE INDEX IF NOT EXISTS idx_alertas_tipo 
  ON alertas_sistema(tipo);

CREATE INDEX IF NOT EXISTS idx_alertas_prioridad 
  ON alertas_sistema(prioridad);

CREATE INDEX IF NOT EXISTS idx_alertas_fecha 
  ON alertas_sistema(fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_alertas_no_leidas 
  ON alertas_sistema(estado) WHERE estado = 'No leída';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. TABLA: licencias_conducir (si no existe)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Esta tabla debe contener información de licencias de conducción

CREATE TABLE IF NOT EXISTS licencias_conducir (
  id BIGSERIAL PRIMARY KEY,
  conductor_id BIGINT NOT NULL REFERENCES conductores(id) ON DELETE CASCADE,
  numero_licencia VARCHAR(50) UNIQUE NOT NULL,
  categoria VARCHAR(20),
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado VARCHAR(20) DEFAULT 'vigente',
    -- Valores: "vigente", "vencido", "suspendido", "cancelado"
  archivo_url TEXT,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_licencia_estado CHECK (estado IN ('vigente', 'vencido', 'suspendido', 'cancelado'))
);

CREATE INDEX IF NOT EXISTS idx_licencias_conductor 
  ON licencias_conducir(conductor_id);

CREATE INDEX IF NOT EXISTS idx_licencias_vencimiento 
  ON licencias_conducir(fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_licencias_estado 
  ON licencias_conducir(estado);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. TABLA: revisiones_tecnicas (si no existe)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Esta tabla debe contener información de revisiones técnicas de camiones

CREATE TABLE IF NOT EXISTS revisiones_tecnicas (
  id BIGSERIAL PRIMARY KEY,
  camion_id BIGINT NOT NULL REFERENCES camiones(id) ON DELETE CASCADE,
  numero_revision VARCHAR(50) UNIQUE NOT NULL,
  fecha_realizacion DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  organismo_revisor VARCHAR(100),
  resultado VARCHAR(20),
    -- Valores: "aprobado", "rechazado", "pendiente"
  estado VARCHAR(20) DEFAULT 'vigente',
    -- Valores: "vigente", "vencido", "suspendido"
  archivo_url TEXT,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_revision_resultado CHECK (resultado IN ('aprobado', 'rechazado', 'pendiente')),
  CONSTRAINT valid_revision_estado CHECK (estado IN ('vigente', 'vencido', 'suspendido'))
);

CREATE INDEX IF NOT EXISTS idx_revisiones_camion 
  ON revisiones_tecnicas(camion_id);

CREATE INDEX IF NOT EXISTS idx_revisiones_vencimiento 
  ON revisiones_tecnicas(fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_revisiones_estado 
  ON revisiones_tecnicas(estado);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. TRIGGERS PARA AUDITORÍA (Opcional)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Trigger para actualizar fecha_actualizacion en licencias_conducir
CREATE OR REPLACE FUNCTION update_licencias_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_licencias_timestamp
BEFORE UPDATE ON licencias_conducir
FOR EACH ROW
EXECUTE FUNCTION update_licencias_timestamp();

-- Trigger para actualizar fecha_actualizacion en revisiones_tecnicas
CREATE OR REPLACE FUNCTION update_revisiones_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_revisiones_timestamp
BEFORE UPDATE ON revisiones_tecnicas
FOR EACH ROW
EXECUTE FUNCTION update_revisiones_timestamp();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. CONSULTAS ÚTILES PARA MONITOREO
-- ═══════════════════════════════════════════════════════════════════════════════

-- Consulta: Licencias que vencen exactamente en 30 días
-- (Ejecutada por el cron job diariamente)
/*
SELECT 
  lc.id,
  lc.conductor_id,
  c.usuarios->>'nombre' as conductor_nombre,
  lc.numero_licencia,
  lc.fecha_vencimiento,
  (lc.fecha_vencimiento - CURRENT_DATE) as dias_restantes
FROM licencias_conducir lc
JOIN conductores c ON lc.conductor_id = c.id
WHERE lc.fecha_vencimiento = CURRENT_DATE + INTERVAL '30 days'
  AND lc.estado = 'vigente'
ORDER BY lc.fecha_vencimiento ASC;
*/

-- Consulta: Revisiones técnicas que vencen exactamente en 30 días
/*
SELECT 
  rt.id,
  rt.camion_id,
  f.patente,
  rt.numero_revision,
  rt.fecha_vencimiento,
  (rt.fecha_vencimiento - CURRENT_DATE) as dias_restantes
FROM revisiones_tecnicas rt
JOIN camiones f ON rt.camion_id = f.id
WHERE rt.fecha_vencimiento = CURRENT_DATE + INTERVAL '30 days'
  AND rt.estado = 'vigente'
ORDER BY rt.fecha_vencimiento ASC;
*/

-- Consulta: Alertas no leídas por prioridad
/*
SELECT 
  prioridad,
  COUNT(*) as cantidad
FROM alertas_sistema
WHERE estado = 'No leída'
GROUP BY prioridad
ORDER BY 
  CASE prioridad
    WHEN 'Crítica' THEN 1
    WHEN 'Alta' THEN 2
    WHEN 'Normal' THEN 3
    WHEN 'Baja' THEN 4
  END;
*/

-- Consulta: Estadísticas generales
/*
SELECT 
  COUNT(*) FILTER (WHERE estado = 'No leída') as no_leidas,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE prioridad = 'Alta') as alta_prioridad,
  COUNT(*) FILTER (WHERE prioridad = 'Crítica') as critica
FROM alertas_sistema;
*/

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. ROW LEVEL SECURITY (RLS) - Opcional para mayor seguridad
-- ═══════════════════════════════════════════════════════════════════════════════

-- Habilitar RLS en tabla de alertas
-- ALTER TABLE alertas_sistema ENABLE ROW LEVEL SECURITY;

-- Política para que solo los administradores puedan ver todas las alertas
-- CREATE POLICY "admin_view_all_alerts" ON alertas_sistema
-- FOR SELECT
-- USING (auth.jwt() ->> 'role' = 'admin');

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DE MIGRACIONES
-- ═════════════════════════════════════════════════════════════════════════════
