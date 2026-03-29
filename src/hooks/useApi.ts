import { useState, useCallback } from 'react';
import type { 
  ApiResponse, 
  Producto, 
  Pedido, 
  DashboardStats,
  CreateProductoRequest,
  UpdateProductoRequest,
  CreatePedidoRequest 
} from '../types';

// Datos por defecto
const defaultData = {
  productos: [] as Producto[],
  pedidos: [] as Pedido[]
};

// Base de datos - se carga desde JSON
let productosDb: Producto[] = [];
let pedidosDb: Pedido[] = [];
let nextProductoId = 1;
let nextPedidoId = 1;
let dataLoaded = false;

// Storage keys
const STORAGE_KEYS = {
  productos: 'topstore_productos',
  pedidos: 'topstore_pedidos',
  lastSync: 'topstore_last_sync'
};

// Guardar en localStorage
const saveToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.productos, JSON.stringify(productosDb));
    localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(pedidosDb));
    localStorage.setItem(STORAGE_KEYS.lastSync, new Date().toISOString());
  } catch (e) {
    console.error('Error guardando en localStorage:', e);
  }
};

// Cargar datos desde JSON (con soporte localStorage)
const loadData = async () => {
  if (dataLoaded) return;
  
  try {
    // Primero intentar cargar desde localStorage
    const storedProductos = localStorage.getItem(STORAGE_KEYS.productos);
    const storedPedidos = localStorage.getItem(STORAGE_KEYS.pedidos);
    
    if (storedProductos && storedPedidos) {
      // Cargar desde localStorage
      productosDb = JSON.parse(storedProductos);
      pedidosDb = JSON.parse(storedPedidos);
      console.log('Datos cargados desde localStorage:', productosDb.length, 'productos');
    } else {
      // Cargar desde JSON original
      const response = await fetch('/data/productos.json');
      const data = await response.json() as { productos: Producto[]; pedidos: Pedido[] };
      productosDb = data.productos || [];
      pedidosDb = data.pedidos || [];
      // Guardar en localStorage para próxima vez
      saveToStorage();
      console.log('Datos cargados desde JSON:', productosDb.length, 'productos');
    }
    
    nextProductoId = (productosDb.length > 0 ? Math.max(...productosDb.map(p => p.id)) : 0) + 1;
    nextPedidoId = (pedidosDb.length > 0 ? Math.max(...pedidosDb.map(p => p.id)) : 0) + 1;
    dataLoaded = true;
  } catch (error) {
    console.error('Error loading data:', error);
    productosDb = [];
    pedidosDb = [];
    dataLoaded = true;
  }
};

// Resetear datos (recargar desde JSON original)
const resetToOriginal = () => {
  localStorage.removeItem(STORAGE_KEYS.productos);
  localStorage.removeItem(STORAGE_KEYS.pedidos);
  localStorage.removeItem(STORAGE_KEYS.lastSync);
  dataLoaded = false;
};

// URL del Catálogo (Cloudflare Workers)
const CATALOG_URL = 'https://topstore-catalogo.businesspocho118.workers.dev';

// Sincronizar productos desde el Catálogo
const syncFromCatalog = async (): Promise<{ success: number; errors: string[] }> => {
  const errors: string[] = [];
  let success = 0;

  try {
    // Obtener productos del catálogo (scraping del HTML)
    const response = await fetch(CATALOG_URL);
    const html = await response.text();
    
    // Parsear productos del HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const productCards = doc.querySelectorAll('.product-card');
    
    productCards.forEach((card, index) => {
      try {
        const productId = card.getAttribute('data-product-id') || '';
        const name = card.getAttribute('data-name') || '';
        const price = card.getAttribute('data-price') || '';
        const colors = card.getAttribute('data-colors') || '';
        const gender = card.getAttribute('data-gender') || '';
        
        // Obtener imágenes del gallery con URL completa
        const galleryAttr = card.getAttribute('data-gallery') || '[]';
        const gallery = JSON.parse(galleryAttr.replace(/&quot;/g, '"'));
        const imagePaths = gallery.map((img: any) => {
          const src = img.src || '';
          // Si la URL es relativa, agregar la base del catálogo
          if (src && !src.startsWith('http')) {
            return `${CATALOG_URL}/${src}`;
          }
          return src;
        });
        
        // Verificar si el producto ya existe
        const existingIndex = productosDb.findIndex(p => p.product_id === productId);
        const validGender = gender === 'mujeres' ? 'mujeres' : 'hombres';
        
        // Crear stock_por_color basado en los colores del catálogo
        const colorList = colors.split(', ').map((c: string) => c.trim()).filter((c: string) => c);
        const newStockPorColor: Record<string, number> = {};
        
        // Si existe, preservar el stock actual por color
        if (existingIndex !== -1 && productosDb[existingIndex].stock_por_color) {
          colorList.forEach((color: string) => {
            // Preservar stock existente o inicializar en 0
            newStockPorColor[color] = productosDb[existingIndex].stock_por_color?.[color] ?? 0;
          });
        } else {
          // Nuevo producto, inicializar todo en 0
          colorList.forEach((color: string) => {
            newStockPorColor[color] = 0;
          });
        }
        
        if (existingIndex !== -1) {
          // Actualizar producto existente
          productosDb[existingIndex] = {
            ...productosDb[existingIndex],
            nombre: name,
            precio: price,
            colores: colors,
            stock_por_color: newStockPorColor,
            stock: Object.values(newStockPorColor).reduce((a, b) => a + b, 0),
            genero: validGender,
            image_paths: imagePaths,
            updated_at: new Date().toISOString()
          };
        } else {
          // Crear nuevo producto
          const newProduct: Producto = {
            id: nextProductoId++,
            product_id: productId,
            nombre: name,
            descripcion: '',
            precio: price,
            colores: colors,
            stock_por_color: newStockPorColor,
            genero: validGender,
            categoria: '',
            image_paths: imagePaths,
            stock: 0,
            activo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          productosDb.push(newProduct);
        }
        success++;
      } catch (e) {
        errors.push(`Error procesando producto ${index}: ${e}`);
      }
    });
    
    // Guardar datos sincronizados en localStorage
    saveToStorage();
    
  } catch (error) {
    errors.push(`Error conectando al catálogo: ${error}`);
  }
  
  return { success, errors };
};

export function useApi() {
  const [isLoading, setIsLoading] = useState(false);

  // Dashboard
  const getStats = useCallback(async (): Promise<ApiResponse<DashboardStats>> => {
    setIsLoading(true);
    await loadData();
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
    await loadData();
    await new Promise(r => setTimeout(r, 300));
    const activos = productosDb.filter(p => p.activo);
    setIsLoading(false);
    return { success: true, data: activos };
  }, []);

  const getProducto = useCallback(async (id: number): Promise<ApiResponse<Producto>> => {
    setIsLoading(true);
    await loadData();
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
    await loadData();
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
    await saveToStorage();
    
    setIsLoading(false);
    return { success: true, data: nuevo };
  }, []);

  const updateProducto = useCallback(async (id: number, req: UpdateProductoRequest): Promise<ApiResponse<Producto>> => {
    setIsLoading(true);
    await loadData();
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
    
    await saveToStorage();
    
    setIsLoading(false);
    return { success: true, data: productosDb[index] };
  }, []);

  const deleteProducto = useCallback(async (id: number): Promise<ApiResponse<void>> => {
    setIsLoading(true);
    await loadData();
    await new Promise(r => setTimeout(r, 300));
    
    const index = productosDb.findIndex(p => p.id === id);
    if (index === -1) {
      setIsLoading(false);
      return { success: false, error: 'Producto no encontrado' };
    }
    
    productosDb[index].activo = false;
    productosDb[index].updated_at = new Date().toISOString();
    
    await saveToStorage();
    
    setIsLoading(false);
    return { success: true };
  }, []);

  // Pedidos
  const getPedidos = useCallback(async (): Promise<ApiResponse<Pedido[]>> => {
    setIsLoading(true);
    await loadData();
    await new Promise(r => setTimeout(r, 300));
    setIsLoading(false);
    return { success: true, data: [...pedidosDb] };
  }, []);

  const getPedido = useCallback(async (id: number): Promise<ApiResponse<Pedido>> => {
    setIsLoading(true);
    await loadData();
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
    await loadData();
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
    
    await saveToStorage();
    
    setIsLoading(false);
    return { success: true, data: nuevo };
  }, []);

  const updatePedidoEstado = useCallback(async (id: number, estado: string): Promise<ApiResponse<Pedido>> => {
    setIsLoading(true);
    await loadData();
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
    
    await saveToStorage();
    
    setIsLoading(false);
    return { success: true, data: pedidosDb[index] };
  }, []);

  // Sincronizar con catálogo
  const syncWithCatalog = useCallback(async (): Promise<ApiResponse<{ success: number; errors: string[] }>> => {
    setIsLoading(true);
    await loadData();
    const result = await syncFromCatalog();
    setIsLoading(false);
    
    if (result.errors.length > 0 && result.success === 0) {
      return { success: false, error: result.errors.join(', ') };
    }
    return { success: true, data: result };
  }, []);

  // Obtener última sincronización
  const getLastSync = useCallback((): string | null => {
    return localStorage.getItem(STORAGE_KEYS.lastSync);
  }, []);

  // Resetear a datos originales
  const resetData = useCallback(() => {
    resetToOriginal();
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
    updatePedidoEstado,
    syncWithCatalog,
    getLastSync,
    resetData
  };
}
