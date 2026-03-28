// API de Productos
import type { APIRoute } from 'astro';

// Simulación de base de datos en memoria (luego se conectará a D1)
let productos = [
  {
    id: 1,
    product_id: 'camisa-i-dont-care',
    nombre: 'Camisa I DONT CARE',
    descripcion: 'Camisa sin mangas y corte relajado',
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
    descripcion: 'Camisa tipo musculosa con aberturas amplias',
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
    product_id: 'leggings',
    nombre: 'Leggings Deportivo',
    descripcion: 'Leggings de cintura alta con tejido de compresión',
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
    id: 4,
    product_id: 'conjunto-short',
    nombre: 'Conjunto con Short',
    descripcion: 'Conjunto con short deportivo sin costuras',
    precio: '$55.000',
    colores: 'Vino Tinto, Negro, Azul Oscuro',
    genero: 'mujeres',
    categoria: 'Conjuntos',
    image_paths: ['MUJERES/Conjuntos/Conjunto con Short/WhatsApp Image 2026-01-11 at 3.36.54 PM.jpeg'],
    stock: 5,
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 5,
    product_id: 'chaqueta-mujer',
    nombre: 'Chaqueta',
    descripcion: 'Chaqueta estructurada de cierre completo',
    precio: '$45.000',
    colores: 'Negro, Vino Tinto, Gris Claro, Rosado',
    genero: 'mujeres',
    categoria: 'Chaquetas',
    image_paths: ['MUJERES/Chaquetas/WhatsApp Image 2026-01-11 at 3.46.55 PM.jpeg'],
    stock: 0,
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let nextId = 6;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    success: true,
    data: productos.filter(p => p.activo)
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { product_id, nombre, descripcion, precio, colores, genero, categoria, image_paths, stock } = body;

    // Validar campos requeridos
    if (!product_id || !nombre || !precio || !categoria) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Faltan campos requeridos'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Verificar si el product_id ya existe
    if (productos.some(p => p.product_id === product_id)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Ya existe un producto con este ID'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const nuevoProducto = {
      id: nextId++,
      product_id,
      nombre,
      descripcion: descripcion || '',
      precio,
      colores: colores || '',
      genero: genero || 'mujeres',
      categoria,
      image_paths: image_paths || [],
      stock: stock || 0,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    productos.push(nuevoProducto);

    return new Response(JSON.stringify({
      success: true,
      data: nuevoProducto
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Error al crear producto'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
