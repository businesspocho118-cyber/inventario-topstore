import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Plus, X, Check, Truck, Package, Clock, Trash2, Users, Edit2 } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { PageLoading } from '../components/Loading';
import type { Pedido, PedidoItem, Producto } from '../types';
import styles from './Pedidos.module.css';

interface ClienteFidelidad {
  id: number;
  nombre: string;
  telefono: string;
  compras: number;
  direccion?: string;
  barrio?: string;
  referencias?: string;
}

const ESTADOS = ['reservado', 'pendiente_entrega', 'entregado'] as const;

const estadoIcons: Record<string, typeof Clock> = {
  reservado: Clock,
  pendiente_entrega: Truck,
  entretenimiento: Package
};

const estadoColors: Record<string, string> = {
  reservado: 'yellow',
  pendiente_entrega: 'blue',
  entregado: 'green'
};

export function Pedidos() {
  const { getPedidos, getProductos, createPedido, updatePedido, updatePedidoEstado, deletePedido, isLoading } = useApi();
  const { showToast } = useToast();
  
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('reservado');
  const [clientes, setClientes] = useState<ClienteFidelidad[]>([]);
  const [activeTab, setActiveTab] = useState<'todos' | 'reservado' | 'pendiente_entrega' | 'entregado'>('todos');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [nuevoPedido, setNuevoPedido] = useState<{
    cliente_nombre: string;
    cliente_telefono: string;
    cliente_direccion: string;
    cliente_barrio: string;
    cliente_referencias: string;
    metodo_pago: 'efectivo' | 'transferencia';
    notas: string;
    items: PedidoItem[];
    tipo_entrega?: 'tienda' | 'delivery';
  }>({
    cliente_nombre: '',
    cliente_telefono: '',
    cliente_direccion: '',
    cliente_barrio: '',
    cliente_referencias: '',
    metodo_pago: 'efectivo',
    notas: '',
    items: [],
    tipo_entrega: 'delivery'
  });
  const [productoSeleccionado, setProductoSeleccionado] = useState<number | ''>('');
  const [colorTallaSeleccionado, setColorTallaSeleccionado] = useState<string>('');
  const [tipoCliente, setTipoCliente] = useState<'nuevo' | 'existente'>('nuevo');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | ''>('');
  const [usarDireccionExistente, setUsarDireccionExistente] = useState<boolean>(true);

  // Load data on mount and when window regains focus
  useEffect(() => {
    loadData();
    
    // Recargar cuando la ventana recibe foco (cambió de pestaña y volvió)
    const handleFocus = () => {
      console.log('Ventana recibió foco - recargando pedidos...');
      loadData();
    };
    
    // Recargar cuando la página se vuelve visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Página visible - recargando pedidos...');
        loadData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // Aplicar filtros según la pestaña activa
    let filtered = pedidos;
    
    if (activeTab === 'reservado') {
      filtered = filtered.filter(p => p.estado === 'reservado');
    } else if (activeTab === 'pendiente_entrega') {
      filtered = filtered.filter(p => p.estado === 'pendiente_entrega');
    } else if (activeTab === 'entregado') {
      filtered = filtered.filter(p => p.estado === 'entregado');
    }
    // 'todos' muestra todos los pedidos
    
    // Filtro de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.cliente_nombre.toLowerCase().includes(term) ||
        p.cliente_telefono.includes(term) ||
        p.id.toString().includes(term)
      );
    }
    
    setFilteredPedidos(filtered);
  }, [searchTerm, filterEstado, activeTab, pedidos]);

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
    setColorTallaSeleccionado('');
    setTipoCliente('nuevo');
    setClienteSeleccionado('');
    setUsarDireccionExistente(true);
    setNuevoPedido({
      cliente_nombre: '',
      cliente_telefono: '',
      cliente_direccion: '',
      cliente_barrio: '',
      cliente_referencias: '',
      metodo_pago: 'efectivo',
      notas: '',
      items: [],
      tipo_entrega: 'delivery'
    });
  };

  const handleClienteExistenteChange = (clienteId: number) => {
    setClienteSeleccionado(clienteId);
    setUsarDireccionExistente(true); // Reset to use existing address by default
    const cliente = clientes.find(c => Number(c.id) === clienteId);
    if (cliente) {
      setNuevoPedido(prev => ({
        ...prev,
        cliente_nombre: cliente.nombre,
        cliente_telefono: cliente.telefono,
        cliente_direccion: cliente.direccion || '',
        cliente_barrio: cliente.barrio || '',
        cliente_referencias: cliente.referencias || ''
      }));
    }
  };

  const addItem = () => {
    if (productoSeleccionado === '' || colorTallaSeleccionado === '') return;
    
    const producto = productos.find(p => p.id === Number(productoSeleccionado));
    if (!producto) return;
    
    // Verificar stock disponible para esa combinación específica
    const stockDisponible = producto.unidades?.[colorTallaSeleccionado] || 0;
    if (stockDisponible === 0) {
      showToast(`No hay stock disponible para ${colorTallaSeleccionado}`, 'error');
      return;
    }
    
    // Separar color y talla de la selección
    const [color, talla] = colorTallaSeleccionado.split('-');
    
    const existingIndex = nuevoPedido.items.findIndex(
      item => item.producto_id === producto.id && item.color === color && item.talla === talla
    );
    
    if (existingIndex >= 0) {
      const items = [...nuevoPedido.items];
      // Verificar que no exceda el stock de esa combinación
      if (items[existingIndex].cantidad < stockDisponible) {
        items[existingIndex].cantidad += 1;
        setNuevoPedido(prev => ({ ...prev, items }));
      } else {
        showToast(`Stock máximo alcanzado para ${colorTallaSeleccionado}`, 'warning');
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
            color: color,
            talla: talla,
            producto_nombre: producto.nombre
          }
        ]
      }));
    }
    
    setProductoSeleccionado('');
    setColorTallaSeleccionado('');
  };

  const updateItemCantidad = (index: number, cantidad: number) => {
    if (cantidad < 1) return;
    
    const item = nuevoPedido.items[index];
    const producto = productos.find(p => p.id === item.producto_id);
    if (!producto) return;
    
    // Verificar stock específico para esa combinación color+talla
    const key = `${item.color}-${item.talla}`;
    const stockDisponible = producto.unidades?.[key] || 0;
    
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
    
    // Validar dirección solo si es delivery
    const tipoEntrega = (nuevoPedido as any).tipo_entrega || 'delivery';
    if (tipoEntrega === 'delivery') {
      if (!nuevoPedido.cliente_direccion.trim()) {
        showToast('⚠️ Falta la dirección', 'warning');
        return;
      }
      
      if (!nuevoPedido.cliente_barrio.trim()) {
        showToast('⚠️ Falta el barrio', 'warning');
        return;
      }
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
          color: item.color || '',
          talla: item.talla || ''
        }))
      });

      // Si es cliente existente y decidió cambiar la dirección, actualizar en localStorage
      if (tipoCliente === 'existente' && clienteSeleccionado && !usarDireccionExistente) {
        try {
          const stored = localStorage.getItem('topstore_clientes_fidelidad');
          if (stored) {
            const clientesActualizados = JSON.parse(stored).map((c: ClienteFidelidad) => {
              if (Number(c.id) === Number(clienteSeleccionado)) {
                return {
                  ...c,
                  direccion: nuevoPedido.cliente_direccion,
                  barrio: nuevoPedido.cliente_barrio,
                  referencias: nuevoPedido.cliente_referencias
                };
              }
              return c;
            });
            localStorage.setItem('topstore_clientes_fidelidad', JSON.stringify(clientesActualizados));
            setClientes(clientesActualizados);
          }
        } catch (err) {
          console.error('Error al actualizar dirección del cliente:', err);
        }
      }
      
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

  // Editar pedido
  const handleOpenEditModal = (pedido: Pedido) => {
    setEditingPedido(pedido);
    setIsEditModalOpen(true);
  };

  const handleSavePedido = async () => {
    if (!editingPedido) return;
    
    try {
      await updatePedido(editingPedido.id, editingPedido);
      showToast('Pedido actualizado', 'success');
      setIsEditModalOpen(false);
      setEditingPedido(null);
      loadData();
    } catch (err) {
      showToast('Error al actualizar pedido', 'error');
    }
  };

  const handleEditItemCantidad = (itemIndex: number, cantidad: number) => {
    if (!editingPedido || !editingPedido.items) return;
    if (cantidad < 1) return;
    
    const item = editingPedido.items[itemIndex];
    const producto = productos.find(p => p.id === item.producto_id);
    if (!producto) return;
    
    const key = `${item.color}-${item.talla}`;
    const stockDisponible = producto.unidades?.[key] || 0;
    
    if (cantidad > stockDisponible) {
      showToast(`Stock máximo disponible: ${stockDisponible}`, 'warning');
      return;
    }
    
    const newItems = [...editingPedido.items];
    newItems[itemIndex] = { ...newItems[itemIndex], cantidad };
    
    // Recalcular total
    const newTotal = newItems.reduce((sum, i) => sum + i.cantidad * i.precio_unitario, 0);
    
    setEditingPedido({ ...editingPedido, items: newItems, total: newTotal });
  };

  const handleRemoveEditItem = (itemIndex: number) => {
    if (!editingPedido || !editingPedido.items) return;
    const newItems = editingPedido.items.filter((_, i) => i !== itemIndex);
    const newTotal = newItems.reduce((sum, i) => sum + i.cantidad * i.precio_unitario, 0);
    setEditingPedido({ ...editingPedido, items: newItems, total: newTotal });
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
          <p className={styles.subtitle}>
            {pedidos.filter(p => p.estado === 'reservado').length} pendientes • {pedidos.filter(p => p.estado !== 'reservado').length} completados
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenModal}>
          <Plus size={18} />
          Nuevo Pedido
        </button>
      </header>

      {/* Tabs para separar pedidos por estado */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'todos' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('todos')}
        >
          Todos ({pedidos.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'reservado' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('reservado')}
        >
          Reservado ({pedidos.filter(p => p.estado === 'reservado').length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'pendiente_entrega' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('pendiente_entrega')}
        >
          Pendiente Entrega ({pedidos.filter(p => p.estado === 'pendiente_entrega').length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'entregado' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('entregado')}
        >
          Entregado ({pedidos.filter(p => p.estado === 'entregado').length})
        </button>
      </div>

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
                      className={styles.editBtn}
                      onClick={() => handleOpenEditModal(pedido)}
                      title="Editar pedido"
                    >
                      <Edit2 size={16} />
                    </button>
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
                  
                  {pedido.items && pedido.items.length > 0 && (
                    <div className={styles.cardItemsList}>
                      {pedido.items.map((item, idx) => (
                        <div key={idx} className={styles.cardItem}>
                          <span className={styles.cardItemNombre}>{item.producto_nombre}</span>
                          <span className={styles.cardItemCantidad}>x{item.cantidad}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
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
            <label>Tipo de Entrega *</label>
            <div className={styles.tipoClienteRow}>
              <button
                type="button"
                className={`${styles.tipoBtn} ${(nuevoPedido as any).tipo_entrega === 'tienda' ? styles.tipoBtnActive : ''}`}
                onClick={() => setNuevoPedido(prev => ({ ...prev, tipo_entrega: 'tienda', cliente_direccion: 'Retiro en tienda', cliente_barrio: '' }))}
              >
                🏪 Retiro en Tienda
              </button>
              <button
                type="button"
                className={`${styles.tipoBtn} ${(nuevoPedido as any).tipo_entrega === 'delivery' ? styles.tipoBtnActive : ''}`}
                onClick={() => setNuevoPedido(prev => ({ ...prev, tipo_entrega: 'delivery' }))}
              >
                🚚 Delivery
              </button>
            </div>
          </div>

          {/* Opción de dirección para cliente existente */}
          {tipoCliente === 'existente' && clienteSeleccionado && (nuevoPedido as any).tipo_entrega === 'delivery' && (
            <div className={styles.formGroup}>
              <label>Dirección de entrega</label>
              <div className={styles.direccionToggle}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={usarDireccionExistente}
                    onChange={(e) => {
                      setUsarDireccionExistente(e.target.checked);
                      if (e.target.checked) {
                        const cliente = clientes.find(c => Number(c.id) === Number(clienteSeleccionado));
                        if (cliente) {
                          setNuevoPedido(prev => ({
                            ...prev,
                            cliente_direccion: cliente.direccion || '',
                            cliente_barrio: cliente.barrio || '',
                            cliente_referencias: cliente.referencias || ''
                          }));
                        }
                      }
                    }}
                  />
                  Usar dirección guardada del cliente
                </label>
                {!usarDireccionExistente && (
                  <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                    ✏️ Al guardar el pedido, se actualizará la dirección del cliente
                  </p>
                )}
              </div>
            </div>
          )}

          {(nuevoPedido as any).tipo_entrega === 'delivery' && (tipoCliente === 'nuevo' || !clienteSeleccionado || !usarDireccionExistente) && (
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
          )}

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
                  setColorTallaSeleccionado('');
                }}
                className="input"
              >
                <option value="">Seleccionar producto...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id} disabled={p.stock === 0}>
                    {p.nombre} - {p.precio} {p.stock === 0 ? '(sin stock)' : `(${p.stock} disp.)`}
                  </option>
                ))}
              </select>
              {productoSeleccionado && (
                <select
                  value={colorTallaSeleccionado}
                  onChange={(e) => setColorTallaSeleccionado(e.target.value)}
                  className="input"
                >
                  <option value="">Color - Talla...</option>
                  {(() => {
                    const producto = productos.find(p => p.id === Number(productoSeleccionado));
                    if (!producto) return null;
                    
                    // Generar todas las combinaciones de color+talla que tengan stock
                    const colores = producto.colores.split(', ').filter(c => c.trim());
                    const tallas = producto.tallas.split(', ').filter(t => t.trim());
                    
                    return colores.flatMap(color => 
                      tallas.map(talla => {
                        const key = `${color}-${talla}`;
                        const stock = producto.unidades?.[key] || 0;
                        return (
                          <option key={key} value={key} disabled={stock === 0}>
                            {color} / {talla} {stock > 0 ? `(${stock} disp.)` : '(sin stock)'}
                          </option>
                        );
                      })
                    );
                  })()}
                </select>
              )}
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={addItem}
                disabled={!productoSeleccionado || !colorTallaSeleccionado}
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
                    <span className={styles.itemColor}>{item.color} / {item.talla}</span>
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

      {/* Modal de edición de pedido */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingPedido(null); }}
        title="Editar Pedido"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setIsEditModalOpen(false); setEditingPedido(null); }}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSavePedido}>
              Guardar Cambios
            </button>
          </>
        }
      >
        {editingPedido && (
          <div className={styles.form}>
            {/* Info del cliente */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Nombre del Cliente</label>
                <input
                  type="text"
                  value={editingPedido.cliente_nombre}
                  onChange={(e) => setEditingPedido({ ...editingPedido, cliente_nombre: e.target.value })}
                  className="input"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Teléfono</label>
                <input
                  type="tel"
                  value={editingPedido.cliente_telefono}
                  onChange={(e) => setEditingPedido({ ...editingPedido, cliente_telefono: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Dirección</label>
                <input
                  type="text"
                  value={editingPedido.cliente_direccion || ''}
                  onChange={(e) => setEditingPedido({ ...editingPedido, cliente_direccion: e.target.value })}
                  className="input"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Barrio</label>
                <input
                  type="text"
                  value={editingPedido.cliente_barrio || ''}
                  onChange={(e) => setEditingPedido({ ...editingPedido, cliente_barrio: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Referencias</label>
              <input
                type="text"
                value={editingPedido.cliente_referencias || ''}
                onChange={(e) => setEditingPedido({ ...editingPedido, cliente_referencias: e.target.value })}
                className="input"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Notas</label>
              <input
                type="text"
                value={editingPedido.notas || ''}
                onChange={(e) => setEditingPedido({ ...editingPedido, notas: e.target.value })}
                className="input"
              />
            </div>

            {/* Items del pedido */}
            {editingPedido.items && editingPedido.items.length > 0 && (
              <div className={styles.formGroup}>
                <label>Productos</label>
                {editingPedido.items.map((item, index) => (
                  <div key={index} className={styles.item}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemNombre}>{item.producto_nombre}</span>
                      <span className={styles.itemColor}>{item.color} / {item.talla}</span>
                    </div>
                    <div className={styles.itemCantidad}>
                      <button 
                        type="button"
                        onClick={() => handleEditItemCantidad(index, item.cantidad - 1)}
                      >
                        -
                      </button>
                      <span>{item.cantidad}</span>
                      <button 
                        type="button"
                        onClick={() => handleEditItemCantidad(index, item.cantidad + 1)}
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
                      onClick={() => handleRemoveEditItem(index)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <div className={styles.totalRow}>
                  <strong>Total</strong>
                  <strong>{formatCurrency(editingPedido.total)}</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
