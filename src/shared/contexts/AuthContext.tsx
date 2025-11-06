/**
 * Contexto de Autenticación para MeDico
 * Proporciona estado global del usuario y funciones de auth
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, User, LoginCredentials, RegisterData } from '../services/authService';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Cargar información del usuario desde localStorage o servidor
   */
  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      
      // Verificar si hay token
      if (!authService.isAuthenticated()) {
        setUser(null);
        return;
      }

      // Intentar cargar usuario desde localStorage primero
      const localUser = authService.getCurrentUser();
      if (localUser) {
        setUser(localUser);
      }

      // Luego validar y actualizar desde el servidor
      try {
        const serverUser = await authService.fetchCurrentUser();
        setUser(serverUser);
      } catch (error) {
        // Si falla la validación del token, limpiar
        console.error('Error validando sesión:', error);
        authService.clearAuth();
        setUser(null);
      }
    } catch (error) {
      console.error('Error cargando usuario:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar usuario al montar el componente
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  /**
   * Login de usuario
   */
  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      
      // Navegar al dashboard después del login exitoso
      navigate('/');
    } catch (error) {
      // Re-throw para que el componente pueda manejar el error
      throw error;
    }
  };

  /**
   * Registro de usuario
   */
  const register = async (data: RegisterData) => {
    try {
      const response = await authService.register(data);
      setUser(response.user);
      
      // Navegar al dashboard después del registro exitoso
      navigate('/');
    } catch (error) {
      throw error;
    }
  };

  /**
   * Logout de usuario
   */
  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Error durante logout:', error);
      // Limpiar estado local incluso si falla la llamada al servidor
      setUser(null);
      navigate('/login');
    }
  };

  /**
   * Actualizar perfil del usuario
   */
  const updateUser = async (data: Partial<User>) => {
    try {
      const updatedUser = await authService.updateProfile(data);
      setUser(updatedUser);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Refrescar información del usuario desde el servidor
   */
  const refreshUser = async () => {
    try {
      const updatedUser = await authService.fetchCurrentUser();
      setUser(updatedUser);
    } catch (error) {
      console.error('Error refrescando usuario:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook personalizado para usar el contexto de autenticación
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  
  return context;
}
