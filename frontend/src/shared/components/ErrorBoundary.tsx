import { Component, type ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { Activity } from "lucide-react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-center p-6">
        <div className="flex items-center gap-2 text-primary">
          <Activity className="h-7 w-7" />
          <span className="text-xl font-bold">MeDico App</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-destructive">Algo salió mal</h1>
          <p className="text-muted-foreground text-sm max-w-xs">
            Ocurrió un error inesperado. Tus datos están seguros.
          </p>
        </div>
        <Button onClick={() => window.location.href = "/dashboard"}>
          Recargar la app
        </Button>
      </div>
    );
  }
}
