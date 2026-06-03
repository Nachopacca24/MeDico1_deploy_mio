import type React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "@/shared/services/authService";
import { AuthError } from "@/shared/services/authErrors";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2, Activity, HeartPulse, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    if (!email) {
      setEmailError("El email es requerido");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Por favor ingresa un email válido");
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch (error: any) {
      let message = "Ocurrió un error. Por favor intenta de nuevo.";
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
            <CardTitle className="text-2xl font-bold tracking-tight">¿Olvidaste tu contraseña?</CardTitle>
            <CardDescription className="text-muted-foreground">
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
            </CardDescription>
          </CardHeader>

          {submitted ? (
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center text-center space-y-3 py-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="font-medium text-lg">Revisa tu correo</p>
                <p className="text-sm text-muted-foreground">
                  Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña en los
                  próximos minutos.
                </p>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    disabled={isLoading}
                    aria-invalid={!!emailError}
                  />
                  {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar enlace de recuperación"
                  )}
                </Button>
              </CardFooter>
            </form>
          )}

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
