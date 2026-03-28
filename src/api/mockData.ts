// Mock data para desarrollo local
import type { Producto, Pedido, DashboardStats } from '../types';

// Datos de productos iniciales (extraídos del catálogo)
export const mockProductos: Producto[] = [
  {
    id: 1,
    product_id: 'camisa-i-dont-care',
    nombre: 'Camisa I DONT CARE',
    descripcion: 'Camisa sin mangas y corte relajado, construida para un flujo de aire constante durante rutinas de fuerza.',
    precio: '$37.000',
    colores: 'Negro, Blanco',
    genero: 'hombres',
    categoria: 'Camisas',
    image_paths: ['HOMBRES/Camisas-Hombre/Camisa I DONT CARE/image (3).png'],
    stock: 15,
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    product_id: 'camisa-workout',
    nombre: 'Camisa WORKOUT',
    descripcion: 'Camisa tipo musculosa con aberturas amplias laterales y estampado frontal, enfocada en la ventilación total.',
    precio: '$35.000',
    colores: 'Blanco, Negro',
    genero: 'hombres',
    categoria: 'Camisas',
    image_paths: ['HOMBRES/Camisas-Hombre/WORKOUT/Camisa-WORKOUT-hombre-1.jpg'],
    stock: 8,
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    product_id: 'camisa-tirantes',
    nombre: 'Camisa Tirantes',
    descripcion: 'Camisa de Tirantes con espalda descubierta y silueta anatómica, ideal para entrenamientos de máxima exigencia física.',
    precio: '$30.000',
    colores: 'Negro',
    genero: 'hombres',
    categoria: 'Camisas',
    image_paths: ['HOMBRES/Camisas-Hombre/Camisa Tirantes/image (1).png'],
    stock: 12,
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 4,
    product_id: 'leggings',
    nombre: 'Leggings Deportivo',
    descripcion: 'Leggings de cintura alta con tejido de compresión y contornos estratégicos, esculpiendo la silueta con soporte continuo.',
    precio: '$45.000',
    colores: 'Azul, Vino Tinto',
    genero: 'mujeres',
    categoria: 'Leggings',
    image_paths: ['MUJERES/Leggings/IMG-20251127-WA0079.jpg'],
    stock: 12,
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 5,
    product_id: 'leggin-push-up-corte-en-v',
    nombre: 'Leggin push up corte en V',
    descripcion: 'Leggin con efecto push up y cintura en corte V que estiliza la cadera y resalta la figura de manera natural y funcional.',
    precio: '$50.000',
    colores: 'Rosado',
    genero: 'mujeres',
    categoria: 'Leggings',
    image_paths: ['MUJERES/Leggings/Leggin-push-up-corte-en-V/Leggin-push-up-corte-en-V-1.jpg'],
    stock: 6,
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 6,
    product_id: 'conjunto-short',
    nombre: 'Conjunto con Short',
    descripcion: 'Conjunto con short deportivo sin costuras de ajuste ligero, diseñado para fluidez y agilidad en cada movimiento.',
    precio: '$55.000',
    colores: 'Vino Tinto, Negro, Azul Oscuro, Rosado, Morado',
    genero: 'mujeres',
    categoria: 'Conjuntos',
    image_paths: ['MUJERES/Conjuntos/Conjunto con Short/WhatsApp Image 2026-01-11 at 3.36.54 PM.jpeg'],
    stock: 5,
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 7,
    product_id: 'chaqueta-mujer',
    nombre: 'Chaqueta',
    descripcion: 'Chaqueta estructurada de cierre completo, ofreciendo un ajuste ceñido que define la silueta deportiva con máxima comodidad.',
    precio: '$45.000',
    colores: 'Negro, Vino Tinto, Gris Claro, Rosado',
    genero: 'mujeres',
    categoria: 'Chaquetas',
    image_paths: ['MUJERES/Chaquetas/WhatsApp Image 2026-01-11 at 3.46.55 PM.jpeg'],
    stock: 0,
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 8,
    product_id: 'short-push-up',
    nombre: 'Short con Push Up',
    descripcion: 'Short con push up de cintura moldeadora, confeccionado en tela elástica de alto rendimiento para entrenamientos de impacto.',
    precio: '$32.000',
    colores: 'Negro, Café, Azul',
    genero: 'mujeres',
    categoria: 'Shorts',
    image_paths: ['MUJERES/Short/Short con Push Up/image.png'],
    stock: 10,
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 9,
    product_id: 'top-deportivo',
    nombre: 'Top Deportivo',
    descripcion: 'Top deportivo de soporte estructurado, enfocado en maximizar la sujeción durante movimientos y evitar distracciones.',
    precio: '$25.000',
    colores: 'Gris Claro, Café',
    genero: 'mujeres',
    categoria: 'Tops',
    image_paths: ['MUJERES/Tops/WhatsApp Image 2026-01-11 at 3.39.01 PM.jpeg'],
    stock: 20,
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 10,
    product_id: 'buzo-mujer',
    nombre: 'Buzo Deportivo',
    descripcion: 'Buzo deportivo térmico con diseño moderno, proporcionando cobertura y un ajuste estilizado durante el entrenamiento.',
    precio: '$32.000',
    colores: 'Blanco',
    genero: 'mujeres',
    categoria: 'Buzos',
    image_paths: ['MUJERES/Buzos/IMG-20251127-WA0083.jpg'],
    stock: 7,
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Datos de pedidos iniciales
export const mockPedidos: Pedido[] = [
  {
    id: 1,
    fecha: '2026-03-25T10:30:00Z',
    cliente_nombre: 'María García',
    cliente_telefono: '3201234567',
    estado: 'pendiente',
    total: 82000,
    notas: 'Entregar en el centro'
  },
  {
    id: 2,
    fecha: '2026-03-24T15:45:00Z',
    cliente_nombre: 'Carlos López',
    cliente_telefono: '3159876543',
    estado: 'entregado',
    total: 145000,
    notas: ''
  },
  {
    id: 3,
    fecha: '2026-03-26T09:00:00Z',
    cliente_nombre: 'Ana Martínez',
    cliente_telefono: '3004567890',
    estado: 'pagado',
    total: 67500,
    notas: 'Llamar antes de entregar'
  },
  {
    id: 4,
    fecha: '2026-03-27T11:00:00Z',
    cliente_nombre: 'Laura Torres',
    cliente_telefono: '3102345678',
    estado: 'enviado',
    total: 92000,
    notas: 'Dirección: Calle 123'
  }
];

// Calcular estadísticas
export function getMockStats(): DashboardStats {
  const productosActivos = mockProductos.filter(p => p.activo);
  const sinStock = productosActivos.filter(p => p.stock === 0).length;
  const pedidosEntregadosO了什么 = mockPedidos.filter(p => p.estado === 'entregado' || p.estado === 'pagado');
  const ingresos = pedidosEntregadosO了什么.reduce((sum, p) => sum + p.total, 0);
  
  return {
    total_productos: productosActivos.length,
    productos_sin_stock: sinStock,
    total_pedidos: mockPedidos.length,
    pedidos_pendientes: mockPedidos.filter(p => p.estado === 'pendiente').length,
    ingresos_totales: ingresos
  };
}
