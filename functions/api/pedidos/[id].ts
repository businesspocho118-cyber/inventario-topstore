// API de Pedido individual
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  const pedidoId = parseInt(id || '0');
  
  const pedidos = (global as any).pedidos || [];
  const pedido = pedidos.find((p: any) => p.id === pedidoId);

  if (!pedido) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Pedido no encontrado'
    }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({
    success: true,
    data: pedido
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;
  const pedidoId = parseInt(id || '0');
  
  try {
    const body = await request.json();
    const pedidos = (global as any).pedidos || [];
    const index = pedidos.findIndex((p: any) => p.id === pedidoId);

    if (index === -1) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Pedido no encontrado'
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Actualizar estado
    if (body.estado) {
      const estadosValidos = ['pendiente', 'pagado', 'enviado', 'entregado'];
      if (!estadosValidos.includes(body.estado)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Estado inválido'
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      pedidos[index].estado = body.estado;
    }

    pedidos[index].updated_at = new Date().toISOString();
    (global as any).pedidos = pedidos;

    return new Response(JSON.stringify({
      success: true,
      data: pedidos[index]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Error al actualizar pedido'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
