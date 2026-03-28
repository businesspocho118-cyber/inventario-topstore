/// <reference types="vite/client" />

declare module '*.json' {
  const value: {
    productos: import('./types').Producto[];
    pedidos: import('./types').Pedido[];
  };
  export default value;
}
