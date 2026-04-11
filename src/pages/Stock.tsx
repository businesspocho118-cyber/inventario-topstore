import { useState, useEffect, useMemo } from 'react';
import { Search, Package, Image as ImageIcon } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { PageLoading } from '../components/Loading';
import { ColorCircle } from '../components/ColorCircle';
import type { Producto } from '../types';
import styles from './Stock.module.css';

export function Stock() {
  const { getProductos, isLoading } = useApi();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = async () => {
    const result = await getProductos();
    if (result.success && result.data) {
      setProductos(result.data);
    }
  };

  const filteredProductos = useMemo(() => {
    if (!searchTerm) return productos;
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, productos]);

  // Obtener stock por color y talla
  const getStockPorColorTalla = (producto: Producto) => {
    const colores = (producto.colores || '').split(', ').filter((c: string) => c.trim());
    const tallas = (producto.tallas || '').split(', ').filter((t: string) => t.trim());
    
    const stockInfo: { color: string; tallas: { talla: string; stock: number }[] }[] = [];
    
    colores.forEach(color => {
      const tallasStock = tallas.map(talla => {
        const key = `${color}-${talla}`;
        const stock = producto.unidades?.[key] || 0;
        return { talla, stock };
      });
      stockInfo.push({ color, tallas: tallasStock });
    });
    
    return stockInfo;
  };

  // Calcular stock total de un producto
  const getStockTotal = (producto: Producto) => {
    return Object.values(producto.unidades || {}).reduce((a, b) => a + b, 0);
  };

  if (isLoading && productos.length === 0) {
    return <PageLoading />;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Stock</h1>
          <p className={styles.subtitle}>
            {filteredProductos.length} productos
          </p>
        </div>
      </header>

      {/* Buscador */}
      <div className={styles.searchWrapper}>
        <Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Buscar producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Lista de productos */}
      {filteredProductos.length === 0 ? (
        <div className={styles.empty}>
          <Package size={48} />
          <h3>No se encontraron productos</h3>
        </div>
      ) : (
        <div className={styles.list}>
          {filteredProductos.map((producto) => (
            <div key={producto.id} className={styles.productCard}>
              {/* Imagen a la izquierda */}
              <div className={styles.productImage}>
                {producto.image_paths[0] ? (
                  <img src={producto.image_paths[0]} alt={producto.nombre} />
                ) : (
                  <div className={styles.noImage}>
                    <ImageIcon size={32} />
                  </div>
                )}
              </div>

              {/* Info a la derecha */}
              <div className={styles.productInfo}>
                <div className={styles.productHeader}>
                  <span className={styles.categoria}>{producto.categoria}</span>
                  <h3 className={styles.productName}>{producto.nombre}</h3>
                  <span className={styles.precio}>{producto.precio}</span>
                </div>

                {/* Stock por color y talla */}
                <div className={styles.stockGrid}>
                  {getStockPorColorTalla(producto).map((colorInfo) => (
                    <div key={colorInfo.color} className={styles.colorRow}>
                      <div className={styles.colorLabel}>
                        <ColorCircle color={colorInfo.color} size="sm" />
                        <span>{colorInfo.color.includes(' #') ? colorInfo.color.split(' #')[0] : colorInfo.color.includes('#') ? colorInfo.color.split('#')[0] : colorInfo.color}</span>
                      </div>
                      <div className={styles.tallasStock}>
                        {colorInfo.tallas.map((tallaInfo) => (
                          <div 
                            key={tallaInfo.talla} 
                            className={`${styles.tallaStock} ${tallaInfo.stock === 0 ? styles.sinStock : ''}`}
                          >
                            <span className={styles.tallaName}>{tallaInfo.talla}</span>
                            <span className={styles.tallaCant}>{tallaInfo.stock}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stock total */}
                <div className={styles.stockTotal}>
                  <span>Total:</span>
                  <span className={getStockTotal(producto) === 0 ? styles.sinStock : styles.conStock}>
                    {getStockTotal(producto)} uds
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}