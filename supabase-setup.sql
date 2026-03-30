-- ================================================
-- CREAR TABLAS EN SUPABASE - TopStore Inventory
-- ================================================
-- Ejecutar este SQL en el SQL Editor de Supabase
-- ================================================

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY,
  product_id TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  precio TEXT NOT NULL,
  colores TEXT DEFAULT '',
  stock_por_color JSONB DEFAULT '{}',
  genero TEXT CHECK (genero IN ('hombres', 'mujeres')) NOT NULL,
  categoria TEXT DEFAULT '',
  image_paths JSONB DEFAULT '[]',
  stock INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY,
  fecha TIMESTAMPTZ NOT NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  cliente_direccion TEXT DEFAULT '',
  cliente_barrio TEXT DEFAULT '',
  cliente_referencias TEXT DEFAULT '',
  metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'transferencia')),
  estado TEXT CHECK (estado IN ('pendiente', 'pagado', 'enviado', 'entregado')) DEFAULT 'pendiente',
  total DECIMAL(10,2) NOT NULL,
  notas TEXT DEFAULT ''
);

-- Tabla de Clientes Fidelidad
CREATE TABLE IF NOT EXISTS clientes (
  id BIGINT PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT UNIQUE NOT NULL,
  direccion TEXT DEFAULT '',
  referencias TEXT DEFAULT '',
  ultimo_metodo_pago TEXT DEFAULT '',
  compras INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Realtime para las tablas
ALTER PUBLICATION supabase_realtime ADD TABLE productos;
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE clientes;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes(telefono);
CREATE INDEX IF NOT EXISTS idx_clientes_compras ON clientes(compras DESC);

-- Configurar Row Level Security (RLS)
-- Deshabilitar RLS para permitir acceso público (ajustar según necesidades)
ALTER TABLE productos DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;

-- Configurar 'updated_at' automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- NOTA: Para que funcione la replicación en tiempo real,
-- debes habilitar Realtime en el dashboard de Supabase:
-- 1. Ir a Database > Replication
-- 2. Habilitar Realtime para las tablas
-- ================================================
