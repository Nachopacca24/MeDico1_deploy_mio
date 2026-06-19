import type React from "react";

import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import { AuthError, NetworkError } from '@/shared/services/authErrors';
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2, ArrowRight, Star, ShieldCheck, FileText, Sparkles } from "lucide-react";
import { useSiteSettings } from "@/shared/hooks/useSiteSettings";
import { useGoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Lista de especialidades médicas basadas en tu sistema
const SPECIALTIES = [
  "Anestesiología",
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
  const { TRIAL_DAYS } = useSiteSettings();
  const trialDays = Number(TRIAL_DAYS);
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
        description: "Bienvenido/a a MeDico App. Disfruta de acceso completo durante tu período de prueba.",
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
      toast({ title: "¡Bienvenido/a! Tienes 14 días Premium gratis", description: "Tu cuenta fue registrada. Disfrutá acceso completo durante tu período de prueba." });
    } catch (error: unknown) {
      let msg = "No se pudo registrar con Google.";
      if (error instanceof AuthError) msg = error.getUserMessage();
      else if (error instanceof NetworkError) msg = "Sin conexión a internet. Verificá tu red e intentá de nuevo.";
      else if (error instanceof Error) msg = error.message;
      toast({ variant: "destructive", title: "Error al registrarse", description: msg });
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
      toast({ title: "¡Bienvenido/a! Tienes 14 días Premium gratis", description: "Tu cuenta fue registrada. Disfrutá acceso completo durante tu período de prueba." });
    } catch (error: unknown) {
      const cancelled =
        (error as any)?.error === 'popup_closed_by_user' ||
        (error as any)?.message === 'User cancelled' ||
        (error as any)?.code === 12501;
      if (!cancelled) {
        let msg = "No se pudo registrar con Google.";
        if (error instanceof AuthError) msg = error.getUserMessage();
        else if (error instanceof NetworkError) msg = "Sin conexión a internet. Verificá tu red e intentá de nuevo.";
        else if (error instanceof Error) msg = error.message;
        toast({ variant: "destructive", title: "Error al registrarse", description: msg });
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

  // Si ya está autenticado, redirigir al dashboard
  if (isAuthenticated) {
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
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12 overflow-hidden relative shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-amber-500/8 rounded-full blur-[100px] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo_transparente.png" alt="MeDico App" className="h-9 w-9 object-contain" />
          <span className="text-white text-xl font-bold tracking-tight">MeDico App</span>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          {/* Premium badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/20">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-amber-400">{trialDays} días Premium gratis · Sin tarjeta</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tight text-white leading-[1.1]">
              Únete a la<br />
              <span className="text-primary">evolución</span><br />
              médica.
            </h1>
            <p className="text-gray-400 text-base leading-relaxed max-w-xs">
              La plataforma que los médicos guatemaltecos eligieron para organizar su práctica quirúrgica.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              { icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />, text: 'Datos cifrados con AES-128-CBC' },
              { icon: <FileText className="h-4 w-4 text-sky-400" />, text: 'Exporta cirugías en PDF' },
              { icon: <Sparkles className="h-4 w-4 text-amber-400" />, text: 'Acceso anticipado a nuevas funciones' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-gray-400">
                <div className="p-1.5 rounded-lg bg-gray-800 shrink-0">{icon}</div>
                {text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-gray-700">
          © {new Date().getFullYear()} MeDico App · Todos los derechos reservados
        </div>
      </div>

      {/* ── Panel derecho — formulario ───────────────────────────── */}
      <div className="flex flex-1 items-start justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md animate-slide-up py-8">

          {/* Logo móvil */}
          <div className="flex items-center justify-center gap-3 lg:hidden mb-6">
            <img src="/logo_transparente.png" alt="MeDico App" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold text-white">MeDico App</span>
          </div>

          {/* Badge móvil */}
          <div className="flex items-center justify-center gap-2 mb-5 lg:hidden">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">{trialDays} días Premium gratis</span>
            </div>
          </div>

          <div className="rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl p-7">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">Crear cuenta</h2>
              <p className="text-gray-500 text-sm">Perfil profesional médico en minutos</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name" className="text-gray-300 text-sm">Nombre</Label>
                  <Input id="first_name" name="first_name" placeholder="Juan"
                    value={formData.first_name} onChange={handleChange} disabled={isLoading}
                    aria-invalid={!!errors.first_name}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-primary" />
                  {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name" className="text-gray-300 text-sm">Apellido</Label>
                  <Input id="last_name" name="last_name" placeholder="Pérez"
                    value={formData.last_name} onChange={handleChange} disabled={isLoading}
                    aria-invalid={!!errors.last_name}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-primary" />
                  {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-gray-300 text-sm">Usuario</Label>
                <Input id="username" name="username" placeholder="dr.juanperez"
                  value={formData.username} onChange={handleChange} disabled={isLoading}
                  aria-invalid={!!errors.username}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-primary" />
                {errors.username
                  ? <p className="text-xs text-destructive">{errors.username}</p>
                  : <p className="text-xs text-gray-600">Sin espacios. Así te verán tus colegas.</p>
                }
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-300 text-sm">Email</Label>
                <Input id="email" name="email" type="email" placeholder="doctor@ejemplo.com"
                  value={formData.email} onChange={handleChange} disabled={isLoading}
                  aria-invalid={!!errors.email}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-primary" />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="specialty" className="text-gray-300 text-sm">Especialidad médica</Label>
                <Select value={formData.specialty} onValueChange={handleSpecialtyChange} disabled={isLoading}>
                  <SelectTrigger id="specialty" aria-invalid={!!errors.specialty}
                    className={`bg-gray-800 border-gray-700 text-white ${errors.specialty ? 'border-destructive' : ''}`}>
                    <SelectValue placeholder="Selecciona tu especialidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.specialty && <p className="text-xs text-destructive">{errors.specialty}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-gray-300 text-sm">Contraseña</Label>
                  <Input id="password" name="password" type="password" placeholder="••••••••"
                    value={formData.password} onChange={handleChange} disabled={isLoading}
                    aria-invalid={!!errors.password}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-primary" />
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password2" className="text-gray-300 text-sm">Confirmar</Label>
                  <Input id="password2" name="password2" type="password" placeholder="••••••••"
                    value={formData.password2} onChange={handleChange} disabled={isLoading}
                    aria-invalid={!!errors.password2}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-primary" />
                  {errors.password2 && <p className="text-xs text-destructive">{errors.password2}</p>}
                </div>
              </div>

              <Button type="submit" className="w-full h-11 font-semibold mt-2" disabled={isLoading}>
                {isLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando cuenta...</>
                  : <><ArrowRight className="mr-2 h-4 w-4" /> Crear cuenta gratis</>
                }
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-900 px-3 text-gray-600">O regístrate con</span>
              </div>
            </div>

            <Button type="button" variant="outline"
              className="w-full h-11 border-gray-700 bg-gray-800 hover:bg-gray-750 text-gray-200 hover:text-white"
              onClick={handleGoogleClick} disabled={isLoading}>
              {GOOGLE_ICON}
              Continuar con Google
            </Button>

            <p className="text-center text-sm text-gray-500 mt-5">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">
                Inicia sesión
              </Link>
            </p>

            <div className="text-center text-xs text-gray-700 mt-4 pt-4 border-t border-gray-800">
              Al crear tu cuenta aceptas nuestros{" "}
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