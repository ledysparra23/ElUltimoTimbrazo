-- ============================================================
-- MIGRATION 004 — OTP settings, foto_evidencia_final, paquete ruta
-- Run this in Supabase SQL Editor AFTER migrations 001, 002, 003
-- ============================================================

-- User 2FA preference
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS otp_enabled BOOLEAN DEFAULT TRUE;

-- Foto de cierre de ruta (ya en 002 pero por si acaso)
ALTER TABLE rutas
  ADD COLUMN IF NOT EXISTS foto_evidencia_final TEXT;

-- Paquetes: add registrado_por and tipo_ingreso if missing
ALTER TABLE paquetes
  ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS tipo_ingreso VARCHAR(20) DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS notas TEXT,
  ADD COLUMN IF NOT EXISTS foto_evidencia TEXT;

-- Solicitudes: asignacion columns (already in 003, safe to repeat)
ALTER TABLE solicitudes_recogida
  ADD COLUMN IF NOT EXISTS operador_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notas_admin TEXT,
  ADD COLUMN IF NOT EXISTS asignada_en TIMESTAMPTZ;

-- Index on otp_enabled for faster auth queries
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, activo);
CREATE INDEX IF NOT EXISTS idx_solicitudes_operador ON solicitudes_recogida(operador_id) WHERE operador_id IS NOT NULL;
