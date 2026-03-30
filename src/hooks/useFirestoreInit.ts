import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc,
  query,
  limit 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Producto, Pedido } from '../types';
import type { ClienteFidelidad } from './useFirestore';

const STORAGE_KEYS = {
  productos: 'topstore_productos',
  pedidos: 'topstore_pedidos',
  clientes_fidelidad: 'topstore_clientes_fidelidad'
};

export function useFirestoreInit() {
  const [isMigrating, setIsMigrating] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAndMigrate();
  }, []);

  const checkAndMigrate = async () => {
    try {
      // Verificar si Firestore tiene datos
      const productosSnap = await getDocs(query(collection(db, 'productos'), limit(1)));
      const pedidosSnap = await getDocs(query(collection(db, 'pedidos'), limit(1)));
      const clientesSnap = await getDocs(query(collection(db, 'clientes_fidelidad'), limit(1)));

      const hasFirestoreData = !productosSnap.empty || !pedidosSnap.empty || !clientesSnap.empty;

      if (hasFirestoreData) {
        // Ya hay datos en Firestore, no necesitamos migración
        console.log('Datos encontrados en Firestore, usando sincronización en tiempo real');
        setIsMigrating(false);
        return;
      }

      // Verificar si hay datos en localStorage
      const localProductos = localStorage.getItem(STORAGE_KEYS.productos);
      const localPedidos = localStorage.getItem(STORAGE_KEYS.pedidos);
      const localClientes = localStorage.getItem(STORAGE_KEYS.clientes_fidelidad);

      const hasLocalData = localProductos || localPedidos || localClientes;

      if (hasLocalData) {
        // Hay datos locales, necesitamos migrar
        setNeedsMigration(true);
        await migrateFromLocalStorage(
          localProductos ? JSON.parse(localProductos) : [],
          localPedidos ? JSON.parse(localPedidos) : [],
          localClientes ? JSON.parse(localClientes) : []
        );
      } else {
        // No hay datos en ningún lado, es la primera vez
        console.log('Primera vez, sin datos que migrar');
      }

      setIsMigrating(false);
    } catch (err) {
      console.error('Error en migración:', err);
      setError('Error al inicializar base de datos');
      setIsMigrating(false);
    }
  };

  const migrateFromLocalStorage = async (
    productos: Producto[], 
    pedidos: Pedido[], 
    clientes: ClienteFidelidad[]
  ) => {
    console.log('🚀 Migrando datos de localStorage a Firestore...');
    setIsMigrating(true);

    try {
      // 1. Migrar productos
      if (productos.length > 0) {
        for (const producto of productos) {
          const { id, created_at, updated_at, ...productoData } = producto;
          await addDoc(collection(db, 'productos'), {
            ...productoData,
            id: producto.id,
            created_at: producto.created_at || new Date().toISOString(),
            updated_at: producto.updated_at || new Date().toISOString()
          });
        }
        console.log(`✅ ${productos.length} productos migrados`);
      }

      // 2. Migrar pedidos
      if (pedidos.length > 0) {
        for (const pedido of pedidos) {
          await addDoc(collection(db, 'pedidos'), pedido);
        }
        console.log(`✅ ${pedidos.length} pedidos migrados`);
      }

      // 3. Migrar clientes de fidelidad
      if (clientes.length > 0) {
        for (const cliente of clientes) {
          const { id, ...clienteData } = cliente;
          await addDoc(collection(db, 'clientes_fidelidad'), clienteData);
        }
        console.log(`✅ ${clientes.length} clientes migrados`);
      }

      console.log('🎉 Migración completada!');
      
      // Limpiar localStorage después de migración exitosa
      localStorage.removeItem(STORAGE_KEYS.productos);
      localStorage.removeItem(STORAGE_KEYS.pedidos);
      localStorage.removeItem(STORAGE_KEYS.clientes_fidelidad);
      
    } catch (err) {
      console.error('Error durante migración:', err);
      throw err;
    }
  };

  return { isMigrating, needsMigration, error };
}
