import { useState, useEffect } from 'react';
import { Star, Users, Gift, Search, Plus, Trash2, Phone, PhoneCall, Pencil, X } from 'lucide-react';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import styles from './Fidelidad.module.css';

interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  direccion?: string;
  referencias?: string;
  ultimo_metodo_pago?: 'efectivo' | 'transferencia';
  compras: number;
  created_at: string;
}

const STORAGE_KEY = 'topstore_clientes_fidelidad';
const COMPRAS_PARA_DESCUENTO = 6; // 6 compras que cuentan (la primera no cuenta)
const COMPRAS_TOTALES_PARA_DESCUENTO = 7; // 1 primera + 6 que cuentan = descuento
const PORCENTAJE_DESCUENTO = 20;

// Función para calcular compras que cuentan (la primera no cuenta)
const getComprasQueCuentan = (compras: number) => Math.max(0, compras - 1);

// Función para verificar si tiene descuento disponible
const tieneDescuento = (compras: number) => getComprasQueCuentan(compras) >= COMPRAS_PARA_DESCUENTO;

export function Fidelidad() {
  const { showToast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setClientes(JSON.parse(stored));
    }
  };

  const saveClientes = (newClientes: Cliente[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newClientes));
    setClientes(newClientes);
  };

  const handleAgregarCompra = (clienteId: number) => {
    const updated = clientes.map(c => {
      if (c.id === clienteId) {
        const newCompras = c.compras + 1;
        const comprasQueCuentan = getComprasQueCuentan(newCompras);
        if (comprasQueCuentan === COMPRAS_PARA_DESCUENTO) {
          showToast(`🎉 ${c.nombre} completó ${COMPRAS_PARA_DESCUENTO} compras (desde la 2da)! 20% descuento disponible`, 'success');
        }
        return { ...c, compras: newCompras };
      }
      return c;
    });
    saveClientes(updated);
  };

  const handleUsarDescuento = (clienteId: number) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente || !tieneDescuento(cliente.compras)) return;
    
    if (!confirm(`¿Aplicar 20% de descuento a ${cliente.nombre}?\nSe resetearán sus compras a 0.`)) return;
    
    const updated = clientes.map(c => {
      if (c.id === clienteId) {
        showToast(`✅ Descuento de 20% aplicado a ${c.nombre}`, 'success');
        return { ...c, compras: 0 };
      }
      return c;
    });
    saveClientes(updated);
  };

  const handleEliminarCliente = (clienteId: number) => {
    if (!confirm('¿Eliminar este cliente de fidelidad?')) return;
    saveClientes(clientes.filter(c => c.id !== clienteId));
    showToast('Cliente eliminado', 'success');
  };

  const handleEditarCliente = (cliente: Cliente) => {
    setClienteEditando({ ...cliente });
    setIsEditModalOpen(true);
  };

  const handleGuardarEdicion = () => {
    if (!clienteEditando) return;
    
    if (!clienteEditando.nombre.trim() || !clienteEditando.telefono.trim()) {
      showToast('Nombre y teléfono son requeridos', 'warning');
      return;
    }

    const updated = clientes.map(c => 
      c.id === clienteEditando.id ? clienteEditando : c
    );
    saveClientes(updated);
    setIsEditModalOpen(false);
    setClienteEditando(null);
    showToast('Cliente actualizado', 'success');
  };

  const getProgreso = (compras: number) => {
    const comprasQueCuentan = getComprasQueCuentan(compras);
    return Math.min((comprasQueCuentan / COMPRAS_PARA_DESCUENTO) * 100, 100);
  };

  const filteredClientes = clientes.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono.includes(searchTerm)
  );

  const stats = {
    total: clientes.length,
    conDescuento: clientes.filter(c => tieneDescuento(c.compras)).length,
    totalCompras: clientes.reduce((sum, c) => sum + c.compras, 0)
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Programa de Fidelidad</h1>
          <p className={styles.subtitle}>Desde 2ª compra = {PORCENTAJE_DESCUENTO}% descuento ({COMPRAS_PARA_DESCUENTO} compras)</p>
        </div>
      </header>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <Users size={24} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Clientes</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <Gift size={24} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>{stats.conDescuento}</span>
            <span className={styles.statLabel}>Con descuento</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <Star size={24} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>{stats.totalCompras}</span>
            <span className={styles.statLabel}>Compras totales</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Clientes Grid */}
      {filteredClientes.length === 0 ? (
        <div className={styles.empty}>
          <Users size={48} />
          <h3>No hay clientes</h3>
          <p>Agrega clientes para empezar el programa de fidelidad</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredClientes.map((cliente) => (
            <div key={cliente.id} className={`${styles.card} ${tieneDescuento(cliente.compras) ? styles.cardComplete : ''}`}>
              <div className={styles.cardHeader}>
                <div className={styles.clienteInfo}>
                  <h3 className={styles.clienteName}>{cliente.nombre}</h3>
                  <span className={styles.clientePhone}>
                    <Phone size={12} /> {cliente.telefono}
                  </span>
                  {cliente.direccion && (
                    <span className={styles.clienteDireccion}>
                      📍 {cliente.direccion}
                    </span>
                  )}
                  {cliente.referencias && (
                    <span className={styles.clienteReferencias}>
                      {cliente.referencias}
                    </span>
                  )}
                  {cliente.ultimo_metodo_pago && (
                    <span className={styles.clienteMetodo}>
                      {cliente.ultimo_metodo_pago === 'efectivo' ? '💵' : '📱'} {cliente.ultimo_metodo_pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                    </span>
                  )}
                </div>
                <button 
                  className={styles.editBtn}
                  onClick={() => handleEditarCliente(cliente)}
                  title="Editar cliente"
                >
                  <Pencil size={14} />
                </button>
                <button 
                  className={styles.deleteBtn}
                  onClick={() => handleEliminarCliente(cliente.id)}
                  title="Eliminar cliente"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className={styles.progressSection}>
                <div className={styles.progressHeader}>
                  <span>{getComprasQueCuentan(cliente.compras)} / {COMPRAS_PARA_DESCUENTO} compras (desde 2ª)</span>
                  {tieneDescuento(cliente.compras) && (
                    <span className={styles.descuentoBadge}>
                      <Gift size={12} /> 20% DESCUENTO
                    </span>
                  )}
                </div>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${getProgreso(cliente.compras)}%` }}
                  />
                </div>
                <div className={styles.comprasDots}>
                  {Array.from({ length: COMPRAS_PARA_DESCUENTO }).map((_, i) => {
                    const comprasQueCuentan = getComprasQueCuentan(cliente.compras);
                    return (
                      <div 
                        key={i} 
                        className={`${styles.dot} ${i < comprasQueCuentan ? styles.dotFilled : ''}`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className={styles.cardActions}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleAgregarCompra(cliente.id)}
                >
                  <Plus size={14} /> Compra
                </button>
                {tieneDescuento(cliente.compras) && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleUsarDescuento(cliente.id)}
                  >
                    <Gift size={14} /> Usar descuento
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Los clientes se agregan desde Ventas */}
      <div className={styles.infoBox}>
        <p>Los clientes se agregan automáticamente cuando creás una venta con cliente nuevo.</p>
      </div>

      {/* Modal Editar Cliente */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Cliente"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleGuardarEdicion}>
              Guardar Cambios
            </button>
          </>
        }
      >
        {clienteEditando && (
          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label>Nombre *</label>
              <input
                type="text"
                value={clienteEditando.nombre}
                onChange={(e) => setClienteEditando({ ...clienteEditando, nombre: e.target.value })}
                className="input"
                placeholder="Nombre del cliente"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Teléfono *</label>
              <input
                type="tel"
                value={clienteEditando.telefono}
                onChange={(e) => setClienteEditando({ ...clienteEditando, telefono: e.target.value.replace(/\D/g, '') })}
                className="input"
                placeholder="Teléfono"
                maxLength={10}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Dirección</label>
              <input
                type="text"
                value={clienteEditando.direccion || ''}
                onChange={(e) => setClienteEditando({ ...clienteEditando, direccion: e.target.value })}
                className="input"
                placeholder="Dirección"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Referencias</label>
              <input
                type="text"
                value={clienteEditando.referencias || ''}
                onChange={(e) => setClienteEditando({ ...clienteEditando, referencias: e.target.value })}
                className="input"
                placeholder="Referencias de dirección"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Método de pago preferido</label>
              <div className={styles.tipoClienteRow}>
                <button
                  type="button"
                  className={`${styles.tipoBtn} ${clienteEditando.ultimo_metodo_pago === 'efectivo' ? styles.tipoBtnActive : ''}`}
                  onClick={() => setClienteEditando({ ...clienteEditando, ultimo_metodo_pago: 'efectivo' })}
                >
                  💵 Efectivo
                </button>
                <button
                  type="button"
                  className={`${styles.tipoBtn} ${clienteEditando.ultimo_metodo_pago === 'transferencia' ? styles.tipoBtnActive : ''}`}
                  onClick={() => setClienteEditando({ ...clienteEditando, ultimo_metodo_pago: 'transferencia' })}
                >
                  📱 Transferencia
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Compras realizadas</label>
              <input
                type="number"
                value={clienteEditando.compras}
                onChange={(e) => setClienteEditando({ ...clienteEditando, compras: parseInt(e.target.value) || 0 })}
                className="input"
                min="0"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
