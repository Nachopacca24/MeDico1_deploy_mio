import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function Logout() {
  const { logout, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      logout();
    }
  }, [isAuthenticated, loading, logout]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Cerrando sesión...</p>
        </div>
      </div>
    );
  }

  return !isAuthenticated ? <Navigate to='/login' replace /> : null;
}
