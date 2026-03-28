// API de Producto individual
import type { APIRoute } from 'astro';

// Reutilizar la variable de productos desde el índice
// En producción, esto sería una conexión real a D1

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  const productoId = parseInt(id || '0');
  
  // Buscar en la variable global de productos (simulación)
  const productos = (global as any).productos || [];
  const producto = productos.find((p: any) => p.id === productoId);

  if (!producto) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Producto no encontrado'
    }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({
    success: true,
    data: producto
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;
  const productoId = parseInt(id || '0');
  
  try {
    const body = await request.json();
    const productos = (global as any).productos || [];
    const index = productos.findIndex((p: any) => p.id === productoId);

    if (index === -1) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Producto no encontrado'
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Actualizar solo los campos proporcionados
    productos[index] = {
      ...productos[index],
      ...body,
      updated_at: new Date().toISOString()
    };

    (global as any).productos = productos;

    return new Response(JSON.stringify({
      success: true,
      data: productos[index]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Error al actualizar producto'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;
  const productoId = parseInt(id || '0');
  
  const productos = (global as any).productos || [];
  const index = productos.findIndex((p: any) => p.id === productoId);

  if (index === -1) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Producto no encontrado'
    }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Soft delete - marcar como inactivo
  productos[index].activo = false;
  productos[index].updated_at = new Date().toISOString();
  (global as any).productos = productos;

  return new Response(JSON.stringify({
    success: true,
    message: 'Producto eliminado'
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
