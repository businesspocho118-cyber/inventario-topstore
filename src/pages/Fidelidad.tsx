import { useState, useEffect } from 'react';
import { Users, Search, Award, Star, Crown, Gem } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { PageLoading } from '../components/Loading';
import type { ClienteFidelidad } from '../types';
import styles from './Fidelidad.module.css';

const nivelConfig = {
  bronze: { icon: Star, clase: styles.nivelBronze, label: 'Bronze' },
  silver: { icon: Award, clase: styles.nivelSilver, label: 'Silver' },
  gold: { icon: Crown, clase: styles.nivelGold, label: 'Gold' },
  platinum: { icon: Gem, clase: styles.nivelPlatinum, label: 'Platinum' }
};

const regalos = {
  bronze: { nombre: 'Calendario TopStore', descripcion: 'Un calendario exclusivo' },
  silver: { nombre: 'Bolso Deportivo', descripcion: 'Bolso de calidad premium' },
  gold: { nombre: 'Buso TopStore', descripcion: 'Buso oficial de la marca' },
  platinum: { nombre: 'Camiseta + Buso', descripcion: 'Set completo oficial' }
};

const requisitos = {
  bronze: { puntos: 100, pedidos: 3 },
  silver: { puntos: 250, pedidos: 5 },
  gold: { puntos: 500, pedidos: 10 },
  platinum: { puntos: 1000, pedidos: 20 }
};

export function Fidelidad() {
  const { getClientesFidelidad, isLoading } = useApi();
  
  const [clientes, setClientes] = useState<ClienteFidelidad[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<ClienteFidelidad[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNivel, setFilterNivel] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = clientes;
    
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telefono.includes(searchTerm)
      );
    }
    
    if (filterNivel !== 'all') {
      filtered = filtered.filter(c => c.nivel === filterNivel);
    }
    
    setFilteredClientes(filtered);
  }, [searchTerm, filterNivel, clientes]);

  const loadData = async () => {
    const result = await getClientesFidelidad();
    if (result.success && result.data) {
      setClientes(result.data);
      setFilteredClientes(result.data);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Sin pedidos';
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getSiguienteRegalo = (cliente: ClienteFidelidad) => {
    const niveles: Array<'bronze' | 'silver' | 'gold' | 'platinum'> = ['bronze', 'silver', 'gold', 'platinum'];
    const indiceActual = niveles.indexOf(cliente.nivel);
    
    if (indiceActual === 3) {
      return { nombre: '¡Maximo nivel alcanzado!', descripcion: 'Felicidades!' };
    }
    
    const siguienteNivel = niveles[indiceActual + 1];
    const req = requisitos[siguienteNivel];
    return {
      nombre: regalos[siguienteNivel].nombre,
      falta: `Faltan ${req.puntos - cliente.puntos} puntos o ${req.pedidos - cliente.pedidos_count} pedidos`
    };
  };

  if (isLoading && clientes.length === 0) {
    return <PageLoading />;
  }

  // Calcular estadísticas
  const totalClientes = clientes.length;
  const clientesPlatinum = clientes.filter(c => c.nivel === 'platinum').length;
  const clientesGold = clientes.filter(c => c.nivel === 'gold').length;
  const totalPuntos = clientes.reduce((sum, c) => sum + c.puntos, 0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Programa de Fidelidad</h1>
          <p className={styles.subtitle}>{totalClientes} clientes registrados</p>
        </div>
      </header>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className="stat-card">
          <div className="stat-card-value">{totalClientes}</div>
          <div className="stat-card-label">Total Clientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: '#e5e4e2' }}>{clientesPlatinum}</div>
          <div className="stat-card-label">Platinum</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: '#ffd700' }}>{clientesGold}</div>
          <div className="stat-card-label">Gold</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{totalPuntos.toLocaleString()}</div>
          <div className="stat-card-label">Puntos Acumulados</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar cliente por nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.search}
          />
        </div>
        <select
          value={filterNivel}
          onChange={(e) => setFilterNivel(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">Todos los niveles</option>
          <option value="platinum">Platinum</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
          <option value="bronze">Bronze</option>
        </select>
      </div>

      {/* Clientes List */}
      {filteredClientes.length === 0 ? (
        <div className={styles.empty}>
          <Users size={48} />
          <h3>No se encontraron clientes</h3>
          <p>Los clientes aparecen cuando realizan pedidos</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filteredClientes.map((cliente) => {
            const config = nivelConfig[cliente.nivel];
            const Icon = config.icon;
            const siguiente = getSiguienteRegalo(cliente);
            
            return (
              <div key={cliente.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.clienteInfo}>
                    <span className={styles.clienteNombre}>{cliente.nombre}</span>
                    <span className={styles.clienteTelefono}>{cliente.telefono}</span>
                  </div>
                  <span className={`${styles.nivelBadge} ${config.clase}`}>
                    <Icon size={14} />
                    {config.label}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.stat}>
                    <div className={styles.statValue}>{cliente.pedidos_count}</div>
                    <div className={styles.statLabel}>Pedidos</div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.statValue}>{cliente.puntos}</div>
                    <div className={styles.statLabel}>Puntos</div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.statValue}>{formatCurrency(cliente.total_gastado)}</div>
                    <div className={styles.statLabel}>Total Gastado</div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.statValue} style={{ fontSize: '16px' }}>
                      {siguiente.nombre}
                    </div>
                    <div className={styles.statLabel}>
                      {cliente.nivel === 'platinum' ? 'Nivel máximo' : 'Siguiente regalo'}
                    </div>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.regaloInfo}>
                    {cliente.nivel !== 'platinum' && (
                      <>
                        <span className={styles.regaloText}>Siguiente:</span>
                        <span className={styles.regaloNombre}>{siguiente.nombre}</span>
                        <span className={styles.regaloText}>({siguiente.falta})</span>
                      </>
                    )}
                  </div>
                  <span className={styles.ultimoPedido}>
                    Último pedido: {formatDate(cliente.ultimo_pedido)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
