import { useState, useEffect } from 'react';
import { Star, Users, Gift, Search, Plus, Trash2, Phone, PhoneCall } from 'lucide-react';
import { useToast } from '../components/Toast';
import styles from './Fidelidad.module.css';

interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  compras: number;
  created_at: string;
}

const STORAGE_KEY = 'topstore_clientes_fidelidad';
const COMPRAS_PARA_DESCUENTO = 6;
const PORCENTAJE_DESCUENTO = 20;

export function Fidelidad() {
  const { showToast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', telefono: '' });

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

  const handleAgregarCliente = () => {
    if (!nuevoCliente.nombre.trim() || !nuevoCliente.telefono.trim()) {
      showToast('Nombre y teléfono son requeridos', 'warning');
      return;
    }

    const cliente: Cliente = {
      id: Date.now(),
      nombre: nuevoCliente.nombre,
      telefono: nuevoCliente.telefono,
      compras: 0,
      created_at: new Date().toISOString()
    };

    saveClientes([...clientes, cliente]);
    setNuevoCliente({ nombre: '', telefono: '' });
    setIsModalOpen(false);
    showToast('Cliente agregado', 'success');
  };

  const handleAgregarCompra = (clienteId: number) => {
    const updated = clientes.map(c => {
      if (c.id === clienteId) {
        const newCompras = c.compras + 1;
        if (newCompras === COMPRAS_PARA_DESCUENTO) {
          showToast(`🎉 ${c.nombre} completó ${COMPRAS_PARA_DESCUENTO} compras! 20% descuento disponible`, 'success');
        }
        return { ...c, compras: newCompras };
      }
      return c;
    });
    saveClientes(updated);
  };

  const handleUsarDescuento = (clienteId: number) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente || cliente.compras < COMPRAS_PARA_DESCUENTO) return;
    
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

  const getProgreso = (compras: number) => {
    return Math.min((compras / COMPRAS_PARA_DESCUENTO) * 100, 100);
  };

  const filteredClientes = clientes.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono.includes(searchTerm)
  );

  const stats = {
    total: clientes.length,
    conDescuento: clientes.filter(c => c.compras >= COMPRAS_PARA_DESCUENTO).length,
    totalCompras: clientes.reduce((sum, c) => sum + c.compras, 0)
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Programa de Fidelidad</h1>
          <p className={styles.subtitle}>{COMPRAS_PARA_DESCUENTO} compras = {PORCENTAJE_DESCUENTO}% descuento</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Nuevo Cliente
        </button>
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
            <div key={cliente.id} className={`${styles.card} ${cliente.compras >= COMPRAS_PARA_DESCUENTO ? styles.cardComplete : ''}`}>
              <div className={styles.cardHeader}>
                <div className={styles.clienteInfo}>
                  <h3 className={styles.clienteName}>{cliente.nombre}</h3>
                  <span className={styles.clientePhone}>
                    <Phone size={12} /> {cliente.telefono}
                  </span>
                </div>
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
                  <span>{cliente.compras} / {COMPRAS_PARA_DESCUENTO} compras</span>
                  {cliente.compras >= COMPRAS_PARA_DESCUENTO && (
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
                  {Array.from({ length: COMPRAS_PARA_DESCUENTO }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`${styles.dot} ${i < cliente.compras ? styles.dotFilled : ''}`}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.cardActions}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleAgregarCompra(cliente.id)}
                >
                  <Plus size={14} /> Compra
                </button>
                {cliente.compras >= COMPRAS_PARA_DESCUENTO && (
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

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Agregar Cliente</h2>
            <div className={styles.formGroup}>
              <label>Nombre</label>
              <input
                type="text"
                value={nuevoCliente.nombre}
                onChange={(e) => setNuevoCliente(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre del cliente"
                className="input"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Teléfono</label>
              <input
                type="text"
                value={nuevoCliente.telefono}
                onChange={(e) => setNuevoCliente(prev => ({ ...prev, telefono: e.target.value }))}
                placeholder="300 123 4567"
                className="input"
              />
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleAgregarCliente}>
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
