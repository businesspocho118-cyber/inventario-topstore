import { createClient } from '@supabase/supabase-js';

// Credenciales de Supabase proporcionadas por el usuario
const supabaseUrl = 'https://mwilpokulvssoomdytyk.supabase.co';
const supabaseAnonKey = 'sb_publishable_OiJCm8hcQSKavJXEOhpwSw_-tRabEWn';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Nombre de las tablas en Supabase
export const TABLES = {
  PRODUCTOS: 'productos',
  PEDIDOS: 'pedidos',
  CLIENTES: 'clientes',
  CONFIG: 'config'
} as const;
