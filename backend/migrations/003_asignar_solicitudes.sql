-- ============================================================
-- MIGRATION 003 — Asignación de solicitudes a operadores
-- ============================================================

ALTER TABLE solicitudes_recogida
  ADD COLUMN IF NOT EXISTS operador_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notas_admin TEXT,
  ADD COLUMN IF NOT EXISTS asignada_en TIMESTAMPTZ;

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_solicitudes_operador_id
  ON solicitudes_recogida(operador_id);

CREATE INDEX IF NOT EXISTS idx_solicitudes_estado
  ON solicitudes_recogida(estado);
