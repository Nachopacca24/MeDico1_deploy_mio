import type React from "react";
import { useState } from "react";
import { useNavigate, Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import { AuthError, NetworkError } from '@/shared/services/authErrors';
import { authService } from '@/shared/services/authService';

const API_URL = import.meta.env.VITE_API_URL || '';

async function processPendingInvite() {
  const code = localStorage.getItem('referral_code');
  if (!code) return;
  try {
    await authService.authenticatedFetch(`${API_URL}/api/auth/accept-invite/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friend_code: code }),
    });
  } catch {}
  localStorage.removeItem('referral_code');
}
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2 } from "lucide-react";
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

      await processPendingInvite();

      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión exitosamente.",
      });

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

  return (
    <div className='force-light flex min-h-screen w-full bg-slate-50'>
      {/* Panel izquierdo (Branding) */}
      <div className='hidden w-full lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-sky-50 via-sky-200 to-sky-400 p-12 overflow-hidden relative'>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/40 rounded-full blur-3xl z-0 pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/40 rounded-full blur-3xl z-0 pointer-events-none"></div>

        <div className='relative z-10 flex items-center space-x-3 text-2xl font-bold text-sky-900'>
          <div className="bg-white rounded-lg p-1 flex items-center justify-center shadow-sm">
            <img src="/MEDICO-BAJA-01-solo-logo.JPG" alt="" className="h-7 w-7 object-contain" />
          </div>
          <span>MeDico App</span>
        </div>

        <div className='relative z-10 space-y-4 max-w-lg'>
          <h1 className='text-4xl font-extrabold tracking-tight sm:text-5xl text-sky-900'>
            Simplifica tu práctica médica diaria.
          </h1>
          <p className='text-lg text-sky-800/80'>
            La plataforma integral para gestionar pacientes, citas y facturación con seguridad y precisión.
          </p>
        </div>

        <div className='relative z-10 text-sm text-sky-800/60'>
          © {new Date().getFullYear()} MeDico App Todos los derechos reservados.
        </div>
      </div>

      {/* Panel derecho (Login Form) */}
      <div className='flex w-full items-center justify-start lg:justify-center lg:p-6 lg:w-1/2 lg:animate-slide-up flex-col'>

        {/* Mobile brand header */}
        <div className='lg:hidden w-full bg-gradient-to-br from-sky-50 via-sky-200 to-sky-400 px-6 pt-10 pb-8 relative overflow-hidden'>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/50 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/50 rounded-full blur-2xl pointer-events-none" />
          <div className='relative flex items-center gap-3 mb-3 text-sky-900'>
            <img src="/favicon.png" alt="MeDico App" className="h-10 w-10 object-contain drop-shadow-sm" />
            <span className='text-2xl font-bold tracking-tight'>MeDico App</span>
          </div>
          <p className='relative text-sky-800/70 text-sm'>Tu práctica médica, organizada.</p>
        </div>

        <Card className='w-full max-w-md border-0 shadow-lg sm:border sm:shadow-sm lg:rounded-xl rounded-t-none'>
          <CardHeader className="space-y-1">
            <CardTitle className='text-2xl font-bold tracking-tight'>Bienvenido de nuevo</CardTitle>
            <CardDescription className="text-muted-foreground">Ingresa tus credenciales para acceder a tu cuenta médica</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Correo electrónico</Label>
                <Input
                  id='email'
                  name='email'
                  type='email'
                  placeholder='john@example.com'
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!errors.email}
                />
                {errors.email && <p className='text-sm text-destructive'>{errors.email}</p>}
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label htmlFor='password'>Contraseña</Label>
                  <Link to='/forgot-password' className='text-sm text-primary underline-offset-4 hover:underline'>
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input
                  id='password'
                  name='password'
                  type='password'
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!errors.password}
                />
                {errors.password && <p className='text-sm text-destructive'>{errors.password}</p>}
              </div>

              <div className='flex items-center space-x-2'>
                <Checkbox id='rememberMe' checked={formData.rememberMe} onCheckedChange={handleCheckboxChange} />
                <Label htmlFor='rememberMe' className='text-sm font-normal'>
                  Recuérdame
                </Label>
              </div>
            </CardContent>

            <CardFooter className='flex flex-col space-y-4'>
              <Button type='submit' className='w-full' disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>

              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    O continúa con
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full bg-white border-sky-400 hover:border-sky-500 hover:bg-white"
                onClick={handleGoogleClick}
                disabled={isLoading}
              >
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Google
              </Button>

              <div className='flex flex-col items-center gap-1.5'>
                <p className='text-sm text-muted-foreground'>¿No tienes cuenta?</p>
                <Link
                  to='/signup'
                  className='w-full flex items-center justify-center bg-white border-2 border-amber-400 hover:border-amber-500 active:scale-95 text-gray-900 font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_12px_2px_rgba(251,191,36,0.35)] hover:shadow-[0_0_18px_4px_rgba(251,191,36,0.45)] whitespace-nowrap'
                >
                  Regístrate ahora — 30 días gratis
                </Link>
              </div>

              <div className='text-center text-xs text-muted-foreground/70 pt-2 border-t border-slate-100 dark:border-slate-800'>
                Al usar MeDico App aceptas nuestros{" "}
                <a href='/terms.html' target='_blank' rel='noopener noreferrer' className='text-primary underline underline-offset-2 hover:text-primary/80 dark:text-primary dark:hover:text-primary/70 transition-colors'>
                  Términos de Uso
                </a>{" "}
                y{" "}
                <a href='/privacy.html' target='_blank' rel='noopener noreferrer' className='text-primary underline underline-offset-2 hover:text-primary/80 dark:text-primary dark:hover:text-primary/70 transition-colors'>
                  Política de Privacidad
                </a>
              </div>

            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}