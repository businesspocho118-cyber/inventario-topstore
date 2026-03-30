import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart, AlertTriangle, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { StatCard } from '../components/StatCard';
import { PageLoading } from '../components/Loading';
import type { DashboardStats } from '../types';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const { getStats, isLoading: apiLoading } = useApi();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    const result = await getStats();
    if (result.success && result.data) {
      setStats(result.data);
    }
    setIsLoading(false);
  };

  if (isLoading || apiLoading) {
    return <PageLoading />;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Resumen de tu tienda</p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Total Productos"
          value={stats?.total_productos || 0}
          icon={Package}
          color="purple"
        />
        <StatCard
          title="Sin Stock"
          value={stats?.productos_sin_stock || 0}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="Pedidos Totales"
          value={stats?.total_pedidos || 0}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="Pendientes"
          value={stats?.pedidos_pendientes || 0}
          icon={TrendingUp}
          color="yellow"
        />
        <StatCard
          title="Ingresos Totales"
          value={formatCurrency(stats?.ingresos_totales || 0)}
          icon={DollarSign}
          color="green"
        />
      </div>

      {/* Quick Actions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Acciones Rápidas</h2>
        <div className={styles.actionsGrid}>
          <Link to="/productos" className={styles.actionCard}>
            <div className={styles.actionIcon}>
              <Package size={24} />
            </div>
            <div className={styles.actionContent}>
              <h3>Gestionar Productos</h3>
              <p>Ver, agregar o editar productos</p>
            </div>
            <ArrowRight size={20} className={styles.actionArrow} />
          </Link>

          <Link to="/pedidos" className={styles.actionCard}>
            <div className={styles.actionIcon}>
              <ShoppingCart size={24} />
            </div>
            <div className={styles.actionContent}>
              <h3>Ver Pedidos</h3>
              <p>Gestionar pedidos de clientes</p>
            </div>
            <ArrowRight size={20} className={styles.actionArrow} />
          </Link>
        </div>
      </section>

      {/* Info Card */}
      <section className={styles.infoSection}>
        <div className={styles.infoCard}>
          <div className={styles.infoIcon}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.infoContent}>
            <h3>Sincronización con Catálogo</h3>
            <p>
              Los cambios que hagas aquí se reflejarán automáticamente 
              en tu catálogo público. ¡Mantén tu inventario actualizado!
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
