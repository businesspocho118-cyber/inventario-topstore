import styles from './ColorCircle.module.css';

interface ColorCircleProps {
  color: string;
  hex?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

// Mapeo de colores comunes a valores hex
const colorMap: Record<string, string> = {
  // Rojos
  'rojo': '#dc2626',
  'rojo/negro': '#dc2626',
  'rojo/blanco': '#dc2626',
  'rojo/navy': '#dc2626',
  
  // Azules
  'azul': '#2563eb',
  'azul/negro': '#2563eb',
  'azul/blanco': '#2563eb',
  'azul royal': '#1d4ed8',
  'azul oscuro': '#1e3a8a',
  'azul claro': '#60a5fa',
  'navy': '#1e3a5f',
  'navy/negro': '#1e3a5f',
  'azul cielo': '#60a5fa',
  
  // Negros
  'negro': '#171717',
  'negro/rojo': '#171717',
  'negro/gris': '#171717',
  'negro/verde': '#171717',
  'negro/amarillo': '#171717',
  'black': '#171717',
  
  // Blancos
  'blanco': '#f5f5f5',
  'blanco/negro': '#f5f5f5',
  'white': '#f5f5f5',
  
  // Grises
  'gris': '#6b7280',
  'gris claro': '#9ca3af',
  'gris/negro': '#6b7280',
  'gris oscuro': '#374151',
  'gray': '#6b7280',
  
  // Verdes
  'verde': '#16a34a',
  'verde claro': '#4ade80',
  'verde/negro': '#16a34a',
  'verde oscuro': '#14532d',
  'verde militar': '#4d7c0f',
  'green': '#16a34a',
  
  // Amarillos
  'amarillo': '#eab308',
  'amarillo/negro': '#eab308',
  'amarillo/flúor': '#bef264',
  'yellow': '#eab308',
  
  // Morados
  'morado': '#9333ea',
  'morado claro': '#c084fc',
  'morado oscuro': '#6b21a8',
  'violeta': '#8b5cf6',
  'purple': '#9333ea',
  
  // Rosados
  'rosa': '#ec4899',
  'rosado': '#ec4899',
  'rosa claro': '#f9a8d4',
  'rosado/negro': '#ec4899',
  'pink': '#ec4899',
  
  // Vino
  'vino tinto': '#722f37',
  'vino': '#722f37',
  
  // Café/Marrón
  'café': '#78350f',
  'marron': '#78350f',
  'brown': '#78350f',
  
  // Otros
  'naranja': '#f97316',
  'orange': '#f97316',
  'beige': '#d4c4a8',
  'crema': '#fef3c7',
  'turquesa': '#14b8a6',
  'cyan': '#06b6d4',
  'lila': '#a78bfa',
};

const getColorHex = (colorName: string, providedHex?: string): string => {
  if (providedHex) return providedHex;
  
  // Si el color tiene formato "nombre HEX" (con espacio y SIN #), extraer el hex
  // Ejemplo: "Azul #0000ff" -> extraer "0000ff"
  const hexMatchSpace = colorName.match(/\s+(#[0-9a-fA-F]{6})$/);
  if (hexMatchSpace) return hexMatchSpace[1];
  
  // Si el color tiene formato "nombre#hex" (con #), extraer el hex
  const hexMatchHash = colorName.match(/#([0-9a-fA-F]{6})/);
  if (hexMatchHash) return '#' + hexMatchHash[1];
  
  // Si el color ya es un HEX (comienza con #), usarlo directamente
  if (colorName.startsWith('#')) return colorName;
  
  // Buscar en el mapa de colores por si tiene un nombre conocido
  const normalized = colorName.toLowerCase().trim();
  return colorMap[normalized] || '#6b7280'; // Default gray
};

// Obtener solo el nombre (antes del HEX) para mostrar
const getDisplayName = (color: string): string => {
  // Si tiene formato "nombre HEX" (con espacio), mostrar solo el nombre
  const nameMatchSpace = color.match(/^(.+?)\s+#/);
  if (nameMatchSpace) return nameMatchSpace[1].trim();
  
  // Si tiene formato "nombre#hex", mostrar solo el nombre
  if (color.includes('#')) {
    const parts = color.split('#');
    return parts[0].trim();
  }
  
  // Si es solo un nombre, devolverlo
  return color;
};

export function ColorCircle({ 
  color, 
  hex, 
  size = 'md', 
  showName = false,
  selected = false,
  onClick 
}: ColorCircleProps) {
  const colorHex = getColorHex(color, hex);
  const displayName = getDisplayName(color);
  
  return (
    <div 
      className={`${styles.container} ${styles[size]} ${selected ? styles.selected : ''} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
      title={color}
    >
      <div 
        className={styles.circle} 
        style={{ backgroundColor: colorHex }}
      >
        {selected && (
          <div className={styles.checkmark}>✓</div>
        )}
      </div>
      {showName && <span className={styles.name}>{displayName}</span>}
    </div>
  );
}

// Componente para mostrar múltiples colores
interface ColorCirclesProps {
  colors: Array<{ nombre: string; hex?: string }>;
  size?: 'sm' | 'md' | 'lg';
  maxShow?: number;
}

export function ColorCircles({ colors, size = 'sm', maxShow = 5 }: ColorCirclesProps) {
  const visibleColors = colors.slice(0, maxShow);
  const remaining = colors.length - maxShow;
  
  return (
    <div className={styles.circlesContainer}>
      {visibleColors.map((c, i) => (
        <ColorCircle 
          key={i} 
          color={c.nombre} 
          hex={c.hex} 
          size={size}
        />
      ))}
      {remaining > 0 && (
        <span className={styles.more}>+{remaining}</span>
      )}
    </div>
  );
}
