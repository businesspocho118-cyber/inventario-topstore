import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Package, Image as ImageIcon, X } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { PageLoading } from '../components/Loading';
import type { Producto, CreateProductoRequest, UpdateProductoRequest } from '../types';
import styles from './Productos.module.css';

const initialForm: CreateProductoRequest = {
  product_id: '',
  nombre: '',
  descripcion: '',
  precio: '',
  colores: '',
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
  const [formData, setFormData] = useState<CreateProductoRequest>(initialForm);
  const [imageInput, setImageInput] = useState('');

  useEffect(() => {
    loadProductos();
  }, []);

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

  const loadProductos = async () => {
    const result = await getProductos();
    if (result.success && result.data) {
      setProductos(result.data);
      setFilteredProductos(result.data);
    }
  };

  const handleOpenModal = (producto?: Producto) => {
    if (producto) {
      setEditingProducto(producto);
      setFormData({
        product_id: producto.product_id,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: producto.precio,
        colores: producto.colores,
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
    
    if (editingProducto) {
      const result = await updateProducto(editingProducto.id, formData as UpdateProductoRequest);
      if (result.success) {
        showToast('Producto actualizado correctamente', 'success');
        loadProductos();
        handleCloseModal();
      } else {
        showToast(result.error || 'Error al actualizar', 'error');
      }
    } else {
      const result = await createProducto(formData);
      if (result.success) {
        showToast('Producto creado correctamente', 'success');
        loadProductos();
        handleCloseModal();
      } else {
        showToast(result.error || 'Error al crear', 'error');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    const result = await deleteProducto(id);
    if (result.success) {
      showToast('Producto eliminado', 'success');
      loadProductos();
    } else {
      showToast(result.error || 'Error al eliminar', 'error');
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

  const categorias = ['Camisas', 'Buzos', 'Chaquetas', 'Conjuntos', 'Enterizos', 'Leggings', 'Shorts', 'Tops', 'Medias'];

  if (isLoading && productos.length === 0) {
    return <PageLoading />;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Productos</h1>
          <p className={styles.subtitle}>{productos.length} productos en total</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          Nuevo Producto
        </button>
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
                <p className={styles.colores}>{producto.colores}</p>
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
              <label>Stock</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                className="input"
                min="0"
              />
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
                onChange={(e) => setFormData(prev => ({ ...prev, colores: e.target.value }))}
                className="input"
                placeholder="Negro, Blanco, Gris"
              />
            </div>
          </div>

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
