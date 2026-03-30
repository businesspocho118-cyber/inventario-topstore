import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useFirestore, ClienteFidelidad } from '../hooks/useFirestore';
import { useFirestoreInit } from '../hooks/useFirestoreInit';
import type { Producto, Pedido, DashboardStats } from '../types';

interface FirestoreContextType {
  isReady: boolean;
  // Productos
  productos: Producto[];
  subscribeToProductos: (callback: (productos: Producto[]) => void) => () => void;
  getProductos: () => Promise<Producto[]>;
  createProducto: (producto: Omit<Producto, 'id' | 'created_at' | 'updated_at'>) => Promise<Producto>;
  updateProducto: (id: string, data: Partial<Producto>) => Promise<void>;
  deleteProducto: (id: string) => Promise<void>;
  
  // Pedidos
  pedidos: Pedido[];
  subscribeToPedidos: (callback: (pedidos: Pedido[]) => void) => () => void;
  getPedidos: () => Promise<Pedido[]>;
  createPedido: (pedido: any) => Promise<{ pedido: Pedido; clienteActualizado: boolean }>;
  updatePedidoEstado: (id: number, estado: string) => Promise<void>;
  deletePedido: (id: number) => Promise<void>;
  
  // Clientes
  clientes: ClienteFidelidad[];
  subscribeToClientes: (callback: (clientes: ClienteFidelidad[]) => void) => () => void;
  getClientes: () => Promise<ClienteFidelidad[]>;
  updateCliente: (id: string, data: Partial<ClienteFidelidad>) => Promise<void>;
  deleteCliente: (id: string) => Promise<void>;
  
  // Stats
  getStats: () => Promise<DashboardStats>;
  
  // Catálogo
  syncWithCatalog: () => Promise<{ success: number; removed: number; errors: string[] }>;
  getLastSync: () => string | null;
  resetData: () => void;
  
  // Loading
  isLoading: boolean;
}

const FirestoreContext = createContext<FirestoreContextType | null>(null);

export function FirestoreProvider({ children }: { children: ReactNode }) {
  const { isMigrating } = useFirestoreInit();
  const firestore = useFirestore();
  
  // Estado local para datos en tiempo real
  const [productos, setProductos] = useState<Producto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<ClienteFidelidad[]>([]);
  
  // Suscribirse a cambios en tiempo real cuando esté listo
  useEffect(() => {
    if (isMigrating) return;
    
    // Suscribirse a productos
    const unsubProductos = firestore.subscribeToProductos((data) => {
      setProductos(data);
    });
    
    // Suscribirse a pedidos
    const unsubPedidos = firestore.subscribeToPedidos((data) => {
      setPedidos(data);
    });
    
    // Suscribirse a clientes
    const unsubClientes = firestore.subscribeToClientes((data) => {
      setClientes(data);
    });
    
    return () => {
      unsubProductos();
      unsubPedidos();
      unsubClientes();
    };
  }, [isMigrating]);

  const value: FirestoreContextType = {
    isReady: !isMigrating,
    productos,
    subscribeToProductos: firestore.subscribeToProductos,
    getProductos: firestore.getProductos,
    createProducto: firestore.createProducto,
    updateProducto: firestore.updateProducto,
    deleteProducto: firestore.deleteProducto,
    pedidos,
    subscribeToPedidos: firestore.subscribeToPedidos,
    getPedidos: firestore.getPedidos,
    createPedido: firestore.createPedido,
    updatePedidoEstado: firestore.updatePedidoEstado,
    deletePedido: firestore.deletePedido,
    clientes,
    subscribeToClientes: firestore.subscribeToClientes,
    getClientes: firestore.getClientes,
    updateCliente: firestore.updateCliente,
    deleteCliente: firestore.deleteCliente,
    getStats: firestore.getStats,
    // Catálogo
    syncWithCatalog: firestore.syncWithCatalog,
    getLastSync: firestore.getLastSync,
    resetData: firestore.resetData,
    isLoading: firestore.isLoading
  };

  return (
    <FirestoreContext.Provider value={value}>
      {children}
    </FirestoreContext.Provider>
  );
}

export function useFirestoreData() {
  const context = useContext(FirestoreContext);
  if (!context) {
    throw new Error('useFirestoreData must be used within FirestoreProvider');
  }
  return context;
}
