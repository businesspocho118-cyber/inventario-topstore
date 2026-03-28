import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'inventario_token';
const TOKEN_EXPIRY_KEY = 'inventario_token_expiry';

// Contraseña del administrador
const ADMIN_PASSWORD = 'johlu1108';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (token && expiry) {
      const expiryDate = new Date(expiry);
      if (expiryDate > new Date()) {
        setIsAuthenticated(true);
      } else {
        // Token expired, clean up
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (password: string): Promise<boolean> => {
    // En desarrollo local, validamos directamente
    // En producción, esto llamaría a la API de Cloudflare
    const isDev = import.meta.env.DEV;
    
    if (isDev) {
      // Desarrollo local - validación directa
      if (password === ADMIN_PASSWORD) {
        const token = btoa(`${Date.now()}:${ADMIN_PASSWORD}`);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } else {
      // Producción - llamar a la API
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });

        if (response.ok) {
          const data = await response.json() as { token: string; expiresAt: string };
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(TOKEN_EXPIRY_KEY, data.expiresAt);
          setIsAuthenticated(true);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Login error:', error);
        return false;
      }
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper to get auth token
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
