/**
 * Contexto de Autenticación para MeDico
 * Proporciona estado global del usuario y funciones de auth
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, User, LoginCredentials, RegisterData, type AuthResponse } from '../services/authService';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  accessToken: string | null;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  loginWithGoogle: (token: string) => Promise<void>;
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
  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);

      // Redirigir según el rol del usuario
      if (response.user.role === 0) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
      // Return response so callers can access user.id + derive the E2EE key
      return response;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Login con Google
   */
  const loginWithGoogle = async (token: string): Promise<void> => {
    try {
      const response = await authService.loginWithGoogle(token);
      setUser(response.user);

      if (response.user.role === 0) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
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

      // Marcar que el usuario acaba de registrarse para que el tutorial aparezca una sola vez
      sessionStorage.setItem('medico_just_registered', 'true');

      // Los usuarios registrados siempre son role=1 (normal)
      // Redirigir al dashboard
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
    isAdmin: user?.role === 0,
    accessToken: authService.getAccessToken(),  // ← AGREGADO
    login,
    loginWithGoogle,
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