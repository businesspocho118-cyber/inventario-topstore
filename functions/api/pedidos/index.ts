// API de Pedidos
import type { APIRoute } from 'astro';

// Simulación de base de datos
let pedidos: any[] = [
  {
    id: 1,
    fecha: '2026-03-25T10:30:00Z',
    cliente_nombre: 'María García',
    cliente_telefono: '3201234567',
    estado: 'pendiente',
    total: 82000,
    notas: 'Entregar en el centro',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    fecha: '2026-03-24T15:45:00Z',
    cliente_nombre: 'Carlos López',
    cliente_telefono: '3159876543',
    estado: 'entregado',
    total: 145000,
    notas: '',
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    fecha: '2026-03-26T09:00:00Z',
    cliente_nombre: 'Ana Martínez',
    cliente_telefono: '3004567890',
    estado: 'pagado',
    total: 67500,
    notas: 'Llamar antes de entregar',
    created_at: new Date().toISOString()
  }
];

let nextId = 4;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    success: true,
    data: pedidos
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { cliente_nombre, cliente_telefono, notas, items } = body;

    if (!cliente_nombre || !cliente_telefono || !items || items.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Faltan datos requeridos'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Calcular total
    const total = items.reduce((sum: number, item: any) => {
      return sum + (item.cantidad * item.precio_unitario);
    }, 0);

    const nuevoPedido = {
      id: nextId++,
      fecha: new Date().toISOString(),
      cliente_nombre,
      cliente_telefono,
      notas: notas || '',
      estado: 'pendiente',
      total,
      items,
      created_at: new Date().toISOString()
    };

    pedidos.push(nuevoPedido);

    return new Response(JSON.stringify({
      success: true,
      data: nuevoPedido
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Error al crear pedido'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
