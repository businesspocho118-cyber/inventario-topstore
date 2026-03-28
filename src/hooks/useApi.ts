import { useState, useCallback } from 'react';
import data from '../data/productos.json';
import type { 
  ApiResponse, 
  Producto, 
  Pedido, 
  DashboardStats,
  CreateProductoRequest,
  UpdateProductoRequest,
  CreatePedidoRequest 
} from '../types';

// Base de datos desde JSON
let productosDb: Producto[] = [...data.productos];
let pedidosDb: Pedido[] = [...data.pedidos];
let nextProductoId = productosDb.length + 1;
let nextPedidoId = pedidosDb.length + 1;

// Guardar a JSON (simulado - en producción se guardaría en GitHub)
const saveToJson = async () => {
  console.log('Datos guardados en memoria (sincronización con JSON)');
  // En producción, esto enviaría los datos al repositorio de GitHub
};

export function useApi() {
  const [isLoading, setIsLoading] = useState(false);

  // Dashboard
  const getStats = useCallback(async (): Promise<ApiResponse<DashboardStats>> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));
    
    const productosActivos = productosDb.filter(p => p.activo);
    const sinStock = productosActivos.filter(p => p.stock === 0).length;
    const pedidosEntregados = pedidosDb.filter(p => p.estado === 'entregado' || p.estado === 'pagado');
    const ingresos = pedidosEntregados.reduce((sum, p) => sum + p.total, 0);
    
    const stats: DashboardStats = {
      total_productos: productosActivos.length,
      productos_sin_stock: sinStock,
      total_pedidos: pedidosDb.length,
      pedidos_pendientes: pedidosDb.filter(p => p.estado === 'pendiente').length,
      ingresos_totales: ingresos
    };
    
    setIsLoading(false);
    return { success: true, data: stats };
  }, []);

  // Productos
  const getProductos = useCallback(async (): Promise<ApiResponse<Producto[]>> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));
    const activos = productosDb.filter(p => p.activo);
    setIsLoading(false);
    return { success: true, data: activos };
  }, []);

  const getProducto = useCallback(async (id: number): Promise<ApiResponse<Producto>> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 200));
    const producto = productosDb.find(p => p.id === id);
    setIsLoading(false);
    if (producto) {
      return { success: true, data: producto };
    }
    return { success: false, error: 'Producto no encontrado' };
  }, []);

  const createProducto = useCallback(async (req: CreateProductoRequest): Promise<ApiResponse<Producto>> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));
    
    if (productosDb.some(p => p.product_id === req.product_id)) {
      setIsLoading(false);
      return { success: false, error: 'Ya existe un producto con este ID' };
    }
    
    const nuevo: Producto = {
      id: nextProductoId++,
      ...req,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    productosDb.push(nuevo);
    await saveToJson();
    
    setIsLoading(false);
    return { success: true, data: nuevo };
  }, []);

  const updateProducto = useCallback(async (id: number, req: UpdateProductoRequest): Promise<ApiResponse<Producto>> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));
    
    const index = productosDb.findIndex(p => p.id === id);
    if (index === -1) {
      setIsLoading(false);
      return { success: false, error: 'Producto no encontrado' };
    }
    
    productosDb[index] = {
      ...productosDb[index],
      ...req,
      updated_at: new Date().toISOString()
    };
    
    await saveToJson();
    
    setIsLoading(false);
    return { success: true, data: productosDb[index] };
  }, []);

  const deleteProducto = useCallback(async (id: number): Promise<ApiResponse<void>> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));
    
    const index = productosDb.findIndex(p => p.id === id);
    if (index === -1) {
      setIsLoading(false);
      return { success: false, error: 'Producto no encontrado' };
    }
    
    productosDb[index].activo = false;
    productosDb[index].updated_at = new Date().toISOString();
    
    await saveToJson();
    
    setIsLoading(false);
    return { success: true };
  }, []);

  // Pedidos
  const getPedidos = useCallback(async (): Promise<ApiResponse<Pedido[]>> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));
    setIsLoading(false);
    return { success: true, data: [...pedidosDb] };
  }, []);

  const getPedido = useCallback(async (id: number): Promise<ApiResponse<Pedido>> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 200));
    const pedido = pedidosDb.find(p => p.id === id);
    setIsLoading(false);
    if (pedido) {
      return { success: true, data: pedido };
    }
    return { success: false, error: 'Pedido no encontrado' };
  }, []);

  const createPedido = useCallback(async (req: CreatePedidoRequest): Promise<ApiResponse<Pedido>> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));
    
    if (!req.cliente_nombre || !req.cliente_telefono || req.items.length === 0) {
      setIsLoading(false);
      return { success: false, error: 'Faltan datos requeridos' };
    }
    
    const total = req.items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
    
    const nuevo: Pedido = {
      id: nextPedidoId++,
      fecha: new Date().toISOString(),
      cliente_nombre: req.cliente_nombre,
      cliente_telefono: req.cliente_telefono,
      notas: req.notas || '',
      estado: 'pendiente',
      total
    };
    
    pedidosDb.push(nuevo);
    
    // Reducir stock de productos
    req.items.forEach(item => {
      const producto = productosDb.find(p => p.id === item.producto_id);
      if (producto) {
        producto.stock = Math.max(0, producto.stock - item.cantidad);
        producto.updated_at = new Date().toISOString();
      }
    });
    
    await saveToJson();
    
    setIsLoading(false);
    return { success: true, data: nuevo };
  }, []);

  const updatePedidoEstado = useCallback(async (id: number, estado: string): Promise<ApiResponse<Pedido>> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));
    
    const index = pedidosDb.findIndex(p => p.id === id);
    if (index === -1) {
      setIsLoading(false);
      return { success: false, error: 'Pedido no encontrado' };
    }
    
    const estadosValidos = ['pendiente', 'pagado', 'enviado', 'entregado'];
    if (!estadosValidos.includes(estado)) {
      setIsLoading(false);
      return { success: false, error: 'Estado inválido' };
    }
    
    pedidosDb[index].estado = estado as Pedido['estado'];
    
    await saveToJson();
    
    setIsLoading(false);
    return { success: true, data: pedidosDb[index] };
  }, []);

  return {
    isLoading,
    getStats,
    getProductos,
    getProducto,
    createProducto,
    updateProducto,
    deleteProducto,
    getPedidos,
    getPedido,
    createPedido,
    updatePedidoEstado
  };
}
