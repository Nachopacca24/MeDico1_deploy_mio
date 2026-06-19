import type React from "react";
import { useState } from "react";
import { useNavigate, Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import { AuthError, NetworkError } from '@/shared/services/authErrors';
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2, Shield, BarChart2, Users, ArrowRight } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated, isAdmin, loginWithGoogle } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, rememberMe: checked }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "El correo es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Ingresa un correo válido";
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await login({
        email: formData.email,
        password: formData.password,
      });

      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión exitosamente.",
      });

      // La redirección se maneja automáticamente en AuthContext
      // If there was a 'from' state, navigate there, otherwise to home
      if (location.state?.from) {
        navigate(location.state.from);
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error('Error en login:', error);

      let errorMessage = "Credenciales inválidas. Por favor, intenta de nuevo.";

      if (error instanceof NetworkError) {
        errorMessage = error.message;
      } else if (error instanceof AuthError) {
        errorMessage = error.getUserMessage();
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: errorMessage,
        duration: 10000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Extracts the most descriptive message from any error type
  const extractErrorMessage = (error: unknown): string => {
    if (error instanceof AuthError) return error.getUserMessage();
    if (error instanceof NetworkError) return 'Sin conexión a internet. Verificá tu red e intentá de nuevo.';
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null) {
      const e = error as Record<string, unknown>;
      // Native Google SDK errors come as { error: '...' } or { message: '...' }
      if (typeof e.message === 'string' && e.message) return e.message;
      if (typeof e.error === 'string' && e.error) {
        // Map known native SDK generic errors to Spanish
        if (e.error === 'Something went wrong') return 'No se pudo completar el inicio de sesión con Google. Intentá de nuevo.';
        if (e.error === 'popup_closed_by_user') return '';
        return e.error;
      }
    }
    return 'Ocurrió un error inesperado. Intentá de nuevo.';
  };

  const handleGoogleSuccess = async (tokenResponse: any) => {
    setIsLoading(true);
    try {
      await loginWithGoogle(tokenResponse.access_token || tokenResponse.credential || tokenResponse.id_token);
      toast({ title: "¡Bienvenido/a!", description: "Has iniciado sesión con Google exitosamente." });
      navigate(location.state?.from ?? "/dashboard");
    } catch (error: unknown) {
      const msg = extractErrorMessage(error);
      if (msg) toast({ variant: "destructive", title: "Error al iniciar sesión", description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const loginGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast({ variant: "destructive", title: "Error", description: "Fallo al conectar con Google. Intentá de nuevo." }),
  });

  const handleGoogleNative = async () => {
    setIsLoading(true);
    try {
      await GoogleAuth.initialize();
      const googleUser = await GoogleAuth.signIn();
      const token = googleUser.authentication.idToken || googleUser.authentication.accessToken;
      await loginWithGoogle(token);
      toast({ title: "¡Bienvenido/a!", description: "Has iniciado sesión con Google exitosamente." });
      navigate(location.state?.from ?? "/dashboard");
    } catch (error: unknown) {
      const cancelled =
        (error as any)?.error === 'popup_closed_by_user' ||
        (error as any)?.message === 'User cancelled' ||
        (error as any)?.code === 12501;
      if (!cancelled) {
        const msg = extractErrorMessage(error);
        if (msg) toast({ variant: "destructive", title: "Error al iniciar sesión", description: msg, duration: 8000 });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (Capacitor.getPlatform() === 'android') {
      handleGoogleNative();
    } else {
      loginGoogle();
    }
  };

  // Si ya está autenticado, redirigir según el rol
  if (isAuthenticated) {
    if (isAdmin) {
      return <Navigate to='/admin' replace />;
    }
    return <Navigate to='/dashboard' replace />;
  }

  const GOOGLE_ICON = (
    <svg className="mr-2 h-4 w-4" aria-hidden="true" viewBox="0 0 488 512" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/>
    </svg>
  );

  return (
    <div className="flex min-h-screen w-full bg-gray-950">

      {/* ── Panel izquierdo — branding ───────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo_transparente.png" alt="MeDico App" className="h-9 w-9 object-contain drop-shadow" />
          <span className="text-white text-xl font-bold tracking-tight">MeDico App</span>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tight text-white leading-[1.1]">
              Tu práctica médica,<br />
              <span className="text-primary">organizada.</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed max-w-sm">
              Registro de cirugías, estadísticas y colaboración con colegas. Diseñado para médicos en Guatemala.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-3">
            {[
              { icon: <Shield className="h-4 w-4 text-primary" />, title: 'Privacidad total', desc: 'Cifrado AES-128-CBC en todos tus datos' },
              { icon: <BarChart2 className="h-4 w-4 text-emerald-400" />, title: 'Estadísticas avanzadas', desc: 'Seguimiento completo de tu práctica' },
              { icon: <Users className="h-4 w-4 text-violet-400" />, title: 'Colaboración médica', desc: 'Comparte casos con colegas de confianza' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4 p-3.5 rounded-xl bg-white/5 border border-white/8 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-gray-800 shrink-0">{icon}</div>
                <div>
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-gray-700">
          © {new Date().getFullYear()} MeDico App · Todos los derechos reservados
        </div>
      </div>

      {/* ── Panel derecho — formulario ───────────────────────────── */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md animate-slide-up">

          {/* Logo móvil */}
          <div className="flex items-center justify-center gap-3 lg:hidden mb-8">
            <img src="/logo_transparente.png" alt="MeDico App" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold text-white">MeDico App</span>
          </div>

          <div className="rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-white mb-1">Bienvenido de nuevo</h2>
              <p className="text-gray-500 text-sm">Ingresa a tu cuenta médica</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Correo electrónico</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="doctor@ejemplo.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!errors.email}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-primary"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-300">Contraseña</Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!errors.password}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-primary"
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="rememberMe" checked={formData.rememberMe} onCheckedChange={handleCheckboxChange} />
                <Label htmlFor="rememberMe" className="text-sm font-normal text-gray-400">Recuérdame</Label>
              </div>

              <Button type="submit" className="w-full h-11 font-semibold mt-2" disabled={isLoading}>
                {isLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Iniciando sesión...</>
                  : <><ArrowRight className="mr-2 h-4 w-4" /> Iniciar sesión</>
                }
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-900 px-3 text-gray-600">O continúa con</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-gray-700 bg-gray-800 hover:bg-gray-750 text-gray-200 hover:text-white"
              onClick={handleGoogleClick}
              disabled={isLoading}
            >
              {GOOGLE_ICON}
              Continuar con Google
            </Button>

            <p className="text-center text-sm text-gray-500 mt-5">
              ¿No tienes cuenta?{" "}
              <Link to="/signup" className="text-primary font-semibold hover:text-primary/80 transition-colors">
                Regístrate gratis
              </Link>
            </p>

            <div className="text-center text-xs text-gray-700 mt-4 pt-4 border-t border-gray-800">
              Al usar MeDico App aceptas nuestros{" "}
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-primary/80 hover:text-primary transition-colors">Términos de Uso</a>{" "}
              y{" "}
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-primary/80 hover:text-primary transition-colors">Política de Privacidad</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}