import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Package, Image as ImageIcon, X, Minus } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { PageLoading } from '../components/Loading';
import { ColorCircle } from '../components/ColorCircle';
import type { Producto, CreateProductoRequest, UpdateProductoRequest } from '../types';
import styles from './Productos.module.css';

interface FormData extends CreateProductoRequest {
  stock_por_color?: Record<string, number>;
  stock_por_talla?: Record<string, number>;
}

const initialForm: FormData = {
  product_id: '',
  nombre: '',
  descripcion: '',
  precio: '',
  colores: '',
  tallas: '',
  stock_por_color: {},
  stock_por_talla: {},
  genero: 'mujeres',
  categoria: '',
  image_paths: [],
  stock: 0
};

export function Productos() {
  const { getProductos, createProducto, updateProducto, deleteProducto, isLoading } = useApi();
  const { showToast } = useToast();
  
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenero, setFilterGenero] = useState<'all' | 'hombres' | 'mujeres'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [imageInput, setImageInput] = useState('');

  useEffect(() => {
    loadProductos();
    
    // Recargar cuando la ventana recibe foco
    const handleFocus = () => {
      loadProductos();
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadProductos();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadProductos = async () => {
    const result = await getProductos();
    if (result.success && result.data) {
      setProductos(result.data);
      setFilteredProductos(result.data);
    }
  };

  useEffect(() => {
    let filtered = productos;
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.product_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterGenero !== 'all') {
      filtered = filtered.filter(p => p.genero === filterGenero);
    }
    
    setFilteredProductos(filtered);
  }, [searchTerm, filterGenero, productos]);

  const handleOpenModal = (producto?: Producto) => {
    if (producto) {
      setEditingProducto(producto);
      // Parsear colores y crear stock_por_color si no existe
      const coloresList = producto.colores.split(', ').filter(c => c.trim());
      const stockPorColor = producto.stock_por_color || {};
      coloresList.forEach(c => {
        if (stockPorColor[c] === undefined) stockPorColor[c] = 0;
      });
      
      // Parsear tallas y crear stock_por_talla si no existe
      const tallasList = (producto.tallas || '').split(', ').filter(t => t.trim());
      const stockPorTalla = producto.stock_por_talla || {};
      tallasList.forEach(t => {
        if (stockPorTalla[t] === undefined) stockPorTalla[t] = 0;
      });
      
      setFormData({
        product_id: producto.product_id,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: producto.precio,
        colores: producto.colores,
        tallas: producto.tallas || '',
        stock_por_color: stockPorColor,
        stock_por_talla: stockPorTalla,
        genero: producto.genero,
        categoria: producto.categoria,
        image_paths: producto.image_paths,
        stock: producto.stock
      });
    } else {
      setEditingProducto(null);
      setFormData(initialForm);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProducto(null);
    setFormData(initialForm);
    setImageInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Asegurar que activo esté presente
    const productoData = { ...formData, activo: true };
    
    if (editingProducto) {
      try {
        await updateProducto(editingProducto.id, productoData as UpdateProductoRequest);
        showToast('Producto actualizado correctamente', 'success');
        handleCloseModal();
      } catch (err) {
        showToast('Error al actualizar', 'error');
      }
    } else {
      try {
        await createProducto(productoData as any);
        showToast('Producto creado correctamente', 'success');
        handleCloseModal();
      } catch (err) {
        showToast('Error al crear', 'error');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
      await deleteProducto(id);
      showToast('Producto eliminado', 'success');
    } catch (err) {
      showToast('Error al eliminar', 'error');
    }
  };

  const addImage = () => {
    if (imageInput.trim() && !formData.image_paths.includes(imageInput.trim())) {
      setFormData(prev => ({
        ...prev,
        image_paths: [...prev.image_paths, imageInput.trim()]
      }));
      setImageInput('');
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      image_paths: prev.image_paths.filter((_, i) => i !== index)
    }));
  };

  // Actualizar stock de un color específico
  const updateColorStock = (color: string, delta: number) => {
    setFormData(prev => {
      const newStockPorColor = { ...prev.stock_por_color };
      const currentStock = newStockPorColor[color] || 0;
      const newStock = Math.max(0, currentStock + delta);
      newStockPorColor[color] = newStock;
      
      // Calcular stock total
      const totalStock = Object.values(newStockPorColor).reduce((a, b) => a + b, 0);
      
      return {
        ...prev,
        stock_por_color: newStockPorColor,
        stock: totalStock
      };
    });
  };

  // Cuando cambian los colores, actualizar stock_por_color
  const handleColorsChange = (newColors: string) => {
    setFormData(prev => {
      const colorList = newColors.split(', ').map(c => c.trim()).filter(c => c);
      const newStockPorColor: Record<string, number> = {};
      
      colorList.forEach(color => {
        // Preservar stock existente o inicializar en 0
        newStockPorColor[color] = prev.stock_por_color?.[color] ?? 0;
      });
      
      const totalStock = Object.values(newStockPorColor).reduce((a, b) => a + b, 0);
      
      return {
        ...prev,
        colores: newColors,
        stock_por_color: newStockPorColor,
        stock: totalStock
      };
    });
  };

  // Actualizar stock de una talla específica
  const updateTallaStock = (talla: string, delta: number) => {
    setFormData(prev => {
      const newStockPorTalla = { ...prev.stock_por_talla };
      const currentStock = newStockPorTalla[talla] || 0;
      const newStock = Math.max(0, currentStock + delta);
      newStockPorTalla[talla] = newStock;
      
      // Calcular stock total
      const totalStock = Object.values(newStockPorTalla).reduce((a, b) => a + b, 0);
      
      return {
        ...prev,
        stock_por_talla: newStockPorTalla,
        stock: totalStock
      };
    });
  };

  // Cuando cambian las tallas, actualizar stock_por_talla
  const handleTallasChange = (newTallas: string) => {
    setFormData(prev => {
      const tallaList = newTallas.split(', ').map(t => t.trim()).filter(t => t);
      const newStockPorTalla: Record<string, number> = {};
      
      tallaList.forEach(talla => {
        // Preservar stock existente o inicializar en 0
        newStockPorTalla[talla] = prev.stock_por_talla?.[talla] ?? 0;
      });
      
      const totalStock = Object.values(newStockPorTalla).reduce((a, b) => a + b, 0);
      
      return {
        ...prev,
        tallas: newTallas,
        stock_por_talla: newStockPorTalla,
        stock: totalStock
      };
    });
  };

  const categorias = ['Camisas', 'Buzos', 'Chaquetas', 'Conjuntos', 'Enterizos', 'Leggings', 'Shorts', 'Tops', 'Medias'];

  if (isLoading && productos.length === 0) {
    return <PageLoading />;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Inventario</h1>
          <p className={styles.subtitle}>{productos.length} productos en total</p>
        </div>
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterBtn} ${filterGenero === 'all' ? styles.active : ''}`}
            onClick={() => setFilterGenero('all')}
          >
            Todos
          </button>
          <button
            className={`${styles.filterBtn} ${filterGenero === 'mujeres' ? styles.active : ''}`}
            onClick={() => setFilterGenero('mujeres')}
          >
            Mujeres
          </button>
          <button
            className={`${styles.filterBtn} ${filterGenero === 'hombres' ? styles.active : ''}`}
            onClick={() => setFilterGenero('hombres')}
          >
            Hombres
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProductos.length === 0 ? (
        <div className={styles.empty}>
          <Package size={48} />
          <h3>No se encontraron productos</h3>
          <p>Intenta con otros filtros de búsqueda</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredProductos.map((producto) => (
            <div key={producto.id} className={styles.card}>
              <div className={styles.cardImage}>
                {producto.image_paths[0] ? (
                  <img src={producto.image_paths[0]} alt={producto.nombre} />
                ) : (
                  <div className={styles.noImage}>
                    <ImageIcon size={32} />
                  </div>
                )}
                <div className={styles.cardOverlay}>
                  <button 
                    className={styles.editBtn}
                    onClick={() => handleOpenModal(producto)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(producto.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <span className={`${styles.badge} ${producto.stock > 0 ? styles.inStock : styles.outOfStock}`}>
                  {producto.stock > 0 ? `${producto.stock} uds` : 'Sin stock'}
                </span>
              </div>
              <div className={styles.cardContent}>
                <span className={styles.categoria}>{producto.categoria}</span>
                <h3 className={styles.productName}>{producto.nombre}</h3>
                <p className={styles.precio}>{producto.precio}</p>
                
                {/* Mostrar colores si existen */}
                {producto.colores && (
                  <div className={styles.colorCircles}>
                    {producto.colores.split(', ').map((color, idx) => (
                      <div key={idx} className={styles.colorItem}>
                        <ColorCircle color={color} size="sm" />
                        <span className={styles.colorStock}>
                          {producto.stock_por_color?.[color] ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Mostrar tallas si existen */}
                {producto.tallas && (
                  <div className={styles.tallasList}>
                    {producto.tallas.split(', ').map((talla, idx) => (
                      <span key={idx} className={styles.tallaItem}>
                        {talla}: {producto.stock_por_talla?.[talla] ?? 0}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={handleCloseModal}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingProducto ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>ID del Producto</label>
              <input
                type="text"
                value={formData.product_id}
                onChange={(e) => setFormData(prev => ({ ...prev, product_id: e.target.value }))}
                className="input"
                placeholder="camisa-workout"
                required
                disabled={!!editingProducto}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                className="input"
                placeholder="Camisa WORKOUT"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Precio</label>
              <input
                type="text"
                value={formData.precio}
                onChange={(e) => setFormData(prev => ({ ...prev, precio: e.target.value }))}
                className="input"
                placeholder="$35.000"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Stock Total (calculado)</label>
              <div className={styles.stockDisplay}>
                <span className={styles.stockTotal}>{formData.stock}</span>
                <span className={styles.stockLabel}>unidades totales</span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Género</label>
              <select
                value={formData.genero}
                onChange={(e) => setFormData(prev => ({ ...prev, genero: e.target.value as 'hombres' | 'mujeres' }))}
                className="input"
              >
                <option value="mujeres">Mujeres</option>
                <option value="hombres">Hombres</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Categoría</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                className="input"
                required
              >
                <option value="">Seleccionar...</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Colores</label>
              <input
                type="text"
                value={formData.colores}
                onChange={(e) => handleColorsChange(e.target.value)}
                className="input"
                placeholder="Negro, Blanco, Gris"
              />
            </div>
          </div>

          {/* Editor de stock por color */}
          {formData.colores && (
            <div className={styles.formGroup}>
              <label>Stock por Color</label>
              <div className={styles.colorStockEditor}>
                {formData.colores.split(', ').filter(c => c.trim()).map((color) => (
                  <div key={color} className={styles.colorStockItem}>
                    <ColorCircle color={color} size="sm" />
                    <span className={styles.colorName}>{color}</span>
                    <div className={styles.stockControls}>
                      <button 
                        type="button"
                        className={styles.stockBtn}
                        onClick={() => updateColorStock(color, -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span className={styles.stockValue}>{formData.stock_por_color?.[color] || 0}</span>
                      <button 
                        type="button"
                        className={styles.stockBtn}
                        onClick={() => updateColorStock(color, 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Tallas</label>
            <input
              type="text"
              value={formData.tallas}
              onChange={(e) => handleTallasChange(e.target.value)}
              className="input"
              placeholder="S, M, L, XL"
            />
          </div>

          {/* Editor de stock por talla */}
          {formData.tallas && (
            <div className={styles.formGroup}>
              <label>Stock por Talla</label>
              <div className={styles.colorStockEditor}>
                {formData.tallas.split(', ').filter(t => t.trim()).map((talla) => (
                  <div key={talla} className={styles.colorStockItem}>
                    <span className={styles.tallaLabel}>{talla}</span>
                    <div className={styles.stockControls}>
                      <button 
                        type="button"
                        className={styles.stockBtn}
                        onClick={() => updateTallaStock(talla, -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span className={styles.stockValue}>{formData.stock_por_talla?.[talla] || 0}</span>
                      <button 
                        type="button"
                        className={styles.stockBtn}
                        onClick={() => updateTallaStock(talla, 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              className="input"
              rows={3}
              placeholder="Descripción del producto..."
            />
          </div>

          <div className={styles.formGroup}>
            <label>Imágenes (URLs)</label>
            <div className={styles.imageInput}>
              <input
                type="text"
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                className="input"
                placeholder="URL de la imagen..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
              />
              <button type="button" className="btn btn-secondary" onClick={addImage}>
                <Plus size={16} />
              </button>
            </div>
            <div className={styles.imageList}>
              {formData.image_paths.map((url, index) => (
                <div key={index} className={styles.imageItem}>
                  <img src={url} alt={`Imagen ${index + 1}`} />
                  <button type="button" onClick={() => removeImage(index)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
