import { LucideIcon } from 'lucide-react';
import styles from './StatCard.module.css';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'purple' | 'green' | 'yellow' | 'red' | 'blue';
}

const colorMap = {
  purple: 'var(--color-accent-primary)',
  green: 'var(--color-success)',
  yellow: 'var(--color-warning)',
  red: 'var(--color-error)',
  blue: 'var(--color-info)'
};

export function StatCard({ title, value, icon: Icon, trend, color = 'purple' }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrapper} style={{ '--accent-color': colorMap[color] } as React.CSSProperties}>
        <Icon size={24} />
      </div>
      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        <div className={styles.valueRow}>
          <span className={styles.value}>{value}</span>
          {trend && (
            <span className={`${styles.trend} ${trend.isPositive ? styles.positive : styles.negative}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
