// API de autenticación
import type { APIRoute } from 'astro';

const ADMIN_PASSWORD = 'johlu1108';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Contraseña requerida' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Contraseña incorrecta' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generar token simple (en producción usar JWT real)
    const token = btoa(`${Date.now()}:${ADMIN_PASSWORD}`);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return new Response(JSON.stringify({
      success: true,
      token,
      expiresAt
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
