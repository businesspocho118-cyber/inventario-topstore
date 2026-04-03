import { useState, useEffect } from 'react';
import { Package, ShoppingCart, AlertTriangle, DollarSign, TrendingUp, Wallet } from 'lucide-react';
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

      {/* Stats Grid - Main metrics */}
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
          title="Valor Inventario"
          value={formatCurrency(stats?.valor_inventario || 0)}
          icon={Wallet}
          color="green"
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

      {/* Products by Gender */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Productos por Género</h2>
        <div className={styles.genderStats}>
          <div className={styles.genderCard}>
            <div className={styles.genderHeader}>
              <span className={styles.genderTitle}>Mujeres</span>
              <span className={styles.genderBadge}>{stats?.productos_mujeres || 0} productos</span>
            </div>
            <div className={styles.genderStats}>
              <div className={styles.genderStat}>
                <span className={styles.genderStatLabel}>Con stock</span>
                <span className={styles.genderStatValue}>{(stats?.productos_mujeres || 0) - (stats?.productos_mujeres_sinstock || 0)}</span>
              </div>
              <div className={styles.genderStat}>
                <span className={styles.genderStatLabel}>Sin stock</span>
                <span className={styles.genderStatValue}>{stats?.productos_mujeres_sinstock || 0}</span>
              </div>
            </div>
          </div>
          
          <div className={styles.genderCard}>
            <div className={styles.genderHeader}>
              <span className={styles.genderTitle}>Hombres</span>
              <span className={styles.genderBadge}>{stats?.productos_hombres || 0} productos</span>
            </div>
            <div className={styles.genderStats}>
              <div className={styles.genderStat}>
                <span className={styles.genderStatLabel}>Con stock</span>
                <span className={styles.genderStatValue}>{(stats?.productos_hombres || 0) - (stats?.productos_hombres_sinstock || 0)}</span>
              </div>
              <div className={styles.genderStat}>
                <span className={styles.genderStatLabel}>Sin stock</span>
                <span className={styles.genderStatValue}>{stats?.productos_hombres_sinstock || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
