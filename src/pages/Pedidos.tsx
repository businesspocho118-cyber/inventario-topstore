import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Plus, X, Check, Truck, Package, Clock, Trash2, Users } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { PageLoading } from '../components/Loading';
import type { Pedido, Producto } from '../types';
import styles from './Pedidos.module.css';

interface ClienteFidelidad {
  id: number;
  nombre: string;
  telefono: string;
  compras: number;
}

const ESTADOS = ['pendiente', 'pagado', 'enviado', 'entregado'] as const;

const estadoIcons: Record<string, typeof Clock> = {
  pendiente: Clock,
  pagado: Check,
  enviado: Truck,
  entretenimiento: Package
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
  color: string;
  producto_nombre?: string;
  colores_disponibles?: string[];
}

export function Pedidos() {
  const { getPedidos, getProductos, createPedido, updatePedidoEstado, deletePedido, isLoading } = useApi();
  const { showToast } = useToast();
  
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [clientes, setClientes] = useState<ClienteFidelidad[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoPedido, setNuevoPedido] = useState<{
    cliente_nombre: string;
    cliente_telefono: string;
    cliente_direccion: string;
    cliente_barrio: string;
    cliente_referencias: string;
    metodo_pago: 'efectivo' | 'transferencia';
    notas: string;
    items: PedidoItem[];
  }>({
    cliente_nombre: '',
    cliente_telefono: '',
    cliente_direccion: '',
    cliente_barrio: '',
    cliente_referencias: '',
    metodo_pago: 'efectivo',
    notas: '',
    items: []
  });
  const [productoSeleccionado, setProductoSeleccionado] = useState<number | ''>('');
  const [colorSeleccionado, setColorSeleccionado] = useState<string>('');
  const [tipoCliente, setTipoCliente] = useState<'nuevo' | 'existente'>('nuevo');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | ''>('');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setFilteredPedidos(pedidos);
  }, [pedidos]);

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

    // Cargar clientes de localStorage
    const stored = localStorage.getItem('topstore_clientes_fidelidad');
    if (stored) {
      setClientes(JSON.parse(stored));
    }
  };

  const handleOpenModal = () => {
    setNuevoPedido({
      cliente_nombre: '',
      cliente_telefono: '',
      cliente_direccion: '',
      cliente_barrio: '',
      cliente_referencias: '',
      metodo_pago: 'efectivo',
      notas: '',
      items: []
    });
    setProductoSeleccionado('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setProductoSeleccionado('');
    setColorSeleccionado('');
    setTipoCliente('nuevo');
    setClienteSeleccionado('');
  };

  const handleClienteExistenteChange = (clienteId: number) => {
    setClienteSeleccionado(clienteId);
    const cliente = clientes.find(c => Number(c.id) === clienteId);
    if (cliente) {
      setNuevoPedido(prev => ({
        ...prev,
        cliente_nombre: cliente.nombre,
        cliente_telefono: cliente.telefono
      }));
    }
  };

  const addItem = () => {
    if (productoSeleccionado === '' || colorSeleccionado === '') return;
    
    const producto = productos.find(p => p.id === Number(productoSeleccionado));
    if (!producto) return;
    
    // Verificar stock disponible del color
    const stockColor = producto.stock_por_color?.[colorSeleccionado] || 0;
    if (stockColor === 0) {
      showToast(`No hay stock disponible en color ${colorSeleccionado}`, 'error');
      return;
    }
    
    const existingIndex = nuevoPedido.items.findIndex(
      item => item.producto_id === producto.id && item.color === colorSeleccionado
    );
    
    if (existingIndex >= 0) {
      const items = [...nuevoPedido.items];
      // Verificar que no exceda el stock
      if (items[existingIndex].cantidad < stockColor) {
        items[existingIndex].cantidad += 1;
        setNuevoPedido(prev => ({ ...prev, items }));
      } else {
        showToast(`Stock máximo alcanzado para ${colorSeleccionado}`, 'warning');
        return;
      }
    } else {
      setNuevoPedido(prev => ({
        ...prev,
        items: [
          ...prev.items,
          {
            producto_id: producto.id,
            cantidad: 1,
            precio_unitario: parseInt(producto.precio.replace(/[$.]/g, '')) || 0,
            color: colorSeleccionado,
            producto_nombre: producto.nombre,
            colores_disponibles: producto.colores.split(', ')
          }
        ]
      }));
    }
    
    setProductoSeleccionado('');
    setColorSeleccionado('');
  };

  const updateItemCantidad = (index: number, cantidad: number) => {
    if (cantidad < 1) return;
    
    const item = nuevoPedido.items[index];
    const producto = productos.find(p => p.id === item.producto_id);
    if (!producto) return;
    
    const stockDisponible = producto.stock_por_color?.[item.color] || 0;
    
    if (cantidad > stockDisponible) {
      showToast(`Stock máximo disponible: ${stockDisponible}`, 'warning');
      return;
    }
    
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
    
    // Validar campos requeridos
    if (!nuevoPedido.cliente_nombre.trim()) {
      showToast('⚠️ Falta el nombre del cliente', 'warning');
      return;
    }
    
    if (!nuevoPedido.cliente_telefono.trim()) {
      showToast('⚠️ Falta el teléfono del cliente', 'warning');
      return;
    }
    
    if (!nuevoPedido.cliente_direccion.trim()) {
      showToast('⚠️ Falta la dirección', 'warning');
      return;
    }
    
    if (!nuevoPedido.cliente_barrio.trim()) {
      showToast('⚠️ Falta el barrio', 'warning');
      return;
    }
    
    if (nuevoPedido.items.length === 0) {
      showToast('⚠️ Agrega al menos un producto', 'warning');
      return;
    }

    try {
      const result = await createPedido({
        cliente_nombre: nuevoPedido.cliente_nombre,
        cliente_telefono: nuevoPedido.cliente_telefono,
        cliente_direccion: nuevoPedido.cliente_direccion,
        cliente_barrio: nuevoPedido.cliente_barrio,
        cliente_referencias: nuevoPedido.cliente_referencias,
        metodo_pago: nuevoPedido.metodo_pago,
        notas: nuevoPedido.notas,
        items: nuevoPedido.items.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          color: item.color
        }))
      });
      
      if (result.success) {
        // Recargar pedidos y productos
        const [pedidosResult, productosResult] = await Promise.all([
          getPedidos(),
          getProductos()
        ]);
        
        if (pedidosResult.success && pedidosResult.data) {
          setPedidos(pedidosResult.data);
          setFilteredPedidos(pedidosResult.data);
        }
        
        // Recargar clientes de fidelidad
        const stored = localStorage.getItem('topstore_clientes_fidelidad');
        if (stored) {
          setClientes(JSON.parse(stored));
        }
        
        handleCloseModal();
      } else {
        showToast(result.error || 'Error al crear pedido', 'error');
      }
    } catch (err) {
      showToast('Error al crear pedido', 'error');
    }
  };

  const handleCambiarEstado = async (pedidoId: number, nuevoEstado: string) => {
    try {
      await updatePedidoEstado(pedidoId, nuevoEstado);
      showToast('Estado actualizado', 'success');
    } catch (err) {
      showToast('Error al actualizar', 'error');
    }
  };

  const handleEliminarPedido = async (pedidoId: number) => {
    if (!confirm(`¿Eliminar pedido #${pedidoId}? Se re-numerarán los pedidos.`)) return;
    
    try {
      await deletePedido(pedidoId);
      showToast('Pedido eliminado y pedidos re-numerados', 'success');
    } catch (err) {
      showToast('Error al eliminar', 'error');
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

  if (isLoading) {
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
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => handleEliminarPedido(pedido.id)}
                      title="Eliminar pedido"
                    >
                      <Trash2 size={16} />
                    </button>
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
          {/* Selector Cliente Nuevo / Existente */}
          <div className={styles.formGroup}>
            <label>Tipo de Cliente</label>
            <div className={styles.tipoClienteRow}>
              <button
                type="button"
                className={`${styles.tipoBtn} ${tipoCliente === 'nuevo' ? styles.tipoBtnActive : ''}`}
                onClick={() => {
                  setTipoCliente('nuevo');
                  setClienteSeleccionado('');
                  setNuevoPedido(prev => ({ ...prev, cliente_nombre: '', cliente_telefono: '' }));
                }}
              >
                <Plus size={16} /> Cliente Nuevo
              </button>
              <button
                type="button"
                className={`${styles.tipoBtn} ${tipoCliente === 'existente' ? styles.tipoBtnActive : ''}`}
                onClick={() => setTipoCliente('existente')}
                disabled={clientes.length === 0}
              >
                <Users size={16} /> Cliente Existente
              </button>
            </div>
          </div>

          {tipoCliente === 'existente' && clientes.length > 0 && (
            <div className={styles.formGroup}>
              <label>Seleccionar Cliente</label>
              <select
                value={clienteSeleccionado}
                onChange={(e) => handleClienteExistenteChange(Number(e.target.value))}
                className="input"
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} - {c.telefono} ({c.compras} compras)
                  </option>
                ))}
              </select>
            </div>
          )}

          {tipoCliente === 'nuevo' && (
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Nombre del Cliente *</label>
                <input
                  type="text"
                  value={nuevoPedido.cliente_nombre}
                  onChange={(e) => setNuevoPedido(prev => ({ ...prev, cliente_nombre: e.target.value }))}
                  className="input"
                  placeholder="Juan Pérez"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Teléfono *</label>
                <input
                  type="tel"
                  value={nuevoPedido.cliente_telefono}
                  onChange={(e) => setNuevoPedido(prev => ({ ...prev, cliente_telefono: e.target.value.replace(/\D/g, '') }))}
                  className="input"
                  placeholder="3201234567"
                  maxLength={10}
                />
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Dirección de entrega *</label>
            <div className={styles.formGrid}>
              <input
                type="text"
                value={nuevoPedido.cliente_direccion}
                onChange={(e) => setNuevoPedido(prev => ({ ...prev, cliente_direccion: e.target.value }))}
                className="input"
                placeholder="Calle/Carrera #"
              />
              <input
                type="text"
                value={nuevoPedido.cliente_barrio}
                onChange={(e) => setNuevoPedido(prev => ({ ...prev, cliente_barrio: e.target.value }))}
                className="input"
                placeholder="Barrio"
              />
            </div>
            <input
              type="text"
              value={nuevoPedido.cliente_referencias}
              onChange={(e) => setNuevoPedido(prev => ({ ...prev, cliente_referencias: e.target.value }))}
              className="input"
              style={{ marginTop: '0.5rem' }}
              placeholder="Referencias (casa, apartamento, punto de referencia)"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Método de pago *</label>
            <div className={styles.tipoClienteRow}>
              <button
                type="button"
                className={`${styles.tipoBtn} ${nuevoPedido.metodo_pago === 'efectivo' ? styles.tipoBtnActive : ''}`}
                onClick={() => setNuevoPedido(prev => ({ ...prev, metodo_pago: 'efectivo' }))}
              >
                💵 Efectivo
              </button>
              <button
                type="button"
                className={`${styles.tipoBtn} ${nuevoPedido.metodo_pago === 'transferencia' ? styles.tipoBtnActive : ''}`}
                onClick={() => setNuevoPedido(prev => ({ ...prev, metodo_pago: 'transferencia' }))}
              >
                📱 Transferencia
              </button>
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
                onChange={(e) => {
                  setProductoSeleccionado(e.target.value as number | '');
                  setColorSeleccionado('');
                }}
                className="input"
              >
                <option value="">Seleccionar producto...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} - {p.precio}
                  </option>
                ))}
              </select>
              {productoSeleccionado && (
                <select
                  value={colorSeleccionado}
                  onChange={(e) => setColorSeleccionado(e.target.value)}
                  className="input"
                >
                  <option value="">Seleccionar color...</option>
                  {(() => {
                    const producto = productos.find(p => p.id === Number(productoSeleccionado));
                    if (!producto) return null;
                    const colores = producto.colores.split(', ');
                    return colores.map(color => {
                      const stock = producto.stock_por_color?.[color] || 0;
                      return (
                        <option key={color} value={color} disabled={stock === 0}>
                          {color} {stock > 0 ? `(${stock} disp.)` : '(sin stock)'}
                        </option>
                      );
                    });
                  })()}
                </select>
              )}
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={addItem}
                disabled={!productoSeleccionado || !colorSeleccionado}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {nuevoPedido.items.length > 0 && (
            <div className={styles.itemsList}>
              <h4>Productos</h4>
              {nuevoPedido.items.map((item, index) => (
                <div key={index} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemNombre}>{item.producto_nombre}</span>
                    <span className={styles.itemColor}>Color: {item.color}</span>
                  </div>
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
