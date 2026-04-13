-- ============================================================
-- MIGRACIÓN 002: Corresponsales, solicitudes de recogida,
--                foto evidencia en paquetes, mejoras generales
-- ============================================================

-- TABLA: corresponsales (puntos físicos de entrega/recogida)
CREATE TABLE IF NOT EXISTS corresponsales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(150) NOT NULL,
  direccion TEXT NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  telefono VARCHAR(20),
  horario VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA: solicitudes_recogida (el cliente pide recogida a domicilio)
CREATE TABLE IF NOT EXISTS solicitudes_recogida (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('domicilio', 'corresponsal')),
  corresponsal_id UUID REFERENCES corresponsales(id) ON DELETE SET NULL,
  direccion_recogida TEXT,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  descripcion TEXT NOT NULL,
  peso_estimado DECIMAL(8,2) DEFAULT 1.0,
  costo DECIMAL(10,2) DEFAULT 5000,
  estado VARCHAR(30) DEFAULT 'pendiente' CHECK (estado IN (
    'pendiente', 'confirmada', 'asignada', 'recogida', 'en_bodega', 'cancelada'
  )),
  notas TEXT,
  ciclo_id UUID REFERENCES ciclos_recoleccion(id),
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar foto_evidencia y admin_registrado a paquetes si no existe
ALTER TABLE paquetes ADD COLUMN IF NOT EXISTS foto_evidencia TEXT;
ALTER TABLE paquetes ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES users(id);
ALTER TABLE paquetes ADD COLUMN IF NOT EXISTS tipo_ingreso VARCHAR(20) DEFAULT 'admin' 
  CHECK (tipo_ingreso IN ('admin', 'corresponsal', 'domicilio'));

-- Índices
CREATE INDEX IF NOT EXISTS idx_corresponsales_ciudad ON corresponsales(ciudad);
CREATE INDEX IF NOT EXISTS idx_solicitudes_cliente ON solicitudes_recogida(cliente_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_recogida(estado);

-- Trigger para actualizado_en en solicitudes
CREATE TRIGGER trg_solicitudes_updated
  BEFORE UPDATE ON solicitudes_recogida
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Corresponsales de ejemplo para Ibagué, Tolima
INSERT INTO corresponsales (nombre, direccion, ciudad, lat, lng, telefono, horario) VALUES
  ('Corresponsal Centro Ibagué',
   'Carrera 3 # 10-42, Centro Histórico',
   'Ibagué', 4.4378, -75.2012,
   '3001234567', 'Lun-Sáb 8am-6pm'),
  ('Corresponsal El Jardín',
   'Calle 60 # 5-23, Barrio El Jardín',
   'Ibagué', 4.4512, -75.1890,
   '3019876543', 'Lun-Sáb 8am-7pm'),
  ('Corresponsal Ambala',
   'Av. Ambala # 14-55, Barrio Ambala',
   'Ibagué', 4.4201, -75.2134,
   '3157654321', 'Lun-Dom 7am-8pm')
ON CONFLICT DO NOTHING;
