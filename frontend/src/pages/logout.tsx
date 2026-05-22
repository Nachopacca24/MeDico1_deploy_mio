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

  if (loading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground font-medium">Cerrando sesión de forma segura...</p>
        </div>
      </div>
    );
  }

  return <Navigate to='/login' replace />;
}
