// Script para sincronizar productos desde el catálogo
// Uso: node sync-from-catalog.js

const fs = require('fs');
const path = require('path');

const CATALOGO_PATH = path.join(__dirname, '..', 'Catalogo');
const INVENTARIO_PATH = path.join(__dirname, 'public', 'data');
const INVENTARIO_FILE = path.join(INVENTARIO_PATH, 'productos.json');

// Mapeo de colores a hex
const colorMap = {
  'negro': '#171717', 'blanco': '#f5f5f5', 'gris': '#6b7280',
  'rosado': '#ec4899', 'azul': '#2563eb', 'vino tinto': '#7f1d1d',
  'café': '#78350f', 'morado': '#9333ea', 'verde': '#16a34a',
  'amarillo': '#eab308', 'azul oscuro': '#1e3a5f', 'gris claro': '#9ca3af',
  'morado claro': '#a78bfa', 'verde claro': '#86efac', 'lila': '#8b5cf6',
  'celeste': '#60a5fa', 'naranja': '#f97316', 'rojo': '#dc2626'
};

function getHexColor(colorName) {
  const c = colorName.toLowerCase().trim();
  return colorMap[c] || '#6b7280';
}

function sync() {
  console.log('🔄 Sincronizando productos desde el catálogo...\n');
  
  // Leer catálogo
  const catalogoHtmlPath = path.join(CATALOGO_PATH, 'index.html');
  if (!fs.existsSync(catalogoHtmlPath)) {
    console.error('❌ Error: No se encontró el archivo index.html del catálogo');
    console.log('   Busca en:', catalogoHtmlPath);
    process.exit(1);
  }
  
  const html = fs.readFileSync(catalogoHtmlPath, 'utf8');
  
  // Extraer productos del HTML
  const productCards = html.match(/<div class="preview-card[^]*?<\/div>/g) || [];
  
  const catalogProducts = productCards.map((card) => {
    const getData = (attr) => {
      const match = card.match(new RegExp('data-' + attr + '="([^"]+)"'));
      return match ? match[1] : '';
    };
    
    const getGallery = () => {
      const match = card.match(/data-gallery='([^']+)'/);
      if (match) {
        try {
          return JSON.parse(match[1].replace(/'/g, '"'));
        } catch(e) {
          return [];
        }
      }
      return [];
    };
    
    const getImg = () => {
      const match = card.match(/<img src="([^"]+)"/);
      return match ? match[1] : '';
    };
    
    const name = getData('name');
    const productId = getData('product-id');
    const desc = getData('description');
    const price = getData('price');
    const colors = getData('colors');
    const category = getData('category');
    const gender = getData('gender');
    const gallery = getGallery();
    const image = gallery.length > 0 ? gallery[0].src : (getImg() || '');
    
    if (!name) return null;
    
    return {
      product_id: productId,
      nombre: name,
      descripcion: desc,
      precio: price,
      colores: colors,
      categoria: category,
      genero: gender,
      image_paths: [image]
    };
  }).filter(p => p !== null);
  
  console.log(`📦 Productos encontrados en el catálogo: ${catalogProducts.length}`);
  
  // Leer inventario actual
  let inventarioData = { productos: [], pedidos: [] };
  if (fs.existsSync(INVENTARIO_FILE)) {
    inventarioData = JSON.parse(fs.readFileSync(INVENTARIO_FILE, 'utf8'));
  }
  
  // Sincronizar manteniendo stock local
  const syncedProducts = catalogProducts.map(catProd => {
    const localProd = inventarioData.productos.find(p => p.product_id === catProd.product_id);
    
    const colores = catProd.colores || '';
    const coloresArray = colores.split(',').map(c => c.trim()).filter(c => c);
    
    const colores_disponibles = coloresArray.map(color => ({
      nombre: color,
      hex: getHexColor(color)
    }));
    
    const stock = coloresArray.length;
    
    let stock_por_color = {};
    coloresArray.forEach(color => {
      stock_por_color[color] = localProd?.stock_por_color?.[color] || 1;
    });
    
    return {
      id: localProd?.id || Math.random() * 10000,
      product_id: catProd.product_id,
      nombre: catProd.nombre,
      descripcion: catProd.descripcion,
      precio: catProd.precio,
      colores: colores,
      colores_disponibles,
      stock,
      stock_por_color,
      genero: catProd.genero || localProd?.genero || 'hombres',
      categoria: catProd.categoria || localProd?.categoria || 'Camisas',
      image_paths: catProd.image_paths,
      activo: true,
      created_at: localProd?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
  
  // Guardar inventario actualizado
  const newData = {
    productos: syncedProducts,
    pedidos: inventarioData.pedidos || []
  };
  
  fs.writeFileSync(INVENTARIO_FILE, JSON.stringify(newData, null, 2));
  
  console.log(`✅ Inventario actualizado: ${syncedProducts.length} productos`);
  console.log(`📁 Archivo guardado: ${INVENTARIO_FILE}`);
  console.log(`\n💡 Para aplicar los cambios, volvé a desplegar el inventario:`);
  console.log(`   npm run build && npx wrangler pages deploy dist --project-name inventario-topstore`);
}

sync();
