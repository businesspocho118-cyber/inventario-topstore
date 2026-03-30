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
    // Timeout de 10 segundos - si no responde, continuar de todos modos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout de conexión')), 10000)
    );

    try {
      console.log('🔄 Conectando a Firestore...');
      
      // Verificar si Firestore tiene datos (con timeout)
      const productosSnap = await Promise.race([
        getDocs(query(collection(db, 'productos'), limit(1))),
        timeoutPromise
      ]) as any;
      
      const pedidosSnap = await Promise.race([
        getDocs(query(collection(db, 'pedidos'), limit(1))),
        timeoutPromise
      ]) as any;
      
      const clientesSnap = await Promise.race([
        getDocs(query(collection(db, 'clientes_fidelidad'), limit(1))),
        timeoutPromise
      ]) as any;

      console.log('📊 Datos en Firestore:', {
        productos: productosSnap?.size || 0,
        pedidos: pedidosSnap?.size || 0,
        clientes: clientesSnap?.size || 0
      });

      const hasFirestoreData = (productosSnap?.size > 0) || (pedidosSnap?.size > 0) || (clientesSnap?.size > 0);

      if (hasFirestoreData) {
        console.log('✅ Datos encontrados en Firestore');
        setIsMigrating(false);
        return;
      }

      // Verificar localStorage
      const localProductos = localStorage.getItem(STORAGE_KEYS.productos);
      const localPedidos = localStorage.getItem(STORAGE_KEYS.pedidos);
      const localClientes = localStorage.getItem(STORAGE_KEYS.clientes_fidelidad);
      const hasLocalData = localProductos || localPedidos || localClientes;

      if (hasLocalData) {
        console.log('📦 Migrando de localStorage...');
        await migrateFromLocalStorage(
          localProductos ? JSON.parse(localProductos) : [],
          localPedidos ? JSON.parse(localPedidos) : [],
          localClientes ? JSON.parse(localClientes) : []
        );
      } else {
        console.log('ℹ️ Primera vez. Usá "Sincronizar Ahora" para obtener productos.');
      }

      setIsMigrating(false);
      console.log('✅ Listo');
    } catch (err: any) {
      console.warn('⚠️ Firestore no respondió a tiempo, continuando sin datos:', err?.message);
      // No bloquear la app - continuar sin datos de Firestore
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
