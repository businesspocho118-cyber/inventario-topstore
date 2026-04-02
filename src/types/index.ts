// Tipos para el Inventario TopStore

// Una unidad de inventario: producto específico con color y talla juntos
// Key ejemplo: "Negro-M" = 5 unidades de Camisa en Negro Talla M
export interface Producto {
  id: number;
  product_id: string;
  nombre: string;
  descripcion: string;
  precio: string;
  colores: string;      // colores disponibles separados por coma
  tallas: string;      // tallas disponibles separadas por coma
  genero: 'hombres' | 'mujeres';
  categoria: string;
  image_paths: string[];
  // Stock por combinación color+talla. Key: "Color-Talla", Value: cantidad
  // Ej: { "Negro-M": 5, "Blanco-L": 3 }
  unidades: Record<string, number>;
  // Stock total (calculado como suma de unidades)
  stock: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PedidoItem {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  color: string;
  talla: string;
  producto_nombre?: string;
}

export interface Pedido {
  id: number;
  fecha: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion?: string;
  cliente_barrio?: string;
  cliente_referencias?: string;
  metodo_pago?: 'efectivo' | 'transferencia';
  estado: 'reservado' | 'pendiente_entrega' | 'entregado';
  total: number;
  notas: string;
  items?: PedidoItem[];
}

export interface DetallePedido {
  id: number;
  pedido_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  producto_nombre?: string;
}

export interface DashboardStats {
  total_productos: number;
  productos_sin_stock: number;
  total_pedidos: number;
  pedidos_pendientes: number;
  ingresos_totales: number;
}

// Tipos para la API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
}

export interface CreateProductoRequest {
  product_id: string;
  nombre: string;
  descripcion: string;
  precio: string;
  colores: string;
  tallas: string;
  unidades: Record<string, number>; // Stock por combinación "Color-Talla"
  genero: 'hombres' | 'mujeres';
  categoria: string;
  image_paths: string[];
  stock: number; // Total (calculado)
}

export interface UpdateProductoRequest extends Partial<CreateProductoRequest> {
  activo?: boolean;
}

export interface CreatePedidoRequest {
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string;
  cliente_barrio: string;
  cliente_referencias: string;
  metodo_pago: 'efectivo' | 'transferencia';
  notas?: string;
  items: {
    producto_id: number;
    cantidad: number;
    precio_unitario: number;
    color: string;
    talla: string;
  }[];
}
