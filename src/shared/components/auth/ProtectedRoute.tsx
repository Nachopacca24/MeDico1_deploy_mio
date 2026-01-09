/**
 * Componente para proteger rutas que requieren autenticación
 * y opcionalmente verificar permisos de administrador
 */
// src/shared/components/auth/ProtectedRoute.tsx

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  // Mostrar loader mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, redirigir a login guardando la ubicación
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si requiere admin y no es admin, redirigir al dashboard
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Si está autenticado (y es admin si se requiere), mostrar el contenido
  return <>{children}</>;
}