import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Producto, Pedido } from '../types';

// Tipos para clientes de fidelidad
export interface ClienteFidelidad {
  id: string;
  nombre: string;
  telefono: string;
  direccion?: string;
  referencias?: string;
  ultimo_metodo_pago?: 'efectivo' | 'transferencia';
  compras: number;
  created_at: string;
}

const COLLECTIONS = {
  PRODUCTOS: 'productos',
  PEDIDOS: 'pedidos',
  CLIENTES_FIDELIDAD: 'clientes_fidelidad'
};

export function useFirestore() {
  const [isLoading, setIsLoading] = useState(false);

  // ================== PRODUCTOS ==================
  
  // Helper para convertir documento a Producto
  const docToProducto = (doc: any): Producto => {
    const data = doc.data();
    return {
      ...data,
      id: typeof data.id === 'number' ? data.id : parseInt(data.id) || doc.id,
    } as Producto;
  };

  // Helper para convertir documento a Pedido
  const docToPedido = (doc: any): Pedido => {
    const data = doc.data();
    return {
      ...data,
      id: typeof data.id === 'number' ? data.id : parseInt(data.id) || doc.id,
    } as Pedido;
  };

  // Suscripción en tiempo real a productos
  const subscribeToProductos = (callback: (productos: Producto[]) => void) => {
    const q = query(collection(db, COLLECTIONS.PRODUCTOS), orderBy('nombre'));
    return onSnapshot(q, (snapshot) => {
      const productos = snapshot.docs.map(docToProducto);
      callback(productos);
    });
  };

  // Obtener productos (una vez)
  const getProductos = useCallback(async (): Promise<Producto[]> => {
    setIsLoading(true);
    const q = query(collection(db, COLLECTIONS.PRODUCTOS), orderBy('nombre'));
    const snapshot = await getDocs(q);
    setIsLoading(false);
    return snapshot.docs.map(docToProducto);
  }, []);

  // Agregar producto
  const createProducto = useCallback(async (producto: Omit<Producto, 'id' | 'created_at' | 'updated_at'>): Promise<Producto> => {
    setIsLoading(true);
    // Obtener el mayor ID actual
    const snapshot = await getDocs(collection(db, COLLECTIONS.PRODUCTOS));
    const maxId = snapshot.docs.reduce((max, doc) => {
      const docId = doc.data().id || 0;
      return docId > max ? docId : max;
    }, 0);
    
    const newProducto = {
      ...producto,
      id: maxId + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await addDoc(collection(db, COLLECTIONS.PRODUCTOS), newProducto);
    setIsLoading(false);
    return newProducto as Producto;
  }, []);

  // Actualizar producto
  const updateProducto = useCallback(async (id: string, data: Partial<Producto>): Promise<void> => {
    setIsLoading(true);
    const docRef = doc(db, COLLECTIONS.PRODUCTOS, id);
    await updateDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString()
    });
    setIsLoading(false);
  }, []);

  // Eliminar producto (soft delete)
  const deleteProducto = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    const docRef = doc(db, COLLECTIONS.PRODUCTOS, id);
    await updateDoc(docRef, {
      activo: false,
      updated_at: new Date().toISOString()
    });
    setIsLoading(false);
  }, []);

  // ================== PEDIDOS ==================

  // Suscripción en tiempo real a pedidos
  const subscribeToPedidos = (callback: (pedidos: Pedido[]) => void) => {
    const q = query(collection(db, COLLECTIONS.PEDIDOS), orderBy('id', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const pedidos = snapshot.docs.map(doc => ({
        id: doc.data().id || parseInt(doc.id),
        ...doc.data()
      })) as Pedido[];
      callback(pedidos);
    });
  };

  // Obtener pedidos (una vez)
  const getPedidos = useCallback(async (): Promise<Pedido[]> => {
    setIsLoading(true);
    const q = query(collection(db, COLLECTIONS.PEDIDOS), orderBy('id', 'desc'));
    const snapshot = await getDocs(q);
    setIsLoading(false);
    return snapshot.docs.map(doc => ({
      id: doc.data().id || parseInt(doc.id),
      ...doc.data()
    })) as Pedido[];
  }, []);

  // Crear pedido y actualizar cliente fidelidad
  const createPedido = useCallback(async (pedido: {
    cliente_nombre: string;
    cliente_telefono: string;
    cliente_direccion: string;
    cliente_barrio: string;
    cliente_referencias: string;
    metodo_pago: 'efectivo' | 'transferencia';
    notas: string;
    items: { producto_id: number; cantidad: number; precio_unitario: number; color: string }[];
    total: number;
  }): Promise<{ pedido: Pedido; clienteActualizado: boolean }> => {
    setIsLoading(true);

    // 1. Obtener el último ID de pedido
    const pedidosSnapshot = await getDocs(query(collection(db, COLLECTIONS.PEDIDOS)));
    const maxId = pedidosSnapshot.docs.reduce((max, doc) => {
      const docId = doc.data().id || 0;
      return docId > max ? docId : max;
    }, 0);
    const newId = maxId + 1;

    // 2. Crear el pedido
    const pedidoData = {
      ...pedido,
      id: newId,
      fecha: new Date().toISOString(),
      estado: 'pendiente'
    };

    await addDoc(collection(db, COLLECTIONS.PEDIDOS), pedidoData);

    // 3. Buscar o crear cliente en fidelidad
    const clientesRef = collection(db, COLLECTIONS.CLIENTES_FIDELIDAD);
    const clientesSnapshot = await getDocs(clientesRef);
    const clienteExistente = clientesSnapshot.docs.find(
      doc => doc.data().telefono === pedido.cliente_telefono
    );

    let clienteActualizado = false;

    if (clienteExistente) {
      // Actualizar cliente existente
      const clienteData = clienteExistente.data();
      await updateDoc(doc(db, COLLECTIONS.CLIENTES_FIDELIDAD, clienteExistente.id), {
        compras: (clienteData.compras || 0) + 1,
        direccion: `${pedido.cliente_direccion}, ${pedido.cliente_barrio}`,
        referencias: pedido.cliente_referencias,
        ultimo_metodo_pago: pedido.metodo_pago
      });
      clienteActualizado = true;
    } else {
      // Crear nuevo cliente
      await addDoc(clientesRef, {
        nombre: pedido.cliente_nombre,
        telefono: pedido.cliente_telefono,
        direccion: `${pedido.cliente_direccion}, ${pedido.cliente_barrio}`,
        referencias: pedido.cliente_referencias,
        ultimo_metodo_pago: pedido.metodo_pago,
        compras: 1,
        created_at: new Date().toISOString()
      });
      clienteActualizado = true;
    }

    setIsLoading(false);
    return { pedido: pedidoData as Pedido, clienteActualizado };
  }, []);

  // Actualizar estado de pedido
  const updatePedidoEstado = useCallback(async (id: number, estado: string): Promise<void> => {
    setIsLoading(true);
    const q = query(collection(db, COLLECTIONS.PEDIDOS));
    const snapshot = await getDocs(q);
    const docEncontrado = snapshot.docs.find(doc => doc.data().id === id);
    
    if (docEncontrado) {
      await updateDoc(doc(db, COLLECTIONS.PEDIDOS, docEncontrado.id), { estado });
    }
    setIsLoading(false);
  }, []);

  // Eliminar pedido
  const deletePedido = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    const q = query(collection(db, COLLECTIONS.PEDIDOS));
    const snapshot = await getDocs(q);
    const docEncontrado = snapshot.docs.find(doc => doc.data().id === id);
    
    if (docEncontrado) {
      await deleteDoc(doc(db, COLLECTIONS.PEDIDOS, docEncontrado.id));
    }
    setIsLoading(false);
  }, []);

  // ================== CLIENTES FIDELIDAD ==================

  // Suscripción en tiempo real a clientes
  const subscribeToClientes = (callback: (clientes: ClienteFidelidad[]) => void) => {
    const q = query(collection(db, COLLECTIONS.CLIENTES_FIDELIDAD), orderBy('nombre'));
    return onSnapshot(q, (snapshot) => {
      const clientes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClienteFidelidad[];
      callback(clientes);
    });
  };

  // Obtener clientes (una vez)
  const getClientes = useCallback(async (): Promise<ClienteFidelidad[]> => {
    setIsLoading(true);
    const q = query(collection(db, COLLECTIONS.CLIENTES_FIDELIDAD), orderBy('nombre'));
    const snapshot = await getDocs(q);
    setIsLoading(false);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ClienteFidelidad[];
  }, []);

  // Actualizar cliente
  const updateCliente = useCallback(async (id: string, data: Partial<ClienteFidelidad>): Promise<void> => {
    setIsLoading(true);
    const docRef = doc(db, COLLECTIONS.CLIENTES_FIDELIDAD, id);
    await updateDoc(docRef, data);
    setIsLoading(false);
  }, []);

  // Eliminar cliente
  const deleteCliente = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    const docRef = doc(db, COLLECTIONS.CLIENTES_FIDELIDAD, id);
    await deleteDoc(docRef);
    setIsLoading(false);
  }, []);

  // ================== ESTADÍSTICAS ==================

  const getStats = useCallback(async () => {
    setIsLoading(true);
    
    const [productosSnap, pedidosSnap, clientesSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.PRODUCTOS)),
      getDocs(collection(db, COLLECTIONS.PEDIDOS)),
      getDocs(collection(db, COLLECTIONS.CLIENTES_FIDELIDAD))
    ]);

    const productos = productosSnap.docs.map(d => d.data()) as Producto[];
    const pedidos = pedidosSnap.docs.map(d => d.data()) as Pedido[];
    const clientes = clientesSnap.docs.map(d => d.data()) as ClienteFidelidad[];

    const productosActivos = productos.filter(p => p.activo);
    const sinStock = productosActivos.filter(p => p.stock === 0).length;
    const pedidosEntregados = pedidos.filter(p => p.estado === 'entregado' || p.estado === 'pagado');
    const ingresos = pedidosEntregados.reduce((sum, p) => sum + p.total, 0);

    setIsLoading(false);

    return {
      total_productos: productosActivos.length,
      productos_sin_stock: sinStock,
      total_pedidos: pedidos.length,
      pedidos_pendientes: pedidos.filter(p => p.estado === 'pendiente').length,
      ingresos_totales: ingresos,
      clientes_fidelidad: clientes.length
    };
  }, []);

  return {
    isLoading,
    // Productos
    subscribeToProductos,
    getProductos,
    createProducto,
    updateProducto,
    deleteProducto,
    // Pedidos
    subscribeToPedidos,
    getPedidos,
    createPedido,
    updatePedidoEstado,
    deletePedido,
    // Clientes
    subscribeToClientes,
    getClientes,
    updateCliente,
    deleteCliente,
    // Stats
    getStats
  };
}
