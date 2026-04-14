-- ============================================================
-- MIGRATION 006 — Add pendiente_confirmacion to paquetes estado
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop the old constraint and add the new one with pendiente_confirmacion
ALTER TABLE paquetes
  DROP CONSTRAINT IF EXISTS paquetes_estado_check;

ALTER TABLE paquetes
  ADD CONSTRAINT paquetes_estado_check
  CHECK (estado IN (
    'registrado', 'en_bodega', 'asignado_a_ruta',
    'en_transito', 'pendiente_confirmacion',
    'entregado', 'no_entregado', 'reagendado', 'devuelto'
  ));
