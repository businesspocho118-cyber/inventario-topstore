import { useState, useCallback, useEffect } from 'react';
import type { ApiResponse, Producto, Pedido, PedidoItem, DashboardStats, CreateProductoRequest, UpdateProductoRequest, CreatePedidoRequest } from '../types';
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

// Guardar en localStorage
const saveToLocal = () => {
  localStorage.setItem(STORAGE_KEYS.productos, JSON.stringify(productosDb));
  localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(pedidosDb));
  localStorage.setItem(STORAGE_KEYS.lastSync, new Date().toISOString());
};

// Cargar desde localStorage
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

// Cargar desde Supabase cuando no hay localStorage
const loadFromSupabaseAndSave = async () => {
  try {
    console.log('Cargando datos desde Supabase...');
    const { data: productosData } = await supabase.from(TABLES.PRODUCTOS).select('*').eq('activo', true).order('id');
    const { data: pedidosData } = await supabase.from(TABLES.PEDIDOS).select('*').order('id');
    const { data: clientesData } = await supabase.from(TABLES.CLIENTES).select('*').order('compras', { ascending: false });
    
    console.log('Desde Supabase:', productosData?.length || 0, 'productos,', pedidosData?.length || 0, 'pedidos,', clientesData?.length || 0, 'clientes');
    
    if (productosData && productosData.length > 0) {
      productosDb = productosData;
      nextProductoId = (productosDb.length ? Math.max(...productosDb.map(p => p.id)) : 0) + 1;
    }
    
    if (pedidosData && pedidosData.length > 0) {
      pedidosDb = pedidosData;
      nextPedidoId = (pedidosDb.length ? Math.max(...pedidosDb.map(p => p.id)) : 0) + 1;
    }
    
    // Guardar clientes en localStorage
    if (clientesData && clientesData.length > 0) {
      localStorage.setItem(STORAGE_KEYS.clientes, JSON.stringify(clientesData));
    }
    
    // GUARDAR en localStorage después de cargar de Supabase
    saveToLocal();
    console.log('Datos cargados desde Supabase y guardados en localStorage');
    return true;
  } catch (e) {
    console.error('Error loading from Supabase:', e);
    return false;
  }
};

// Sync a Supabase (sin espera) - solo el producto específico
const syncOneProductoToSupabase = async (producto: Producto) => {
  if (!supabaseConnected) return;
  try {
    await supabase.from(TABLES.PRODUCTOS).upsert({ ...producto, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  } catch (e) { /* ignore */ }
};

// Sync a Supabase - solo el pedido específico
const syncOnePedidoToSupabase = async (pedido: Pedido) => {
  if (!supabaseConnected) {
    console.log('No hay conexión a Supabase para sync pedido');
    return;
  }
  try {
    console.log('Sincronizando pedido a Supabase:', pedido.id, pedido.cliente_nombre);
    const { error } = await supabase.from(TABLES.PEDIDOS).upsert(pedido, { onConflict: 'id' });
    if (error) {
      console.error('Error sync pedido:', error);
    } else {
      console.log('Pedido sync OK:', pedido.id);
    }
  } catch (e) {
    console.error('Exception sync pedido:', e);
  }
};

// Sync un cliente a Supabase
const syncOneClienteToSupabase = async (cliente: any) => {
  if (!supabaseConnected) return;
  try {
    await supabase.from(TABLES.CLIENTES).upsert(cliente, { onConflict: 'id' });
  } catch (e) { /* ignore */ }
};

// Suscripciones para sync en tiempo real entre dispositivos
let subscriptionsSetup = false;

const setupRealtimeSubscriptions = (onDataChange: () => void) => {
  if (subscriptionsSetup || !supabaseConnected) return;
  
  try {
    // Suscribirse a cambios en productos
    supabase.channel('productos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.PRODUCTOS }, async () => {
        // Cuando hay cambio en Supabase, recargar datos
        await loadFromSupabaseAndSave();
        onDataChange();
      })
      .subscribe();

    // Suscribirse a cambios en pedidos
    supabase.channel('pedidos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.PEDIDOS }, async (payload) => {
        console.log('Cambio en pedidos detectado:', payload.eventType);
        await loadFromSupabaseAndSave();
        onDataChange();
      })
      .subscribe();

    // Suscribirse a cambios en clientes
    supabase.channel('clientes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.CLIENTES }, async () => {
        const { data } = await supabase.from(TABLES.CLIENTES).select('*').order('compras', { ascending: false });
        if (data) {
          localStorage.setItem(STORAGE_KEYS.clientes, JSON.stringify(data));
          console.log('Clientes actualizados desde Supabase:', data.length);
          onDataChange();
        }
      })
      .subscribe();

    subscriptionsSetup = true;
  } catch (e) { /* ignore */ }
};

// Check conexión
const checkConnection = async () => {
  if (supabaseConnected) return;
  try {
    const { error } = await supabase.from(TABLES.PRODUCTOS).select('id').limit(1);
    supabaseConnected = !error;
  } catch (e) { supabaseConnected = false; }
};

// Cargar datos iniciales - PRIORIDAD: localStorage > Supabase > JSON
const loadInitialData = async () => {
  // 1. Primero intentar localStorage
  if (loadFromLocal()) {
    return;
  }
  
  // 2. Si no hay localStorage, intentar Supabase
  await checkConnection();
  if (supabaseConnected) {
    if (await loadFromSupabaseAndSave()) {
      return;
    }
  }
  
  // 3. Si nada funciona, cargar desde JSON
  try {
    const response = await fetch('/data/productos.json');
    const data = await response.json() as { productos: Producto[]; pedidos: Pedido[] };
    productosDb = data.productos || [];
    pedidosDb = data.pedidos || [];
    saveToLocal();
    console.log('Datos cargados desde JSON');
  } catch (e) {
    console.error('Error loading from JSON:', e);
  }
};

export function useApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Efecto para configurar suscripciones en tiempo real (solo una vez)
  useEffect(() => {
    const setupSubscriptions = async () => {
      await checkConnection();
      if (supabaseConnected) {
        setupRealtimeSubscriptions(() => {
          // Cuando hay cambio en Supabase, actualizar el estado para re-render
          setRefreshTrigger(t => t + 1);
        });
      }
    };
    setupSubscriptions();
  }, []);

  // Cuando refreshTrigger cambia, recargar datos
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadFromLocal();
    }
  }, [refreshTrigger]);

  const getStats = useCallback(async (): Promise<ApiResponse<DashboardStats>> => {
    setIsLoading(true);
    await loadInitialData();
    
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
    await loadInitialData();
    setIsLoading(false);
    return { success: true, data: productosDb.filter(p => p.activo) };
  }, []);

  const createProducto = useCallback(async (req: CreateProductoRequest): Promise<ApiResponse<Producto>> => {
    setIsLoading(true);
    await loadInitialData();
    
    const nuevo: Producto = {
      id: nextProductoId++,
      ...req,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    productosDb.push(nuevo);
    saveToLocal();
    syncOneProductoToSupabase(nuevo);
    
    setIsLoading(false);
    return { success: true, data: nuevo };
  }, []);

  const updateProducto = useCallback(async (id: number, req: UpdateProductoRequest): Promise<ApiResponse<Producto>> => {
    setIsLoading(true);
    await loadInitialData();
    
    const idx = productosDb.findIndex(p => p.id === id);
    if (idx === -1) {
      setIsLoading(false);
      return { success: false, error: 'Producto no encontrado' };
    }
    
    productosDb[idx] = { ...productosDb[idx], ...req, updated_at: new Date().toISOString() };
    saveToLocal();
    syncOneProductoToSupabase(productosDb[idx]);
    
    setIsLoading(false);
    return { success: true, data: productosDb[idx] };
  }, []);

  const deleteProducto = useCallback(async (id: number): Promise<ApiResponse<void>> => {
    setIsLoading(true);
    await loadInitialData();
    
    const idx = productosDb.findIndex(p => p.id === id);
    if (idx === -1) {
      setIsLoading(false);
      return { success: false, error: 'Producto no encontrado' };
    }
    
    productosDb[idx].activo = false;
    productosDb[idx].updated_at = new Date().toISOString();
    saveToLocal();
    syncOneProductoToSupabase(productosDb[idx]);
    
    setIsLoading(false);
    return { success: true };
  }, []);

  const getPedidos = useCallback(async (): Promise<ApiResponse<Pedido[]>> => {
    setIsLoading(true);
    await loadInitialData();
    setIsLoading(false);
    return { success: true, data: [...pedidosDb] };
  }, []);

  const createPedido = useCallback(async (req: CreatePedidoRequest): Promise<ApiResponse<Pedido>> => {
    setIsLoading(true);
    await loadInitialData();
    
    if (!req.cliente_nombre || !req.cliente_telefono || req.items.length === 0) {
      setIsLoading(false);
      return { success: false, error: 'Faltan datos requeridos' };
    }
    
    const total = req.items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
    
    // Mapear items con nombres de productos
    const pedidoItems: PedidoItem[] = req.items.map(item => {
      const producto = productosDb.find(p => p.id === item.producto_id);
      return {
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        color: item.color,
        producto_nombre: producto?.nombre || `Producto #${item.producto_id}`
      };
    });

    const nuevo: Pedido = {
      id: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000), // ID en segundos (cabe en integer)
      fecha: new Date().toISOString(),
      cliente_nombre: req.cliente_nombre,
      cliente_telefono: req.cliente_telefono,
      cliente_direccion: req.cliente_direccion,
      cliente_barrio: req.cliente_barrio,
      cliente_referencias: req.cliente_referencias,
      metodo_pago: req.metodo_pago,
      notas: req.notas || '',
      estado: 'pendiente',
      total,
      items: pedidoItems
    };
    
    pedidosDb.push(nuevo);
    
    // Fidelidad
    const FIDELIDAD_KEY = 'topstore_clientes_fidelidad';
    let clientes: any[] = [];
    const stored = localStorage.getItem(FIDELIDAD_KEY);
    if (stored) clientes = JSON.parse(stored);
    
    const cIdx = clientes.findIndex(c => c.telefono === req.cliente_telefono);
    let clienteActualizado: any;
    
    if (cIdx !== -1) {
      clientes[cIdx].compras += 1;
      clienteActualizado = clientes[cIdx];
    } else {
      clienteActualizado = {
        id: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
        nombre: req.cliente_nombre,
        telefono: req.cliente_telefono,
        direccion: `${req.cliente_direccion}, ${req.cliente_barrio}`,
        referencias: req.cliente_referencias,
        ultimo_metodo_pago: req.metodo_pago,
        compras: 1,
        created_at: new Date().toISOString()
      };
      clientes.push(clienteActualizado);
    }
    localStorage.setItem(FIDELIDAD_KEY, JSON.stringify(clientes));
    syncOneClienteToSupabase(clienteActualizado);
    
    // Reducir stock total del producto
    req.items.forEach(item => {
      const p = productosDb.find(p => p.id === item.producto_id);
      if (p) {
        p.stock = Math.max(0, p.stock - item.cantidad);
        p.updated_at = new Date().toISOString();
        syncOneProductoToSupabase(p);
      }
    });
    
    saveToLocal();
    syncOnePedidoToSupabase(nuevo);
    
    setIsLoading(false);
    return { success: true, data: nuevo };
  }, []);

  const updatePedidoEstado = useCallback(async (id: number, estado: string): Promise<ApiResponse<Pedido>> => {
    setIsLoading(true);
    await loadInitialData();
    
    const idx = pedidosDb.findIndex(p => p.id === id);
    if (idx === -1) {
      setIsLoading(false);
      return { success: false, error: 'Pedido no encontrado' };
    }
    
    pedidosDb[idx].estado = estado as Pedido['estado'];
    saveToLocal();
    syncOnePedidoToSupabase(pedidosDb[idx]);
    
    setIsLoading(false);
    return { success: true, data: pedidosDb[idx] };
  }, []);

  const deletePedido = useCallback(async (id: number): Promise<ApiResponse<void>> => {
    setIsLoading(true);
    await loadInitialData();
    
    const idx = pedidosDb.findIndex(p => p.id === id);
    if (idx === -1) {
      setIsLoading(false);
      return { success: false, error: 'Pedido no encontrado' };
    }
    
    console.log('Eliminando pedido con ID:', id);
    
    // Primero eliminar de Supabase
    if (supabaseConnected) {
      const { error } = await supabase.from(TABLES.PEDIDOS).delete().eq('id', id);
      console.log('Resultado eliminación Supabase:', error ? 'Error: ' + error.message : 'OK');
    } else {
      console.log('No hay conexión a Supabase para eliminar');
    }
    
    // Luego eliminar localmente
    pedidosDb.splice(idx, 1);
    saveToLocal();
    
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
            productosDb.push({ id: nextProductoId++, product_id: productId, nombre: name, descripcion: '', precio: price, colores: colors, tallas: '', stock_por_color: stockPorColor, stock_por_talla: {}, genero: validGender, categoria: '', image_paths: imagePaths, stock: totalStock, activo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
          }
          success++;
        } catch (e) { errors.push(`Error: ${e}`); }
      });
      
      productosDb.forEach(p => { if (!catalogIds.includes(p.product_id) && p.activo) { p.activo = false; p.updated_at = new Date().toISOString(); } });
      
      // IMPORTANTE: Guardar en localStorage después de sincronizar
      saveToLocal();
      // Sync todos los productos a Supabase
      for (const p of productosDb) {
        await syncOneProductoToSupabase(p);
      }
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