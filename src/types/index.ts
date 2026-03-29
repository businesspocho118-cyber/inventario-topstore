// Tipos para el Inventario TopStore

export interface Producto {
  id: number;
  product_id: string;
  nombre: string;
  descripcion: string;
  precio: string;
  colores: string;
  stock_por_color?: Record<string, number>;
  genero: 'hombres' | 'mujeres';
  categoria: string;
  image_paths: string[];
  stock: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Pedido {
  id: number;
  fecha: string;
  cliente_nombre: string;
  cliente_telefono: string;
  estado: 'pendiente' | 'pagado' | 'enviado' | 'entregado';
  total: number;
  notas: string;
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
  stock_por_color?: Record<string, number>;
  genero: 'hombres' | 'mujeres';
  categoria: string;
  image_paths: string[];
  stock: number;
}

export interface UpdateProductoRequest extends Partial<CreateProductoRequest> {
  activo?: boolean;
}

export interface CreatePedidoRequest {
  cliente_nombre: string;
  cliente_telefono: string;
  notas?: string;
  items: {
    producto_id: number;
    cantidad: number;
    precio_unitario: number;
  }[];
}
