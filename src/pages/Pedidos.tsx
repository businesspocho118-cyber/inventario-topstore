import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Plus, ChevronDown, X, Check, Truck, Package, Clock } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { PageLoading } from '../components/Loading';
import type { Pedido, Producto, CreatePedidoRequest } from '../types';
import styles from './Pedidos.module.css';

const ESTADOS = ['pendiente', 'pagado', 'enviado', 'entregado'] as const;

const estadoIcons: Record<string, typeof Clock> = {
  pendiente: Clock,
  pagado: Check,
  enviado: Truck,
  entregado: Package
};

const estadoColors: Record<string, string> = {
  pendiente: 'yellow',
  pagado: 'blue',
  enviado: 'purple',
  entregado: 'green'
};

interface PedidoItem {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  producto_nombre?: string;
}

export function Pedidos() {
  const { getPedidos, getProductos, createPedido, updatePedidoEstado, isLoading } = useApi();
  const { showToast } = useToast();
  
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoPedido, setNuevoPedido] = useState<{
    cliente_nombre: string;
    cliente_telefono: string;
    notas: string;
    items: PedidoItem[];
  }>({
    cliente_nombre: '',
    cliente_telefono: '',
    notas: '',
    items: []
  });
  const [productoSeleccionado, setProductoSeleccionado] = useState<number | ''>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = pedidos;
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cliente_telefono.includes(searchTerm) ||
        p.id.toString().includes(searchTerm)
      );
    }
    
    if (filterEstado !== 'all') {
      filtered = filtered.filter(p => p.estado === filterEstado);
    }
    
    setFilteredPedidos(filtered);
  }, [searchTerm, filterEstado, pedidos]);

  const loadData = async () => {
    const [pedidosResult, productosResult] = await Promise.all([
      getPedidos(),
      getProductos()
    ]);
    
    if (pedidosResult.success && pedidosResult.data) {
      setPedidos(pedidosResult.data);
      setFilteredPedidos(pedidosResult.data);
    }
    
    if (productosResult.success && productosResult.data) {
      setProductos(productosResult.data);
    }
  };

  const handleOpenModal = () => {
    setNuevoPedido({
      cliente_nombre: '',
      cliente_telefono: '',
      notas: '',
      items: []
    });
    setProductoSeleccionado('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const addItem = () => {
    if (productoSeleccionado === '') return;
    
    const producto = productos.find(p => p.id === Number(productoSeleccionado));
    if (!producto) return;
    
    const existingIndex = nuevoPedido.items.findIndex(item => item.producto_id === producto.id);
    
    if (existingIndex >= 0) {
      const items = [...nuevoPedido.items];
      items[existingIndex].cantidad += 1;
      setNuevoPedido(prev => ({ ...prev, items }));
    } else {
      setNuevoPedido(prev => ({
        ...prev,
        items: [
          ...prev.items,
          {
            producto_id: producto.id,
            cantidad: 1,
            precio_unitario: parseInt(producto.precio.replace(/[$.]/g, '')) || 0,
            producto_nombre: producto.nombre
          }
        ]
      }));
    }
    
    setProductoSeleccionado('');
  };

  const updateItemCantidad = (index: number, cantidad: number) => {
    if (cantidad < 1) return;
    const items = [...nuevoPedido.items];
    items[index].cantidad = cantidad;
    setNuevoPedido(prev => ({ ...prev, items }));
  };

  const removeItem = (index: number) => {
    const items = nuevoPedido.items.filter((_, i) => i !== index);
    setNuevoPedido(prev => ({ ...prev, items }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (nuevoPedido.items.length === 0) {
      showToast('Agrega al menos un producto', 'warning');
      return;
    }

    const total = nuevoPedido.items.reduce(
      (sum, item) => sum + item.cantidad * item.precio_unitario, 
      0
    );

    const result = await createPedido({
      cliente_nombre: nuevoPedido.cliente_nombre,
      cliente_telefono: nuevoPedido.cliente_telefono,
      notas: nuevoPedido.notas,
      items: nuevoPedido.items.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario
      }))
    });

    if (result.success) {
      showToast('Pedido creado correctamente', 'success');
      loadData();
      handleCloseModal();
    } else {
      showToast(result.error || 'Error al crear pedido', 'error');
    }
  };

  const handleCambiarEstado = async (pedidoId: number, nuevoEstado: string) => {
    const result = await updatePedidoEstado(pedidoId, nuevoEstado);
    if (result.success) {
      showToast('Estado actualizado', 'success');
      loadData();
    } else {
      showToast(result.error || 'Error al actualizar', 'error');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalPedido = (pedido: Pedido) => {
    // Calculate from items (we'd need to fetch items separately in real app)
    return pedido.total;
  };

  if (isLoading && pedidos.length === 0) {
    return <PageLoading />;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Pedidos</h1>
          <p className={styles.subtitle}>{pedidos.length} pedidos en total</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenModal}>
          <Plus size={18} />
          Nuevo Pedido
        </button>
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por cliente, teléfono o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterBtn} ${filterEstado === 'all' ? styles.active : ''}`}
            onClick={() => setFilterEstado('all')}
          >
            Todos
          </button>
          {ESTADOS.map(estado => (
            <button
              key={estado}
              className={`${styles.filterBtn} ${filterEstado === estado ? styles.active : ''}`}
              onClick={() => setFilterEstado(estado)}
            >
              {estado.charAt(0).toUpperCase() + estado.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Pedidos List */}
      {filteredPedidos.length === 0 ? (
        <div className={styles.empty}>
          <ShoppingCart size={48} />
          <h3>No se encontraron pedidos</h3>
          <p>Crea un nuevo pedido o ajusta los filtros</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filteredPedidos.map((pedido) => {
            const Icon = estadoIcons[pedido.estado] || Clock;
            return (
              <div key={pedido.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.pedidoInfo}>
                    <span className={styles.pedidoId}>#{pedido.id}</span>
                    <span className={styles.pedidoFecha}>{formatDate(pedido.fecha)}</span>
                  </div>
                  <div className={styles.estadoSelect}>
                    <select
                      value={pedido.estado}
                      onChange={(e) => handleCambiarEstado(pedido.id, e.target.value)}
                      className={styles.select}
                    >
                      {ESTADOS.map(estado => (
                        <option key={estado} value={estado}>
                          {estado.charAt(0).toUpperCase() + estado.slice(1)}
                        </option>
                      ))}
                    </select>
                    <span className={`${styles.badge} badge-${estadoColors[pedido.estado]}`}>
                      <Icon size={12} />
                      {pedido.estado}
                    </span>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.clienteInfo}>
                    <strong>{pedido.cliente_nombre}</strong>
                    <span>{pedido.cliente_telefono}</span>
                  </div>
                  
                  {pedido.notas && (
                    <p className={styles.notas}>{pedido.notas}</p>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.total}>{formatCurrency(pedido.total)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nuevo Pedido */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Nuevo Pedido"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={handleCloseModal}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              Crear Pedido
            </button>
          </>
        }
      >
        <form className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Nombre del Cliente</label>
              <input
                type="text"
                value={nuevoPedido.cliente_nombre}
                onChange={(e) => setNuevoPedido(prev => ({ ...prev, cliente_nombre: e.target.value }))}
                className="input"
                placeholder="Juan Pérez"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Teléfono</label>
              <input
                type="tel"
                value={nuevoPedido.cliente_telefono}
                onChange={(e) => setNuevoPedido(prev => ({ ...prev, cliente_telefono: e.target.value }))}
                className="input"
                placeholder="3201234567"
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Notas</label>
            <textarea
              value={nuevoPedido.notas}
              onChange={(e) => setNuevoPedido(prev => ({ ...prev, notas: e.target.value }))}
              className="input"
              rows={2}
              placeholder="Notas adicionales..."
            />
          </div>

          <div className={styles.formGroup}>
            <label>Agregar Productos</label>
            <div className={styles.addItemRow}>
              <select
                value={productoSeleccionado}
                onChange={(e) => setProductoSeleccionado(e.target.value as number | '')}
                className="input"
              >
                <option value="">Seleccionar producto...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} - {p.precio}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-secondary" onClick={addItem}>
                <Plus size={18} />
              </button>
            </div>
          </div>

          {nuevoPedido.items.length > 0 && (
            <div className={styles.itemsList}>
              <h4>Productos</h4>
              {nuevoPedido.items.map((item, index) => (
                <div key={index} className={styles.item}>
                  <span className={styles.itemNombre}>{item.producto_nombre}</span>
                  <div className={styles.itemCantidad}>
                    <button 
                      type="button"
                      onClick={() => updateItemCantidad(index, item.cantidad - 1)}
                    >
                      -
                    </button>
                    <span>{item.cantidad}</span>
                    <button 
                      type="button"
                      onClick={() => updateItemCantidad(index, item.cantidad + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span className={styles.itemPrecio}>
                    {formatCurrency(item.cantidad * item.precio_unitario)}
                  </span>
                  <button 
                    type="button"
                    className={styles.removeItem}
                    onClick={() => removeItem(index)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <div className={styles.totalRow}>
                <strong>Total</strong>
                <strong>
                  {formatCurrency(
                    nuevoPedido.items.reduce(
                      (sum, item) => sum + item.cantidad * item.precio_unitario,
                      0
                    )
                  )}
                </strong>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
