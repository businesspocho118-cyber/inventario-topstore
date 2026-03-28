// API de Estadísticas del Dashboard
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  // Simular estadísticas basadas en los datos
  const productos = (global as any).productos || [];
  const pedidos = (global as any).pedidos || [];
  
  const total_productos = productos.filter((p: any) => p.activo).length;
  const productos_sin_stock = productos.filter((p: any) => p.activo && p.stock === 0).length;
  const total_pedidos = pedidos.length;
  const pedidos_pendientes = pedidos.filter((p: any) => p.estado === 'pendiente').length;
  const ingresos_totales = pedidos
    .filter((p: any) => p.estado === 'entregado' || p.estado === 'pagado')
    .reduce((sum: number, p: any) => sum + (p.total || 0), 0);

  return new Response(JSON.stringify({
    success: true,
    data: {
      total_productos,
      productos_sin_stock,
      total_pedidos,
      pedidos_pendientes,
      ingresos_totales
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
