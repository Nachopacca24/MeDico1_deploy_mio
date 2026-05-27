import type React from "react";

import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import { AuthError } from '@/shared/services/authErrors';
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2, Activity, HeartPulse, Crown } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';

// Lista de especialidades médicas basadas en tu sistema
const SPECIALTIES = [
  "Cardiovascular",
  "Dermatología",
  "Digestivo",
  "Endocrino",
  "Ginecología",
  "Mama",
  "Maxilofacial",
  "Neurocirugía",
  "Obstetricia",
  "Oftalmología",
  "Ortopedia",
  "Otorrinolaringología",
  "Plástica",
  "Procesos variados",
  "Urología",
];

export default function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    first_name: "",
    last_name: "",
    specialty: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { register, isAuthenticated, loginWithGoogle } = useAuth();

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

  const handleSpecialtyChange = (value: string) => {
    setFormData((prev) => ({ ...prev, specialty: value }));

    // Clear error when user selects
    if (errors.specialty) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.specialty;
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username) {
      newErrors.username = "Nombre de usuario es requerido";
    }

    if (!formData.email) {
      newErrors.email = "Email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Ingresa un email válido";
    }

    if (!formData.first_name) {
      newErrors.first_name = "Nombre es requerido";
    }

    if (!formData.last_name) {
      newErrors.last_name = "Apellido es requerido";
    }

    if (!formData.specialty) {
      newErrors.specialty = "Especialidad es requerida";
    }

    if (!formData.password) {
      newErrors.password = "Contraseña es requerida";
    } else if (formData.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }

    if (!formData.password2) {
      newErrors.password2 = "Confirma tu contraseña";
    } else if (formData.password !== formData.password2) {
      newErrors.password2 = "Las contraseñas no coinciden";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password2: formData.password2,
        first_name: formData.first_name,
        last_name: formData.last_name,
        specialty: formData.specialty,
      });

      toast({
        title: "¡Cuenta creada! Tienes 14 días Premium gratis",
        description: "Bienvenido/a a MéDico. Disfruta de acceso completo durante tu período de prueba.",
      });

      // El navigate lo hace el AuthContext automáticamente
    } catch (error: any) {
      console.error('Error en registro:', error);

      let errorMessage = "Ocurrió un error. Por favor intenta de nuevo.";

      // Manejar errores estructurados de AuthError
      if (error instanceof AuthError) {
        errorMessage = error.getUserMessage();
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error al crear cuenta",
        description: errorMessage,
        variant: "destructive",
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
        description: "Te has registrado con Google exitosamente.",
      });
      toast({
        title: "¡Bienvenido/a! Tienes 14 días Premium gratis",
        description: "Tu cuenta de Google fue registrada. Disfruta de acceso completo durante tu período de prueba.",
      });
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

  // Si ya está autenticado, redirigir al dashboard
  if (isAuthenticated) {
    return <Navigate to='/' replace />;
  }

  return (
    <div className='flex min-h-screen w-full bg-slate-50 dark:bg-slate-950'>
      {/* Panel izquierdo (Branding) */}
      <div className='hidden w-full lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-primary via-primary/80 to-secondary p-12 text-white overflow-hidden relative'>
        <div className="absolute inset-0 bg-black/10 z-0"></div>
        <div className="absolute top-40 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
        <div className="absolute -bottom-20 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl z-0 pointer-events-none"></div>

        <div className='relative z-10 flex items-center space-x-3 text-2xl font-bold'>
          <Activity className="h-8 w-8" />
          <span>MéDico</span>
        </div>

        <div className='relative z-10 space-y-4 max-w-lg'>
          <HeartPulse className="h-12 w-12 text-white/80" />
          <h1 className='text-4xl font-extrabold tracking-tight sm:text-5xl'>
            Únete a la evolución médica.
          </h1>
          <p className='text-lg text-white/80'>
            Regístrate hoy para transformar la forma en que interactúas con tus pacientes, citas y facturación.
          </p>
        </div>

        <div className='relative z-10 text-sm text-white/60'>
          © {new Date().getFullYear()} MéDico Inc. Todos los derechos reservados.
        </div>
      </div>

      {/* Panel derecho (Signup Form) */}
      <div className='flex w-full items-center justify-center p-6 lg:w-1/2 animate-slide-up overflow-y-auto max-h-screen'>
        <Card className='w-full max-w-md border-0 shadow-lg sm:border sm:shadow-sm my-10'>
          <CardHeader className="space-y-1">
            <div className='flex items-center justify-center space-x-2 text-primary lg:hidden mb-4'>
              <Activity className="h-6 w-6" />
              <span className='text-2xl font-bold'>MéDico</span>
            </div>
            <CardTitle className='text-2xl font-bold tracking-tight'>Crear cuenta</CardTitle>
            <CardDescription className="text-muted-foreground">Ingresa tus datos para registrar tu perfil profesional</CardDescription>
            <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <Crown className="h-4 w-4 text-yellow-600 shrink-0" />
              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                14 días de acceso Premium gratis al registrarte
              </span>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='first_name'>Nombre</Label>
                  <Input
                    id='first_name'
                    name='first_name'
                    placeholder='Juan'
                    value={formData.first_name}
                    onChange={handleChange}
                    disabled={isLoading}
                    aria-invalid={!!errors.first_name}
                  />
                  {errors.first_name && <p className='text-sm text-destructive'>{errors.first_name}</p>}
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='last_name'>Apellido</Label>
                  <Input
                    id='last_name'
                    name='last_name'
                    placeholder='Pérez'
                    value={formData.last_name}
                    onChange={handleChange}
                    disabled={isLoading}
                    aria-invalid={!!errors.last_name}
                  />
                  {errors.last_name && <p className='text-sm text-destructive'>{errors.last_name}</p>}
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='username'>Usuario</Label>
                <Input
                  id='username'
                  name='username'
                  placeholder='doctor123'
                  value={formData.username}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!errors.username}
                />
                {errors.username && <p className='text-sm text-destructive'>{errors.username}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  name='email'
                  type='email'
                  placeholder='doctor@example.com'
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!errors.email}
                />
                {errors.email && <p className='text-sm text-destructive'>{errors.email}</p>}
              </div>

              {/* Campo de Especialidad */}
              <div className='space-y-2'>
                <Label htmlFor='specialty'>Especialidad Médica</Label>
                <Select
                  value={formData.specialty}
                  onValueChange={handleSpecialtyChange}
                  disabled={isLoading}
                >
                  <SelectTrigger
                    id='specialty'
                    aria-invalid={!!errors.specialty}
                    className={errors.specialty ? 'border-destructive' : ''}
                  >
                    <SelectValue placeholder='Selecciona tu especialidad' />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.specialty && <p className='text-sm text-destructive'>{errors.specialty}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='password'>Contraseña</Label>
                <Input
                  id='password'
                  name='password'
                  type='password'
                  placeholder='••••••••'
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!errors.password}
                />
                {errors.password && <p className='text-sm text-destructive'>{errors.password}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='password2'>Confirmar Contraseña</Label>
                <Input
                  id='password2'
                  name='password2'
                  type='password'
                  placeholder='••••••••'
                  value={formData.password2}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!errors.password2}
                />
                {errors.password2 && <p className='text-sm text-destructive'>{errors.password2}</p>}
              </div>
            </CardContent>

            <CardFooter className='flex flex-col space-y-4'>
              <Button type='submit' className='w-full text-md h-12' disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                    Creando cuenta...
                  </>
                ) : (
                  "Comenzar"
                )}
              </Button>

              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-muted-foreground">
                    O regístrate con
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full text-md h-12"
                onClick={() => loginGoogle()}
                disabled={isLoading}
              >
                <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Google
              </Button>

              <p className='text-center text-sm text-muted-foreground'>
                ¿Ya tienes cuenta?{" "}
                <Link to='/login' className='text-primary font-medium underline-offset-4 hover:underline'>
                  Inicia sesión aquí
                </Link>
              </p>

              <p className='text-center text-xs text-muted-foreground/70 pt-2 border-t border-slate-100 dark:border-slate-800'>
                Al crear tu cuenta aceptas nuestros{" "}
                <a href='/terms.html' target='_blank' rel='noopener noreferrer' className='text-primary underline underline-offset-2 hover:text-primary/80 dark:text-primary dark:hover:text-primary/70 transition-colors'>
                  Términos de Uso
                </a>{" "}
                y{" "}
                <a href='/privacy.html' target='_blank' rel='noopener noreferrer' className='text-primary underline underline-offset-2 hover:text-primary/80 dark:text-primary dark:hover:text-primary/70 transition-colors'>
                  Política de Privacidad
                </a>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}