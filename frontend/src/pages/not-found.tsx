import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Activity } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-center p-6">
      <div className="flex items-center gap-2 text-primary">
        <Activity className="h-7 w-7" />
        <span className="text-xl font-bold">MeDico App</span>
      </div>
      <div className="space-y-2">
        <h1 className="text-6xl font-extrabold text-primary">404</h1>
        <p className="text-xl font-semibold">Página no encontrada</p>
        <p className="text-muted-foreground text-sm max-w-xs">
          La dirección que ingresaste no existe o fue movida.
        </p>
      </div>
      <Button asChild>
        <Link to="/dashboard">Volver al inicio</Link>
      </Button>
    </div>
  );
}
