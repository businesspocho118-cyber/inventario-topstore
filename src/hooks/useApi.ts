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
  
  // Verificar que los datos no estén vacíos o sean válidos
  if (storedP && storedO) {
    try {
      const productos = JSON.parse(storedP);
      const pedidos = JSON.parse(storedO);
      
      // Solo retornar true si hay productos reales
      if (productos && Array.isArray(productos) && productos.length > 0) {
        productosDb = productos;
        pedidosDb = pedidos;
        nextProductoId = (productosDb.length ? Math.max(...productosDb.map(p => p.id)) : 0) + 1;
        nextPedidoId = (pedidosDb.length ? Math.max(...pedidosDb.map(p => p.id)) : 0) + 1;
        return true;
      }
    } catch (e) {
      // Si hay error de parsing, considerar como vacío
    }
  }
  return false;
};

// Cargar desde Supabase cuando no hay localStorage
const loadFromSupabaseAndSave = async () => {
  try {
    console.log('[Load] Cargando desde Supabase...');
    const { data: productosData, error: productosError } = await supabase.from(TABLES.PRODUCTOS).select('*').order('id');
    
    if (productosError) {
      console.error('[Load] Error cargando productos:', productosError);
    }
    
    const { data: pedidosData, error: pedidosError } = await supabase.from(TABLES.PEDIDOS).select('*').order('id');
    
    if (pedidosError) {
      console.error('[Load] Error cargando pedidos:', pedidosError);
    }
    
    const { data: clientesData, error: clientesError } = await supabase.from(TABLES.CLIENTES).select('*').order('compras', { ascending: false });
    
    if (clientesError) {
      console.error('[Load] Error cargando clientes:', clientesError);
    }
    
    console.log('[Load] Productos desde Supabase:', productosData?.length || 0);
    console.log('[Load] Pedidos desde Supabase:', pedidosData?.length || 0);
    console.log('[Load] Clientes desde Supabase:', clientesData?.length || 0);
    
    if (productosData && productosData.length > 0) {
      productosDb = productosData;
      nextProductoId = (productosDb.length ? Math.max(...productosDb.map(p => p.id)) : 0) + 1;
      // IMPORTANTE: Guardar en localStorage
      localStorage.setItem(STORAGE_KEYS.productos, JSON.stringify(productosDb));
    }
    
    if (pedidosData && pedidosData.length > 0) {
      pedidosDb = pedidosData;
      nextPedidoId = (pedidosDb.length ? Math.max(...pedidosDb.map(p => p.id)) : 0) + 1;
      // IMPORTANTE: Guardar en localStorage
      localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(pedidosDb));
    }
    
    // Guardar clientes en localStorage
    if (clientesData && clientesData.length > 0) {
      localStorage.setItem(STORAGE_KEYS.clientes, JSON.stringify(clientesData));
    }
    
    // GUARDAR en localStorage después de cargar de Supabase
    saveToLocal();
    console.log('[Load] Datos guardados en localStorage');
    return true;
  } catch (e) {
    console.error('[Load] Error general:', e);
    return false;
  }
};

// Sync a Supabase (sin espera) - solo el producto específico
const syncOneProductoToSupabase = async (producto: Producto) => {
  if (!supabaseConnected) return;
  try {
    // Sync todos los campos incluyendo tallas y unidades
    const productoToSync = {
      id: producto.id,
      product_id: producto.product_id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio,
      colores: producto.colores,
      tallas: producto.tallas || '',
      genero: producto.genero,
      categoria: producto.categoria,
      image_paths: producto.image_paths,
      stock: producto.stock,
      activo: producto.activo,
      unidades: producto.unidades || {},
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from(TABLES.PRODUCTOS).upsert(productoToSync, { onConflict: 'id' });
    if (error) {
      console.error('Error sync producto:', error.message, error.details);
    }
  } catch (e) { 
    console.error('Exception sync producto:', e);
  }
};

// Sync a Supabase - solo el pedido específico
const syncOnePedidoToSupabase = async (pedido: Pedido) => {
  if (!supabaseConnected) {
    return;
  }
  try {
    const pedidoToSync = {
      id: pedido.id,
      fecha: pedido.fecha,
      cliente_nombre: pedido.cliente_nombre,
      cliente_telefono: pedido.cliente_telefono,
      cliente_direccion: pedido.cliente_direccion || '',
      cliente_barrio: pedido.cliente_barrio || '',
      cliente_referencias: pedido.cliente_referencias || '',
      metodo_pago: pedido.metodo_pago || 'efectivo',
      estado: pedido.estado || 'reservado',
      total: pedido.total || 0,
      notas: pedido.notas || '',
      items: pedido.items || []
    };
    const { error } = await supabase.from(TABLES.PEDIDOS).upsert(pedidoToSync, { onConflict: 'id' });
    if (error) {
      console.error('Error sync pedido:', error.message, error.details);
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
let lastSyncTime = 0;
const SYNC_COOLDOWN = 3000; // 3 segundos entre sincronizaciones para evitar loops

const setupRealtimeSubscriptions = (onDataChange: () => void) => {
  // Deshabilitado: las suscripciones en tiempo real causaban loops de sincronización
  // El sync ahora es manual desde Configuración
  return;
  
  if (subscriptionsSetup || !supabaseConnected) return;
  
  try {
    // Suscribirse a cambios en productos
    supabase.channel('productos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.PRODUCTOS }, async () => {
        // Solo recargar si pasaron más de 3 segundos desde el último sync (evitar loops)
        const now = Date.now();
        if (now - lastSyncTime > SYNC_COOLDOWN) {
          lastSyncTime = now;
          await loadFromSupabaseAndSave();
          onDataChange();
        }
      })
      .subscribe();

    // Suscribirse a cambios en pedidos
    supabase.channel('pedidos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.PEDIDOS }, async (payload) => {
        const now = Date.now();
        if (now - lastSyncTime > SYNC_COOLDOWN) {
          lastSyncTime = now;
          await loadFromSupabaseAndSave();
          onDataChange();
        }
      })
      .subscribe();

    // Suscribirse a cambios en clientes
    supabase.channel('clientes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.CLIENTES }, async () => {
        const now = Date.now();
        if (now - lastSyncTime > SYNC_COOLDOWN) {
          lastSyncTime = now;
          const { data } = await supabase.from(TABLES.CLIENTES).select('*').order('compras', { ascending: false });
          if (data) {
            localStorage.setItem(STORAGE_KEYS.clientes, JSON.stringify(data));
            onDataChange();
          }
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

// Cargar datos iniciales - PRIORIDAD: localStorage > Supabase > JSON (como estaba antes)
const loadInitialData = async () => {
  console.log('[Init] Iniciando carga de datos...');
  
  // 1. Primero intentar localStorage (más rápido)
  const localLoaded = loadFromLocal();
  if (localLoaded) {
    console.log('[Init] Datos cargados desde localStorage:', productosDb.length, 'productos');
    // NO hacer sync automático en background - el usuario sync manualmente desde Configuración
    return;
  }
  console.log('[Init] localStorage vacío o inválido');
  
  // 2. Si no hay localStorage, intentar Supabase
  await checkConnection();
  if (supabaseConnected) {
    console.log('[Init] Supabase conectado, intentando cargar...');
    if (await loadFromSupabaseAndSave()) {
      console.log('[Init] Datos cargados desde Supabase y guardados en localStorage');
      return;
    }
  }
  console.log('[Init] No se pudo cargar desde Supabase, intentando JSON...');
  
  // 3. Si nada funciona, cargar desde JSON
  try {
    const response = await fetch('/data/productos.json');
    const data = await response.json() as { productos: Producto[]; pedidos: Pedido[] };
    if (data.productos && data.pedidos) {
      productosDb = data.productos;
      pedidosDb = data.pedidos;
      nextProductoId = (productosDb.length ? Math.max(...productosDb.map(p => p.id)) : 0) + 1;
      nextPedidoId = (pedidosDb.length ? Math.max(...pedidosDb.map(p => p.id)) : 0) + 1;
      saveToLocal();
    }
  } catch (e) {
    console.error('Error loading JSON:', e);
  }
};

export function useApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Efecto para configurar suscripciones en tiempo real (solo una vez)
  useEffect(() => {
    // Suscripciones deshabilitadas - sync manual desde Configuración
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
    
    // Calcular valor del inventario (precio * stock de cada unidad)
    let valorInventario = 0;
    activos.forEach(p => {
      const precio = parseInt(p.precio.replace(/[$.]/g, '')) || 0;
      valorInventario += precio * p.stock;
    });
    
    // Productos por género
    const hombres = activos.filter(p => p.genero === 'hombres');
    const mujeres = activos.filter(p => p.genero === 'mujeres');
    
    const stats: DashboardStats = {
      total_productos: activos.length,
      productos_sin_stock: activos.filter(p => p.stock === 0).length,
      total_pedidos: pedidosDb.length,
      pedidos_pendientes: pedidosDb.filter(p => p.estado === 'reservado').length,
      ingresos_totales: pedidosDb.filter(p => p.estado === 'entregado').reduce((s, p) => s + p.total, 0),
      valor_inventario: valorInventario,
      productos_hombres: hombres.length,
      productos_mujeres: mujeres.length,
      productos_hombres_sinstock: hombres.filter(p => p.stock === 0).length,
      productos_mujeres_sinstock: mujeres.filter(p => p.stock === 0).length
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
    await syncOneProductoToSupabase(nuevo);
    
    setIsLoading(false);
    return { success: true, data: nuevo };
  }, []);

  const updateProducto = useCallback(async (id: number, req: UpdateProductoRequest): Promise<ApiResponse<Producto>> => {
    setIsLoading(true);
    // ALWAYS recargar desde Supabase antes de modificar para tener datos frescos
    await checkConnection();
    if (supabaseConnected) {
      const { data: supabaseData } = await supabase.from(TABLES.PRODUCTOS).select('*').eq('id', id).single();
      if (supabaseData) {
        // Actualizar productosDb con datos frescos de Supabase
        const idx = productosDb.findIndex(p => p.id === id);
        if (idx !== -1) {
          productosDb[idx] = supabaseData;
        }
        // También guardar en localStorage
        localStorage.setItem(STORAGE_KEYS.productos, JSON.stringify(productosDb));
      }
    }
    
    const idx = productosDb.findIndex(p => p.id === id);
    if (idx === -1) {
      setIsLoading(false);
      return { success: false, error: 'Producto no encontrado' };
    }
    
    console.log('[Update] Actualizando producto:', id, req);
    productosDb[idx] = { ...productosDb[idx], ...req, updated_at: new Date().toISOString() };
    console.log('[Update] Producto actualizado:', productosDb[idx].product_id, 'stock:', productosDb[idx].stock);
    saveToLocal();
    // Await para asegurar que termine antes de que el usuario cierre o recargue
    await syncOneProductoToSupabase(productosDb[idx]);
    console.log('[Update] Sync completado');
    
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
    await syncOneProductoToSupabase(productosDb[idx]);
    
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
        talla: item.talla,
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
      estado: 'reservado',
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
        // Reducir stock de la combinación específica color+talla
        const key = `${item.color}-${item.talla}`;
        if (p.unidades && p.unidades[key] !== undefined) {
          p.unidades[key] = Math.max(0, p.unidades[key] - item.cantidad);
        }
        // Recalcular stock total
        p.stock = Object.values(p.unidades || {}).reduce((a, b) => a + b, 0);
        p.updated_at = new Date().toISOString();
        syncOneProductoToSupabase(p);
      }
    });
    
    saveToLocal();
    await syncOnePedidoToSupabase(nuevo);
    
    setIsLoading(false);
    return { success: true, data: nuevo };
  }, []);

  const updatePedidoEstado = useCallback(async (id: number, estado: string): Promise<ApiResponse<Pedido>> => {
    setIsLoading(true);
    // ALWAYS recargar desde Supabase antes de modificar para tener datos frescos
    await checkConnection();
    if (supabaseConnected) {
      const { data: supabaseData } = await supabase.from(TABLES.PEDIDOS).select('*').eq('id', id).single();
      if (supabaseData) {
        // Actualizar pedidosDb con datos frescos de Supabase
        const idx = pedidosDb.findIndex(p => p.id === id);
        if (idx !== -1) {
          pedidosDb[idx] = supabaseData;
        }
        // También guardar en localStorage
        localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(pedidosDb));
      }
    }
    
    const idx = pedidosDb.findIndex(p => p.id === id);
    if (idx === -1) {
      setIsLoading(false);
      return { success: false, error: 'Pedido no encontrado' };
    }
    
    console.log('[UpdatePedido] Cambiando estado:', id, 'de', pedidosDb[idx].estado, 'a', estado);
    pedidosDb[idx].estado = estado as Pedido['estado'];
    saveToLocal();
    await syncOnePedidoToSupabase(pedidosDb[idx]);
    console.log('[UpdatePedido] Sync completado');
    
    setIsLoading(false);

    return { success: true, data: pedidosDb[idx] };
  }, []);

  const updatePedido = useCallback(async (id: number, data: Partial<Pedido>): Promise<ApiResponse<Pedido>> => {
    setIsLoading(true);
    // ALWAYS recargar desde Supabase antes de modificar para tener datos frescos
    await checkConnection();
    if (supabaseConnected) {
      const { data: supabaseData } = await supabase.from(TABLES.PEDIDOS).select('*').eq('id', id).single();
      if (supabaseData) {
        const idx = pedidosDb.findIndex(p => p.id === id);
        if (idx !== -1) {
          pedidosDb[idx] = supabaseData;
        }
        localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(pedidosDb));
      }
    }
    
    const idx = pedidosDb.findIndex(p => p.id === id);
    if (idx === -1) {
      setIsLoading(false);
      return { success: false, error: 'Pedido no encontrado' };
    }
    
    pedidosDb[idx] = { ...pedidosDb[idx], ...data };
    saveToLocal();
    await syncOnePedidoToSupabase(pedidosDb[idx]);
    
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
    
    // Primero eliminar de Supabase
    if (supabaseConnected) {
      await supabase.from(TABLES.PEDIDOS).delete().eq('id', id);
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
    let catalogoProcesado = false;
    
    try {
      const response = await fetch(CATALOG_URL);
      if (!response.ok) {
        errors.push(`Conexión: HTTP ${response.status}`);
        throw new Error(`HTTP ${response.status}`);
      }
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      // El catálogo usa .preview-card que también tiene la clase .product-card
      const cards = doc.querySelectorAll('.preview-card.product-card');
      console.log('[Sync] Productos encontrados en catálogo:', cards.length);
      catalogoProcesado = true;
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
          const imagePaths = gallery.map((img: any) => img.src?.startsWith('http') ? img.src : `${CATALOG_URL}/${img.src}`);
          
          // Buscar si ya existe el producto
          const existIdx = productosDb.findIndex(p => p.product_id === productId);
          
          if (existIdx === -1) {
            // Producto nuevo - agregarlo
            console.log('[Sync] 🆕 AGREGANDO:', productId, '-', name);
            productosDb.push({ id: nextProductoId++, product_id: productId, nombre: name, descripcion: '', precio: price, colores: colors, tallas: '', unidades: {}, genero: validGender, categoria: '', image_paths: imagePaths, stock: 0, activo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
            success++;
          } else {
            // Producto ya existe - asegurarnos que esté activo
            console.log('[Sync] ✅ Ya existe, activando:', productId);
            productosDb[existIdx].activo = true;
          }
        } catch (e) { errors.push(`Error: ${e}`); }
      });
      
      console.log('[Sync] ✅ Productos nuevos agregados:', success);
      console.log('[Sync] 📦 Total productos en inventario:', productosDb.length);
      console.log('[Sync] 📋 IDs en catálogo:', catalogIds);
      console.log('[Sync] 📋 IDs en inventario:', productosDb.map(p => p.product_id));
      
      // Guardar en localStorage los productos nuevos agregados
      saveToLocal();
      
      // IMPORTANT: Sync TODOS los productos a Supabase para actualizar el stock
      // Esto hace que el catálogo muestre el stock correcto
      for (const p of productosDb) {
        await syncOneProductoToSupabase(p);
      }
    } catch (e) { errors.push(`Conexión: ${e}`); }
    
    setIsLoading(false);
    // Retornar success > 0 para indicar que el catálogo se procesó correctamente
    // aunque no haya productos nuevos (porque ya existían todos)
    return { success, removed, errors, catalogoOk: success > 0 || catalogoProcesado };
  }, []);

  // Exportar datos a CSV
  const exportToCSV = useCallback(() => {
    // Cargar datos actuales
    loadFromLocal();
    
    const today = new Date().toISOString().split('T')[0];
    
    // --- PRODUCTOS ---
    const productosHeaders = ['ID', 'Nombre', 'Categoría', 'Género', 'Precio', 'Colores', 'Tallas', 'Stock Total'];
    const productosRows = productosDb
      .filter(p => p.activo)
      .map(p => [
        p.id,
        `"${p.nombre}"`,
        p.categoria,
        p.genero,
        p.precio,
        `"${p.colores}"`,
        `"${p.tallas || ''}"`,
        p.stock
      ]);
    
    const productosCSV = [productosHeaders.join(','), ...productosRows.map(r => r.join(','))].join('\n');
    
    // --- PEDIDOS ---
    const pedidosHeaders = ['ID', 'Fecha', 'Cliente', 'Teléfono', 'Dirección', 'Barrio', 'Método Pago', 'Estado', 'Total', 'Notas'];
    const pedidosRows = pedidosDb.map(p => [
      p.id,
      p.fecha,
      `"${p.cliente_nombre}"`,
      p.cliente_telefono,
      `"${p.cliente_direccion || ''}"`,
      `"${p.cliente_barrio || ''}"`,
      p.metodo_pago || '',
      p.estado,
      p.total,
      `"${p.notas || ''}"`
    ]);
    
    const pedidosCSV = [pedidosHeaders.join(','), ...pedidosRows.map((r: (string | number)[]) => r.join(','))].join('\n');
    
    // --- CLIENTES ---
    const stored = localStorage.getItem(STORAGE_KEYS.clientes);
    const clientes = stored ? JSON.parse(stored) : [];
    const clientesHeaders = ['ID', 'Nombre', 'Teléfono', 'Puntos', 'Compras'];
    const clientesRows = clientes.map((c: any) => [
      c.id,
      `"${c.nombre}"`,
      c.telefono,
      c.puntos || 0,
      c.compras || 0
    ]);
    
    const clientesCSV = [clientesHeaders.join(','), ...clientesRows.map((r: (string | number)[]) => r.join(','))].join('\n');
    
    // Combinar todo en un solo archivo con separadores
    const fullCSV = `=== PRODUCTOS ===\n${productosCSV}\n\n=== PEDIDOS ===\n${pedidosCSV}\n\n=== CLIENTES ===\n${clientesCSV}`;
    
    // Descargar archivo
    const blob = new Blob(['\ufeff' + fullCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Inventario_TopStore_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    return { success: true };
  }, []);

  return {
    isLoading, getStats, getProductos, getPedidos, createProducto, updateProducto, deleteProducto,
    createPedido, updatePedidoEstado, updatePedido, deletePedido, getClientes, saveCliente, deleteCliente,
    getLastSync, resetData, syncWithCatalog, exportToCSV
  };
}