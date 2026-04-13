-- ============================================================
-- MIGRATION 002 — ElUltimoTimbraso
-- Nuevas columnas para: foto_evidencia_final en rutas,
-- foto_evidencia en paquetes (soporte base64),
-- índice en puntos_parada para búsqueda por punto_parada_id
-- ============================================================

-- Foto de cierre de ruta (tomada por el operador al finalizar)
ALTER TABLE rutas
  ADD COLUMN IF NOT EXISTS foto_evidencia_final TEXT;

-- Asegurarse que foto_evidencia en puntos_parada soporte base64 largo
-- (TEXT ya lo soporta, solo verificar que exista la columna)
ALTER TABLE puntos_parada
  ADD COLUMN IF NOT EXISTS foto_evidencia TEXT;

-- Índice para búsqueda de paquetes por punto_parada_id
CREATE INDEX IF NOT EXISTS idx_paquetes_punto_parada_id
  ON paquetes(punto_parada_id);

-- Índice para notificaciones por user
CREATE INDEX IF NOT EXISTS idx_notificaciones_user_id
  ON notificaciones(user_id, leida);
