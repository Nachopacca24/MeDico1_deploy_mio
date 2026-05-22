import type React from "react";
import { useState } from "react";
import { useNavigate, Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useCrypto } from "@/shared/contexts/CryptoContext";
import { AuthError } from '@/shared/services/authErrors';
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2, Activity, HeartPulse } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';

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
  const { initKey } = useCrypto();

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
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
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

      // Derive E2EE key from password so patient names can be decrypted
      await initKey(formData.password, response.user.id);

      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión exitosamente.",
      });

      // La redirección se maneja automáticamente en AuthContext
      // If there was a 'from' state, navigate there, otherwise to home
      if (location.state?.from) {
        navigate(location.state.from);
      } else {
        navigate("/");
      }
    } catch (error: any) {
      console.error('Error en login:', error);

      let errorMessage = "Credenciales inválidas. Por favor, intenta de nuevo.";

      // Manejar errores estructurados de AuthError
      if (error instanceof AuthError) {
        errorMessage = error.getUserMessage();
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse: any) => {
    setIsLoading(true);
    try {
      await loginWithGoogle(tokenResponse.access_token || tokenResponse.credential || tokenResponse.id_token);
      toast({
        title: "¡Bienvenido/a!",
        description: "Has iniciado sesión con Google exitosamente.",
      });
      // If there was a 'from' state, navigate there, otherwise to home
      if (location.state?.from) {
        navigate(location.state.from);
      } else {
        navigate("/");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo iniciar sesión con Google.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loginGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast({ variant: "destructive", title: "Error", description: "Fallo al conectar con Google" }),
  });

  // Si ya está autenticado, redirigir según el rol
  if (isAuthenticated) {
    if (isAdmin) {
      return <Navigate to='/admin' replace />;
    }
    return <Navigate to='/' replace />;
  }

  return (
    <div className='flex min-h-screen w-full bg-slate-50 dark:bg-slate-950'>
      {/* Panel izquierdo (Branding) */}
      <div className='hidden w-full lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-primary via-primary/80 to-secondary p-12 text-white overflow-hidden relative'>
        <div className="absolute inset-0 bg-black/10 z-0"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl z-0 pointer-events-none"></div>

        <div className='relative z-10 flex items-center space-x-3 text-2xl font-bold'>
          <Activity className="h-8 w-8" />
          <span>MéDico</span>
        </div>

        <div className='relative z-10 space-y-4 max-w-lg'>
          <HeartPulse className="h-12 w-12 text-white/80" />
          <h1 className='text-4xl font-extrabold tracking-tight sm:text-5xl'>
            Simplifica tu práctica médica diaria.
          </h1>
          <p className='text-lg text-white/80'>
            La plataforma integral para gestionar pacientes, citas y facturación con seguridad y precisión.
          </p>
        </div>

        <div className='relative z-10 text-sm text-white/60'>
          © {new Date().getFullYear()} MéDico Inc. Todos los derechos reservados.
        </div>
      </div>

      {/* Panel derecho (Login Form) */}
      <div className='flex w-full items-center justify-center p-6 lg:w-1/2 animate-slide-up'>
        <Card className='w-full max-w-md border-0 shadow-lg sm:border sm:shadow-sm'>
          <CardHeader className="space-y-1">
            <div className='flex items-center justify-center space-x-2 text-primary lg:hidden mb-4'>
              <Activity className="h-6 w-6" />
              <span className='text-2xl font-bold'>MéDico</span>
            </div>
            <CardTitle className='text-2xl font-bold tracking-tight'>Bienvenido de nuevo</CardTitle>
            <CardDescription className="text-muted-foreground">Ingresa tus credenciales para acceder a tu cuenta médica</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
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
                  <Label htmlFor='password'>Password</Label>
                  <Link to='/forgot-password' className='text-sm text-primary underline-offset-4 hover:underline'>
                    Forgot password?
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
                  Remember me
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
                  <span className="bg-white dark:bg-slate-900 px-2 text-muted-foreground">
                    O continúa con
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => loginGoogle()}
                disabled={isLoading}
              >
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Google
              </Button>

              <p className='text-center text-sm text-muted-foreground'>
                ¿No tienes cuenta?{" "}
                <Link to='/signup' className='text-primary font-medium underline-offset-4 hover:underline'>
                  Regístrate ahora
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}