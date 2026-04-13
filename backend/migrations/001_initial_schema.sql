-- ============================================================
-- SISTEMA DE RUTAS DE RECOLECCIÓN OPTIMIZADAS
-- Migration Script para Supabase
-- Equivalente a models.py de Django
-- ============================================================

-- EXTENSION: uuid
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: users (Auth base - Admin, Operador, Cliente)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'operador', 'cliente')),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: zonas (Zonas geográficas de recolección)
-- ============================================================
CREATE TABLE IF NOT EXISTS zonas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  poligono JSONB, -- Array de {lat, lng} que define el polígono de la zona
  activa BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: operadores (Perfil extendido del operador)
-- ============================================================
CREATE TABLE IF NOT EXISTS operadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zona_id UUID REFERENCES zonas(id) ON DELETE SET NULL,
  vehiculo_placa VARCHAR(20),
  vehiculo_tipo VARCHAR(50),
  capacidad_maxima INT DEFAULT 100, -- Unidades o kg según configuración
  lat_actual DECIMAL(10, 8),
  lng_actual DECIMAL(11, 8),
  ultima_ubicacion_en TIMESTAMPTZ,
  estado VARCHAR(20) DEFAULT 'disponible' CHECK (estado IN ('disponible', 'en_ruta', 'descanso', 'inactivo')),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: clientes (Perfil extendido del cliente)
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  telefono VARCHAR(20),
  direccion TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  zona_id UUID REFERENCES zonas(id) ON DELETE SET NULL,
  referencia TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: ciclos_recoleccion (Ciclo/jornada de trabajo)
-- ============================================================
CREATE TABLE IF NOT EXISTS ciclos_recoleccion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  fecha DATE NOT NULL,
  estado VARCHAR(20) DEFAULT 'planificado' CHECK (estado IN ('planificado', 'en_curso', 'completado', 'cancelado')),
  creado_por UUID REFERENCES users(id),
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  finalizado_en TIMESTAMPTZ
);

-- ============================================================
-- TABLA: rutas (Ruta asignada a un operador en un ciclo)
-- ============================================================
CREATE TABLE IF NOT EXISTS rutas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ciclo_id UUID NOT NULL REFERENCES ciclos_recoleccion(id) ON DELETE CASCADE,
  operador_id UUID NOT NULL REFERENCES operadores(id) ON DELETE CASCADE,
  zona_id UUID REFERENCES zonas(id),
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_curso', 'completada', 'cancelada')),
  capacidad_usada INT DEFAULT 0,
  orden_paradas JSONB, -- Array ordenado de punto_id para optimización
  iniciada_en TIMESTAMPTZ,
  finalizada_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: puntos_parada (Cada parada/paquete en una ruta)
-- ============================================================
CREATE TABLE IF NOT EXISTS puntos_parada (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ruta_id UUID NOT NULL REFERENCES rutas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  ciclo_id UUID REFERENCES ciclos_recoleccion(id),
  orden INT NOT NULL DEFAULT 0,
  direccion TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(30) DEFAULT 'domicilio' CHECK (tipo IN ('domicilio', 'correspondencia', 'residuo', 'otro')),
  peso_estimado DECIMAL(8, 2) DEFAULT 1.0,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'visitado', 'omitido')),
  motivo_omision TEXT,
  visitado_en TIMESTAMPTZ,
  reagendado BOOLEAN DEFAULT FALSE,
  reagendado_en TIMESTAMPTZ,
  ruta_reagendada_id UUID REFERENCES rutas(id),
  notas TEXT,
  foto_evidencia TEXT, -- URL de foto en storage
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: ubicaciones_historial (Track GPS de operadores)
-- ============================================================
CREATE TABLE IF NOT EXISTS ubicaciones_historial (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operador_id UUID NOT NULL REFERENCES operadores(id) ON DELETE CASCADE,
  ruta_id UUID REFERENCES rutas(id),
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  velocidad DECIMAL(6, 2),
  registrado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: paquetes (Información del paquete/envío)
-- ============================================================
CREATE TABLE IF NOT EXISTS paquetes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  punto_parada_id UUID REFERENCES puntos_parada(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id),
  codigo_seguimiento VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  peso DECIMAL(8, 2),
  dimensiones VARCHAR(50),
  estado VARCHAR(30) DEFAULT 'registrado' CHECK (estado IN (
    'registrado', 'en_bodega', 'asignado_a_ruta',
    'en_transito', 'entregado', 'no_entregado', 'reagendado', 'devuelto'
  )),
  estado_actualizado_en TIMESTAMPTZ DEFAULT NOW(),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: notificaciones (Notificaciones a clientes)
-- ============================================================
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  datos_extra JSONB,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES para rendimiento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_operadores_user ON operadores(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_user ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_rutas_ciclo ON rutas(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_rutas_operador ON rutas(operador_id);
CREATE INDEX IF NOT EXISTS idx_puntos_ruta ON puntos_parada(ruta_id);
CREATE INDEX IF NOT EXISTS idx_puntos_estado ON puntos_parada(estado);
CREATE INDEX IF NOT EXISTS idx_puntos_cliente ON puntos_parada(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_operador ON ubicaciones_historial(operador_id);
CREATE INDEX IF NOT EXISTS idx_paquetes_seguimiento ON paquetes(codigo_seguimiento);
CREATE INDEX IF NOT EXISTS idx_notificaciones_user ON notificaciones(user_id);

-- ============================================================
-- TRIGGERS: actualizado_en automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_puntos_updated
  BEFORE UPDATE ON puntos_parada
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- DATOS INICIALES: Admin por defecto
-- Password: Admin123! (bcrypt hash)
-- ============================================================
INSERT INTO users (nombre, apellido, email, password_hash, rol)
VALUES (
  'Super', 'Admin',
  'admin@rutas.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Zona de ejemplo
INSERT INTO zonas (nombre, descripcion)
VALUES 
  ('Zona Norte', 'Sector norte de la ciudad'),
  ('Zona Sur', 'Sector sur de la ciudad'),
  ('Zona Centro', 'Centro histórico y comercial')
ON CONFLICT DO NOTHING;
