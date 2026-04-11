import { useState, useEffect } from 'react';
import { Star, Users, Gift, Search, Plus, Trash2, Phone, Pencil } from 'lucide-react';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { PageLoading } from '../components/Loading';
import { useApi } from '../hooks/useApi';
import styles from './Fidelidad.module.css';

const COMPRAS_PARA_DESCUENTO = 6;
const PORCENTAJE_DESCUENTO = 20;

const getComprasQueCuentan = (compras: number) => Math.max(0, compras - 1);
const tieneDescuento = (compras: number) => getComprasQueCuentan(compras) >= COMPRAS_PARA_DESCUENTO;

export function Fidelidad() {
  const { getClientes, saveCliente, deleteCliente, checkClienteExists } = useApi();
  const { showToast } = useToast();
  const [clientes, setClientes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<any>(null);

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    setIsLoading(true);
    const result = await getClientes();
    setClientes(result);
    setIsLoading(false);
  };

  const handleAgregarCompra = async (clienteId: number) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return;
    
    const newCompras = cliente.compras + 1;
    const comprasQueCuentan = getComprasQueCuentan(newCompras);
    if (comprasQueCuentan === COMPRAS_PARA_DESCUENTO) {
      showToast(`🎉 ${cliente.nombre} completó ${COMPRAS_PARA_DESCUENTO} compras! 20% descuento disponible`, 'success');
    }
    
    try {
      const updatedCliente = { ...cliente, compras: newCompras };
      await saveCliente(updatedCliente);
      setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, compras: newCompras } : c));
    } catch (err) {
      showToast('Error al actualizar compras', 'error');
    }
  };

  const handleUsarDescuento = async (clienteId: number) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente || !tieneDescuento(cliente.compras)) return;
    
    if (!confirm(`¿Aplicar 20% de descuento a ${cliente.nombre}? Se resetearán sus compras a 0.`)) return;
    
    try {
      const updatedCliente = { ...cliente, compras: 0 };
      await saveCliente(updatedCliente);
      setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, compras: 0 } : c));
      showToast(`✅ Descuento aplicado a ${cliente.nombre}`, 'success');
    } catch (err) {
      showToast('Error al aplicar descuento', 'error');
    }
  };

  const handleEliminarCliente = async (clienteId: number) => {
    if (!confirm('¿Eliminar este cliente de fidelidad?')) return;
    try {
      await deleteCliente(clienteId);
      setClientes(prev => prev.filter(c => c.id !== clienteId));
      showToast('Cliente eliminado', 'success');
    } catch (err) {
      showToast('Error al eliminar cliente', 'error');
    }
  };

  const handleEditarCliente = (cliente: any) => {
    setClienteEditando({ ...cliente });
    setIsEditModalOpen(true);
  };

  const handleGuardarEdicion = async () => {
    if (!clienteEditando) return;
    
    if (!clienteEditando.nombre?.trim() || !clienteEditando.telefono?.trim()) {
      showToast('Nombre y teléfono son requeridos', 'warning');
      return;
    }

    // Validar que no exista otro cliente con ese teléfono
    const checkResult = checkClienteExists(clienteEditando.telefono, clienteEditando.id);
    if (checkResult.exists) {
      showToast(checkResult.message, 'error');
      return;
    }

    try {
      await saveCliente(clienteEditando);
      setClientes(prev => prev.map(c => c.id === clienteEditando.id ? clienteEditando : c));
      setIsEditModalOpen(false);
      setClienteEditando(null);
      showToast('Cliente actualizado', 'success');
    } catch (err) {
      showToast('Error al guardar', 'error');
    }
  };

  const getProgreso = (compras: number) => {
    const comprasQueCuentan = getComprasQueCuentan(compras);
    return Math.min((comprasQueCuentan / COMPRAS_PARA_DESCUENTO) * 100, 100);
  };

  const filteredClientes = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono?.includes(searchTerm)
  );

  const stats = {
    total: clientes.length,
    conDescuento: clientes.filter(c => tieneDescuento(c.compras)).length,
    totalCompras: clientes.reduce((sum, c) => sum + c.compras, 0)
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Programa de Fidelidad</h1>
          <p className={styles.subtitle}>Desde 2ª compra = {PORCENTAJE_DESCUENTO}% descuento ({COMPRAS_PARA_DESCUENTO} compras)</p>
        </div>
      </header>

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

      <div className={styles.infoBox}>
        <p>Los clientes se agregan automáticamente cuando creás una venta con cliente nuevo.</p>
      </div>

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
                value={clienteEditando.nombre || ''}
                onChange={(e) => setClienteEditando({ ...clienteEditando, nombre: e.target.value })}
                className="input"
                placeholder="Nombre del cliente"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Teléfono *</label>
              <input
                type="tel"
                value={clienteEditando.telefono || ''}
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
              <label>Compras</label>
              <input
                type="number"
                value={clienteEditando.compras || 0}
                onChange={(e) => setClienteEditando({ ...clienteEditando, compras: parseInt(e.target.value) || 0 })}
                className="input"
                min={0}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}