import { useState } from 'react';
import { Settings, Key, Database, Globe, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '../components/Toast';
import styles from './Configuracion.module.css';

export function Configuracion() {
  const { showToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    // Simular sincronización
    await new Promise(resolve => setTimeout(resolve, 2000));
    showToast('Catálogo sincronizado correctamente', 'success');
    setIsSyncing(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Configuración</h1>
        <p className={styles.subtitle}>Ajustes del sistema</p>
      </header>

      <div className={styles.sections}>
        {/* Sincronización */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <RefreshCw size={20} className={styles.sectionIcon} />
            <h2>Sincronización con Catálogo</h2>
          </div>
          <p className={styles.sectionDesc}>
            Fuerza la reconstrucción del catálogo público para reflejar los cambios actuales.
          </p>
          <div className={styles.card}>
            <div className={styles.cardContent}>
              <div>
                <h4>Estado de Sincronización</h4>
                <p className={styles.statusText}>
                  <CheckCircle size={14} className={styles.statusIcon} />
                  Sincronizado
                </p>
              </div>
              <button 
                className="btn btn-secondary"
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <span className={styles.spinner} />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Sincronizar Ahora
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Base de Datos */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Database size={20} className={styles.sectionIcon} />
            <h2>Base de Datos</h2>
          </div>
          <p className={styles.sectionDesc}>
            Información sobre la base de datos D1.
          </p>
          <div className={styles.card}>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Tipo</span>
                <span className={styles.infoValue}>Cloudflare D1 (SQLite)</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Estado</span>
                <span className={styles.infoValue}>
                  <span className={styles.statusDot} />
                  Activa
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Región</span>
                <span className={styles.infoValue}>Washington D.C. (iad1)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Catálogo */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Globe size={20} className={styles.sectionIcon} />
            <h2>Catálogo Público</h2>
          </div>
          <p className={styles.sectionDesc}>
            Configuración del catálogo visible para tus clientes.
          </p>
          <div className={styles.card}>
            <div className={styles.linkItem}>
              <div>
                <h4>URL del Catálogo</h4>
                <a 
                  href="https://topstore-catalogo.businesspocho118.workers.dev/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  https://topstore-catalogo.businesspocho118.workers.dev/
                </a>
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Modo</span>
              <span className={styles.infoValue}>Estático (build time)</span>
            </div>
          </div>
        </section>

        {/* Información */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <AlertCircle size={20} className={styles.sectionIcon} />
            <h2>Información del Sistema</h2>
          </div>
          <div className={styles.card}>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Versión</span>
                <span className={styles.infoValue}>1.0.0</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Framework</span>
                <span className={styles.infoValue}>React + Vite</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Hosting</span>
                <span className={styles.infoValue}>Cloudflare Pages</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
