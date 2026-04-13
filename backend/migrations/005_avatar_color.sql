-- ============================================================
-- MIGRATION 005 — Avatar color for users
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20) DEFAULT '#2563eb';
