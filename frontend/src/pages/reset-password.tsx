import type React from "react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "@/shared/services/authService";
import { AuthError } from "@/shared/services/authErrors";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2, Activity, HeartPulse } from "lucide-react";

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ new_password: "", new_password2: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.new_password) {
      newErrors.new_password = "La contraseña es requerida";
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = "La contraseña debe tener al menos 8 caracteres";
    }
    if (!formData.new_password2) {
      newErrors.new_password2 = "Debes confirmar la contraseña";
    } else if (formData.new_password !== formData.new_password2) {
      newErrors.new_password2 = "Las contraseñas no coinciden";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!token) {
      toast({
        variant: "destructive",
        title: "Enlace inválido",
        description: "El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(token, formData.new_password, formData.new_password2);
      toast({ title: "Contraseña restablecida", description: "Ya puedes iniciar sesión con tu nueva contraseña." });
      navigate("/login");
    } catch (error: any) {
      let message = "Ocurrió un error. El enlace puede haber expirado.";
      if (error instanceof AuthError) {
        message = error.getUserMessage();
      } else if (error?.message) {
        message = error.message;
      }
      toast({ variant: "destructive", title: "Error", description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950">
      {/* Branding panel */}
      <div className="hidden w-full lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-primary via-primary/80 to-secondary p-12 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-black/10 z-0" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl z-0 pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl z-0 pointer-events-none" />

        <div className="relative z-10 flex items-center space-x-3 text-2xl font-bold">
          <Activity className="h-8 w-8" />
          <span>MeDico App</span>
        </div>

        <div className="relative z-10 space-y-4 max-w-lg">
          <HeartPulse className="h-12 w-12 text-white/80" />
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Simplifica tu práctica médica diaria.
          </h1>
          <p className="text-lg text-white/80">
            La plataforma integral para gestionar pacientes, citas y facturación con seguridad y precisión.
          </p>
        </div>

        <div className="relative z-10 text-sm text-white/60">
          © {new Date().getFullYear()} MeDico App Todos los derechos reservados.
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2 animate-slide-up">
        <Card className="w-full max-w-md border-0 shadow-lg sm:border sm:shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center space-x-2 text-primary lg:hidden mb-4">
              <Activity className="h-6 w-6" />
              <span className="text-2xl font-bold">MeDico App</span>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Nueva contraseña</CardTitle>
            <CardDescription className="text-muted-foreground">
              Elige una contraseña segura para tu cuenta.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">Nueva contraseña</Label>
                <Input
                  id="new_password"
                  name="new_password"
                  type="password"
                  value={formData.new_password}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!errors.new_password}
                />
                {errors.new_password && <p className="text-sm text-destructive">{errors.new_password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password2">Confirmar contraseña</Label>
                <Input
                  id="new_password2"
                  name="new_password2"
                  type="password"
                  value={formData.new_password2}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!errors.new_password2}
                />
                {errors.new_password2 && <p className="text-sm text-destructive">{errors.new_password2}</p>}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Restablecer contraseña"
                )}
              </Button>
            </CardFooter>
          </form>

          <div className="pb-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary font-medium underline-offset-4 hover:underline">
              Volver al inicio de sesión
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
