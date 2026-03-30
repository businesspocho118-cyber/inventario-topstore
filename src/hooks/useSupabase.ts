import { useEffect, useCallback, useRef } from 'react';
import { supabase, TABLES } from '../supabase/config';
import type { Producto, Pedido } from '../types';

// Tipos para clientes de fidelidad
export interface ClienteFidelidad {
  id: number;
  nombre: string;
  telefono: string;
  direccion: string;
  referencias: string;
  ultimo_metodo_pago: string;
  compras: number;
  created_at: string;
}

interface UseSupabaseReturn {
  // Productos
  syncProducto: (producto: Producto) => Promise<void>;
  fetchProductos: () => Promise<Producto[]>;
  
  // Pedidos
  syncPedido: (pedido: Pedido) => Promise<void>;
  deletePedido: (pedidoId: number) => Promise<void>;
  fetchPedidos: () => Promise<Pedido[]>;
  
  // Clientes Fidelidad
  syncCliente: (cliente: ClienteFidelidad) => Promise<void>;
  deleteCliente: (clienteId: number) => Promise<void>;
  fetchClientes: () => Promise<ClienteFidelidad[]>;
  
  // Suscripciones en tiempo real
  subscribeToChanges: (callbacks: {
    onProductoChange?: () => void;
    onPedidoChange?: () => void;
    onClienteChange?: () => void;
  }) => () => void;
  
  // Estado de conexión
  isConnected: boolean;
}

// Clave para localStorage (fallback)
const STORAGE_KEYS = {
  productos: 'topstore_productos',
  pedidos: 'topstore_pedidos',
  clientes: 'topstore_clientes_fidelidad',
  lastSync: 'topstore_last_sync'
};

export function useSupabase(): UseSupabaseReturn {
  const isConnected = useRef(false);
  const channelsRef = useRef<any[]>([]);

  // Verificar conexión a Supabase
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from(TABLES.PRODUCTOS).select('id').limit(1);
        isConnected.current = !error;
        console.log('Supabase connection:', isConnected.current ? 'OK' : 'FAILED');
      } catch (e) {
        isConnected.current = false;
        console.log('Supabase connection: FAILED');
      }
    };
    checkConnection();
  }, []);

  // ===== PRODUCTOS =====

  const syncProducto = useCallback(async (producto: Producto): Promise<void> => {
    if (!isConnected.current) {
      console.log('Supabase not connected, skipping sync');
      return;
    }

    try {
      const { error } = await supabase
        .from(TABLES.PRODUCTOS)
        .upsert({
          id: producto.id,
          product_id: producto.product_id,
          nombre: producto.nombre,
          descripcion: producto.descripcion,
          precio: producto.precio,
          colores: producto.colores,
          stock_por_color: producto.stock_por_color,
          genero: producto.genero,
          categoria: producto.categoria,
          image_paths: producto.image_paths,
          stock: producto.stock,
          activo: producto.activo,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error syncing producto to Supabase:', error);
      }
    } catch (e) {
      console.error('Exception syncing producto:', e);
    }
  }, []);

  const fetchProductos = useCallback(async (): Promise<Producto[]> => {
    if (!isConnected.current) {
      // Fallback a localStorage
      const stored = localStorage.getItem(STORAGE_KEYS.productos);
      return stored ? JSON.parse(stored) : [];
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.PRODUCTOS)
        .select('*')
        .eq('activo', true)
        .order('id');

      if (error) throw error;

      // Guardar en localStorage como backup
      if (data) {
        localStorage.setItem(STORAGE_KEYS.productos, JSON.stringify(data));
      }

      return data || [];
    } catch (e) {
      console.error('Error fetching productos:', e);
      // Fallback a localStorage
      const stored = localStorage.getItem(STORAGE_KEYS.productos);
      return stored ? JSON.parse(stored) : [];
    }
  }, []);

  // ===== PEDIDOS =====

  const syncPedido = useCallback(async (pedido: Pedido): Promise<void> => {
    if (!isConnected.current) return;

    try {
      const { error } = await supabase
        .from(TABLES.PEDIDOS)
        .upsert({
          id: pedido.id,
          fecha: pedido.fecha,
          cliente_nombre: pedido.cliente_nombre,
          cliente_telefono: pedido.cliente_telefono,
          cliente_direccion: pedido.cliente_direccion,
          cliente_barrio: pedido.cliente_barrio,
          cliente_referencias: pedido.cliente_referencias,
          metodo_pago: pedido.metodo_pago,
          estado: pedido.estado,
          total: pedido.total,
          notas: pedido.notas
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error syncing pedido to Supabase:', error);
      }
    } catch (e) {
      console.error('Exception syncing pedido:', e);
    }
  }, []);

  const deletePedido = useCallback(async (pedidoId: number): Promise<void> => {
    if (!isConnected.current) return;

    try {
      const { error } = await supabase
        .from(TABLES.PEDIDOS)
        .delete()
        .eq('id', pedidoId);

      if (error) {
        console.error('Error deleting pedido from Supabase:', error);
      }
    } catch (e) {
      console.error('Exception deleting pedido:', e);
    }
  }, []);

  const fetchPedidos = useCallback(async (): Promise<Pedido[]> => {
    if (!isConnected.current) {
      const stored = localStorage.getItem(STORAGE_KEYS.pedidos);
      return stored ? JSON.parse(stored) : [];
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.PEDIDOS)
        .select('*')
        .order('id');

      if (error) throw error;

      if (data) {
        localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(data));
      }

      return data || [];
    } catch (e) {
      console.error('Error fetching pedidos:', e);
      const stored = localStorage.getItem(STORAGE_KEYS.pedidos);
      return stored ? JSON.parse(stored) : [];
    }
  }, []);

  // ===== CLIENTES FIDELIDAD =====

  const syncCliente = useCallback(async (cliente: ClienteFidelidad): Promise<void> => {
    if (!isConnected.current) return;

    try {
      const { error } = await supabase
        .from(TABLES.CLIENTES)
        .upsert({
          id: cliente.id,
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          direccion: cliente.direccion,
          referencias: cliente.referencias,
          ultimo_metodo_pago: cliente.ultimo_metodo_pago,
          compras: cliente.compras,
          created_at: cliente.created_at
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error syncing cliente to Supabase:', error);
      }
    } catch (e) {
      console.error('Exception syncing cliente:', e);
    }
  }, []);

  const deleteCliente = useCallback(async (clienteId: number): Promise<void> => {
    if (!isConnected.current) return;

    try {
      const { error } = await supabase
        .from(TABLES.CLIENTES)
        .delete()
        .eq('id', clienteId);

      if (error) {
        console.error('Error deleting cliente from Supabase:', error);
      }
    } catch (e) {
      console.error('Exception deleting cliente:', e);
    }
  }, []);

  const fetchClientes = useCallback(async (): Promise<ClienteFidelidad[]> => {
    if (!isConnected.current) {
      const stored = localStorage.getItem(STORAGE_KEYS.clientes);
      return stored ? JSON.parse(stored) : [];
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.CLIENTES)
        .select('*')
        .order('compras', { ascending: false });

      if (error) throw error;

      if (data) {
        localStorage.setItem(STORAGE_KEYS.clientes, JSON.stringify(data));
      }

      return data || [];
    } catch (e) {
      console.error('Error fetching clientes:', e);
      const stored = localStorage.getItem(STORAGE_KEYS.clientes);
      return stored ? JSON.parse(stored) : [];
    }
  }, []);

  // ===== SUSCRIPCIONES EN TIEMPO REAL =====

  const subscribeToChanges = useCallback((callbacks: {
    onProductoChange?: () => void;
    onPedidoChange?: () => void;
    onClienteChange?: () => void;
  }): (() => void) => {
    // Limpiar suscripciones anteriores
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    if (!isConnected.current) {
      console.log('Supabase not connected, skipping subscriptions');
      return () => {};
    }

    const channels: any[] = [];

    // Suscripción a productos
    if (callbacks.onProductoChange) {
      const productoChannel = supabase
        .channel('productos-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: TABLES.PRODUCTOS },
          () => {
            console.log('Producto change detected from Supabase!');
            callbacks.onProductoChange?.();
          }
        )
        .subscribe();

      channels.push(productoChannel);
    }

    // Suscripción a pedidos
    if (callbacks.onPedidoChange) {
      const pedidoChannel = supabase
        .channel('pedidos-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: TABLES.PEDIDOS },
          () => {
            console.log('Pedido change detected from Supabase!');
            callbacks.onPedidoChange?.();
          }
        )
        .subscribe();

      channels.push(pedidoChannel);
    }

    // Suscripción a clientes
    if (callbacks.onClienteChange) {
      const clienteChannel = supabase
        .channel('clientes-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: TABLES.CLIENTES },
          () => {
            console.log('Cliente change detected from Supabase!');
            callbacks.onClienteChange?.();
          }
        )
        .subscribe();

      channels.push(clienteChannel);
    }

    channelsRef.current = channels;

    // Función de limpieza
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, []);

  return {
    syncProducto,
    fetchProductos,
    syncPedido,
    deletePedido,
    fetchPedidos,
    syncCliente,
    deleteCliente,
    fetchClientes,
    subscribeToChanges,
    isConnected: isConnected.current
  };
}
