import { useState, useCallback } from 'react';
import type { ApiResponse, Producto, Pedido, DashboardStats, CreateProductoRequest, UpdateProductoRequest, CreatePedidoRequest } from '../types';
import { supabase, TABLES } from '../supabase/config';

// Estado global
let productosDb: Producto[] = [];
let pedidosDb: Pedido[] = [];
let nextProductoId = 1;
let nextPedidoId = 1;
let dataLoaded = false;
let supabaseConnected = false;

const STORAGE_KEYS = {
  productos: 'topstore_productos',
  pedidos: 'topstore_pedidos',
  clientes: 'topstore_clientes_fidelidad',
  lastSync: 'topstore_last_sync'
};

// Función simple de carga
const loadFromLocal = () => {
  const storedP = localStorage.getItem(STORAGE_KEYS.productos);
  const storedO = localStorage.getItem(STORAGE_KEYS.pedidos);
  
  if (storedP && storedO) {
    productosDb = JSON.parse(storedP);
    pedidosDb = JSON.parse(storedO);
    nextProductoId = (productosDb.length ? Math.max(...productosDb.map(p => p.id)) : 0) + 1;
    nextPedidoId = (pedidosDb.length ? Math.max(...pedidosDb.map(p => p.id)) : 0) + 1;
    return true;
  }
  return false;
};

// Sync simple a Supabase (sin espera)
const syncToSupabase = async () => {
  if (!supabaseConnected) return;
  try {
    for (const p of productosDb) {
      await supabase.from(TABLES.PRODUCTOS).upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    }
    for (const o of pedidosDb) {
      await supabase.from(TABLES.PEDIDOS).upsert(o, { onConflict: 'id' });
    }
  } catch (e) { /* ignore */ }
};

// Check conexión (solo una vez)
const checkConnection = async () => {
  if (supabaseConnected) return;
  try {
    const { error } = await supabase.from(TABLES.PRODUCTOS).select('id').limit(1);
    supabaseConnected = !error;
  } catch (e) { supabaseConnected = false; }
};

export function useApi() {
  const [isLoading, setIsLoading] = useState(false);

  const getStats = useCallback(async (): Promise<ApiResponse<DashboardStats>> => {
    setIsLoading(true);
    loadFromLocal();
    await checkConnection();
    
    const activos = productosDb.filter(p => p.activo);
    const stats: DashboardStats = {
      total_productos: activos.length,
      productos_sin_stock: activos.filter(p => p.stock === 0).length,
      total_pedidos: pedidosDb.length,
      pedidos_pendientes: pedidosDb.filter(p => p.estado === 'pendiente').length,
      ingresos_totales: pedidosDb.filter(p => p.estado === 'entregado' || p.estado === 'pagado').reduce((s, p) => s + p.total, 0)
    };
    
    setIsLoading(false);
    return { success: true, data: stats };
  }, []);

  const getProductos = useCallback(async (): Promise<ApiResponse<Producto[]>> => {
    setIsLoading(true);
    loadFromLocal();
    await checkConnection();
    setIsLoading(false);
    return { success: true, data: productosDb.filter(p => p.activo) };
  }, []);

  const createProducto = useCallback(async (req: CreateProductoRequest): Promise<ApiResponse<Producto>> => {
    setIsLoading(true);
    loadFromLocal();
    
    const nuevo: Producto = {
      id: nextProductoId++,
      ...req,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    productosDb.push(nuevo);
    localStorage.setItem(STORAGE_KEYS.productos, JSON.stringify(productosDb));
    syncToSupabase();
    
    setIsLoading(false);
    return { success: true, data: nuevo };
  }, []);

  const updateProducto = useCallback(async (id: number, req: UpdateProductoRequest): Promise<ApiResponse<Producto>> => {
    setIsLoading(true);
    loadFromLocal();
    
    const idx = productosDb.findIndex(p => p.id === id);
    if (idx === -1) {
      setIsLoading(false);
      return { success: false, error: 'Producto no encontrado' };
    }
    
    productosDb[idx] = { ...productosDb[idx], ...req, updated_at: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.productos, JSON.stringify(productosDb));
    syncToSupabase();
    
    setIsLoading(false);
    return { success: true, data: productosDb[idx] };
  }, []);

  const deleteProducto = useCallback(async (id: number): Promise<ApiResponse<void>> => {
    setIsLoading(true);
    loadFromLocal();
    
    const idx = productosDb.findIndex(p => p.id === id);
    if (idx === -1) {
      setIsLoading(false);
      return { success: false, error: 'Producto no encontrado' };
    }
    
    productosDb[idx].activo = false;
    productosDb[idx].updated_at = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.productos, JSON.stringify(productosDb));
    syncToSupabase();
    
    setIsLoading(false);
    return { success: true };
  }, []);

  const getPedidos = useCallback(async (): Promise<ApiResponse<Pedido[]>> => {
    setIsLoading(true);
    loadFromLocal();
    await checkConnection();
    setIsLoading(false);
    return { success: true, data: [...pedidosDb] };
  }, []);

  const createPedido = useCallback(async (req: CreatePedidoRequest): Promise<ApiResponse<Pedido>> => {
    setIsLoading(true);
    loadFromLocal();
    
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
      cliente_direccion: req.cliente_direccion,
      cliente_barrio: req.cliente_barrio,
      cliente_referencias: req.cliente_referencias,
      metodo_pago: req.metodo_pago,
      notas: req.notas || '',
      estado: 'pendiente',
      total
    };
    
    pedidosDb.push(nuevo);
    
    // Fidelidad - actualizar cliente
    const FIDELIDAD_KEY = 'topstore_clientes_fidelidad';
    let clientes: any[] = [];
    const stored = localStorage.getItem(FIDELIDAD_KEY);
    if (stored) clientes = JSON.parse(stored);
    
    const cIdx = clientes.findIndex(c => c.telefono === req.cliente_telefono);
    if (cIdx !== -1) {
      clientes[cIdx].compras += 1;
    } else {
      clientes.push({
        id: Date.now(),
        nombre: req.cliente_nombre,
        telefono: req.cliente_telefono,
        direccion: `${req.cliente_direccion}, ${req.cliente_barrio}`,
        referencias: req.cliente_referencias,
        ultimo_metodo_pago: req.metodo_pago,
        compras: 1,
        created_at: new Date().toISOString()
      });
    }
    localStorage.setItem(FIDELIDAD_KEY, JSON.stringify(clientes));
    
    // Reducir stock
    req.items.forEach(item => {
      const p = productosDb.find(p => p.id === item.producto_id);
      if (p) {
        p.stock = Math.max(0, p.stock - item.cantidad);
        if (item.color && p.stock_por_color) {
          p.stock_por_color[item.color] = Math.max(0, (p.stock_por_color[item.color] || 0) - item.cantidad);
        }
        p.updated_at = new Date().toISOString();
      }
    });
    
    localStorage.setItem(STORAGE_KEYS.productos, JSON.stringify(productosDb));
    localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(pedidosDb));
    syncToSupabase();
    
    setIsLoading(false);
    return { success: true, data: nuevo };
  }, []);

  const updatePedidoEstado = useCallback(async (id: number, estado: string): Promise<ApiResponse<Pedido>> => {
    setIsLoading(true);
    loadFromLocal();
    
    const idx = pedidosDb.findIndex(p => p.id === id);
    if (idx === -1) {
      setIsLoading(false);
      return { success: false, error: 'Pedido no encontrado' };
    }
    
    pedidosDb[idx].estado = estado as Pedido['estado'];
    localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(pedidosDb));
    syncToSupabase();
    
    setIsLoading(false);
    return { success: true, data: pedidosDb[idx] };
  }, []);

  const deletePedido = useCallback(async (id: number): Promise<ApiResponse<void>> => {
    setIsLoading(true);
    loadFromLocal();
    
    const idx = pedidosDb.findIndex(p => p.id === id);
    if (idx === -1) {
      setIsLoading(false);
      return { success: false, error: 'Pedido no encontrado' };
    }
    
    pedidosDb.splice(idx, 1);
    pedidosDb.forEach((p, i) => p.id = i + 1);
    nextPedidoId = pedidosDb.length + 1;
    
    localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(pedidosDb));
    if (supabaseConnected) {
      await supabase.from(TABLES.PEDIDOS).delete().eq('id', id);
    }
    
    setIsLoading(false);
    return { success: true };
  }, []);

  const getClientes = useCallback(async () => {
    await checkConnection();
    if (supabaseConnected) {
      const { data } = await supabase.from(TABLES.CLIENTES).select('*').order('compras', { ascending: false });
      if (data?.length) {
        localStorage.setItem(STORAGE_KEYS.clientes, JSON.stringify(data));
        return data;
      }
    }
    const stored = localStorage.getItem(STORAGE_KEYS.clientes);
    return stored ? JSON.parse(stored) : [];
  }, []);

  const saveCliente = useCallback(async (cliente: any) => {
    const stored = localStorage.getItem(STORAGE_KEYS.clientes);
    let clientes: any[] = stored ? JSON.parse(stored) : [];
    const idx = clientes.findIndex(c => c.id === cliente.id);
    if (idx !== -1) clientes[idx] = cliente;
    else clientes.push(cliente);
    localStorage.setItem(STORAGE_KEYS.clientes, JSON.stringify(clientes));
    if (supabaseConnected) {
      await supabase.from(TABLES.CLIENTES).upsert(cliente, { onConflict: 'id' });
    }
  }, []);

  const deleteCliente = useCallback(async (clienteId: number) => {
    let clientes: any[] = [];
    const stored = localStorage.getItem(STORAGE_KEYS.clientes);
    if (stored) clientes = JSON.parse(stored);
    clientes = clientes.filter(c => c.id !== clienteId);
    localStorage.setItem(STORAGE_KEYS.clientes, JSON.stringify(clientes));
    if (supabaseConnected) {
      await supabase.from(TABLES.CLIENTES).delete().eq('id', clienteId);
    }
  }, []);

  const getLastSync = useCallback(() => localStorage.getItem(STORAGE_KEYS.lastSync), []);
  const resetData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.productos);
    localStorage.removeItem(STORAGE_KEYS.pedidos);
    localStorage.removeItem(STORAGE_KEYS.lastSync);
    productosDb = [];
    pedidosDb = [];
    dataLoaded = false;
  }, []);

  const syncWithCatalog = useCallback(async () => {
    setIsLoading(true);
    const CATALOG_URL = 'https://topstore-catalogo.businesspocho118.workers.dev';
    const errors: string[] = [];
    let success = 0;
    let removed = 0;
    
    try {
      const response = await fetch(CATALOG_URL);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const cards = doc.querySelectorAll('.product-card');
      const catalogIds: string[] = [];
      
      cards.forEach(card => {
        try {
          const productId = card.getAttribute('data-product-id') || '';
          const name = card.getAttribute('data-name') || '';
          const price = card.getAttribute('data-price') || '';
          const colors = card.getAttribute('data-colors') || '';
          const gender = card.getAttribute('data-gender') || '';
          const gallery = JSON.parse((card.getAttribute('data-gallery') || '[]').replace(/&quot;/g, '"'));
          
          catalogIds.push(productId);
          const validGender = gender === 'mujeres' ? 'mujeres' : 'hombres';
          const colorList = colors.split(', ').map((c: string) => c.trim()).filter((c: string) => c);
          const imagePaths = gallery.map((img: any) => img.src?.startsWith('http') ? img.src : `${CATALOG_URL}/${img.src}`);
          
          const existIdx = productosDb.findIndex(p => p.product_id === productId);
          const stockPorColor: Record<string, number> = {};
          
          colorList.forEach((color: string) => {
            stockPorColor[color] = existIdx !== -1 && productosDb[existIdx].stock_por_color?.[color] !== undefined 
              ? productosDb[existIdx].stock_por_color![color] : 0;
          });
          
          const totalStock = Object.values(stockPorColor).reduce((a, b) => a + b, 0);
          
          if (existIdx !== -1) {
            productosDb[existIdx] = { ...productosDb[existIdx], nombre: name, precio: price, colores: colors, stock_por_color: stockPorColor, genero: validGender, image_paths: imagePaths, activo: true, updated_at: new Date().toISOString(), stock: totalStock };
          } else {
            productosDb.push({ id: nextProductoId++, product_id: productId, nombre: name, descripcion: '', precio: price, colores: colors, stock_por_color: stockPorColor, genero: validGender, categoria: '', image_paths: imagePaths, stock: totalStock, activo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
          }
          success++;
        } catch (e) { errors.push(`Error: ${e}`); }
      });
      
      productosDb.forEach(p => { if (!catalogIds.includes(p.product_id) && p.activo) { p.activo = false; p.updated_at = new Date().toISOString(); removed++; } });
      
      localStorage.setItem(STORAGE_KEYS.productos, JSON.stringify(productosDb));
      localStorage.setItem(STORAGE_KEYS.lastSync, new Date().toISOString());
      syncToSupabase();
    } catch (e) { errors.push(`Conexión: ${e}`); }
    
    setIsLoading(false);
    return { success, removed, errors };
  }, []);

  return {
    isLoading, getStats, getProductos, getPedidos, createProducto, updateProducto, deleteProducto,
    createPedido, updatePedidoEstado, deletePedido, getClientes, saveCliente, deleteCliente,
    getLastSync, resetData, syncWithCatalog
  };
}