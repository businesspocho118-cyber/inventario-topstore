import { useState, useEffect, useRef } from 'react';
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

// Cargar datos del JSON original como fallback
const loadDefaultData = async (): Promise<{ productos: Producto[], pedidos: Pedido[] }> => {
  try {
    const response = await fetch('/data/productos.json');
    const data = await response.json();
    return {
      productos: data.productos || [],
      pedidos: data.pedidos || []
    };
  } catch (e) {
    console.error('Error cargando datos por defecto:', e);
    return { productos: [], pedidos: [] };
  }
};

export function useFirestoreInit() {
  const [isMigrating, setIsMigrating] = useState(true);
  const [fallbackData, setFallbackData] = useState<{ productos: Producto[], pedidos: Pedido[] } | null>(null);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      checkAndMigrate();
    }
  }, []);

  const checkAndMigrate = async () => {
    try {
      console.log('🔄 Intentando conectar a Firestore...');
      
      // Solo esperar 5 segundos máximo
      const timeoutMs = 5000;
      let firestoreWorks = false;
      
      // Intentar conexión rápida
      try {
        const promise = getDocs(query(collection(db, 'productos'), limit(1)));
        const result = await Promise.race([promise, new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), timeoutMs)
        )]);
        firestoreWorks = true;
        console.log('✅ Firestore conectado');
      } catch (e: any) {
        console.log('⚠️ Firestore no disponible:', e?.message || 'error');
      }

      if (firestoreWorks) {
        // Verificar si hay datos en Firestore
        const snap = await getDocs(query(collection(db, 'productos'), limit(1)));
        if (!snap.empty) {
          console.log('✅ Datos encontrados en Firestore');
          setIsMigrating(false);
          return;
        }
        
        // Verificar localStorage
        const localProductos = localStorage.getItem(STORAGE_KEYS.productos);
        if (localProductos) {
          console.log('📦 Migrando de localStorage...');
          await migrateFromLocalStorage(
            JSON.parse(localProductos),
            [],
            []
          );
          setIsMigrating(false);
          return;
        }
      }

      // Si llegamos aquí, Firestore no funciona - cargar datos por defecto
      console.log('📦 Cargando datos por defecto (Fallback)...');
      const defaultData = await loadDefaultData();
      setFallbackData(defaultData);
      setIsMigrating(false);
      console.log('✅ Datos cargados desde JSON');
      
    } catch (err: any) {
      console.error('❌ Error:', err);
      // En caso de error, cargar datos por defecto
      const defaultData = await loadDefaultData();
      setFallbackData(defaultData);
      setIsMigrating(false);
    }
  };

  const migrateFromLocalStorage = async (
    productos: Producto[], 
    pedidos: Pedido[], 
    clientes: ClienteFidelidad[]
  ) => {
    console.log('🚀 Intentando migrar datos de localStorage a Firestore...');
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

  return { isMigrating, fallbackData };
}
