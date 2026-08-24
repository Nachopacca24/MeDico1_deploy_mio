import type React from "react";

import { useState, useEffect } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import { AuthError, NetworkError } from '@/shared/services/authErrors';
import { openLegalDoc } from '@/shared/utils/openLegalDoc';
import { readReferralFromClipboard } from '@/shared/utils/referralClipboard';
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/hooks/use-toast";
import { useSiteSettings } from "@/shared/hooks/useSiteSettings";
import { Loader2, Activity, HeartPulse, Crown } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

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
  const { FREE_FOR_ALL_PREMIUM, TRIAL_DAYS } = useSiteSettings();
  const isFreeForAllPromo = FREE_FOR_ALL_PREMIUM === '1';
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
  const { register, isAuthenticated, loading: authLoading, loginWithGoogle, loginWithApple } = useAuth();
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get('ref') || localStorage.getItem('referral_code') || '';
    if (ref) {
      setReferralCode(ref);
      localStorage.setItem('referral_code', ref);
    }
  }, []);

  /**
   * Best-effort recovery for someone who scanned a colleague's QR without
   * the app installed, went through the App/Play Store, and is now
   * registering from a completely fresh install — no ?ref= in the URL, and
   * nothing in this app's own localStorage (it's a separate storage
   * container from whatever browser they used before installing). See
   * shared/utils/referralClipboard.ts.
   *
   * Must be called as the first async step of a real user-gesture handler
   * (form submit, button tap) — reading the clipboard without one is denied
   * by most mobile browsers/WebViews. If we already know the code (URL or
   * localStorage), skips the clipboard entirely.
   */
  const resolveReferralCode = async (): Promise<string | null> => {
    if (referralCode) return referralCode;
    const fromClipboard = await readReferralFromClipboard();
    if (fromClipboard) {
      setReferralCode(fromClipboard);
      localStorage.setItem('referral_code', fromClipboard);
      return fromClipboard;
    }
    return null;
  };

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

    // First await in this handler — stays inside the button-tap gesture window
    // the clipboard read needs (see resolveReferralCode).
    const ref = await resolveReferralCode();

    setIsLoading(true);

    try {
      const result = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password2: formData.password2,
        first_name: formData.first_name,
        last_name: formData.last_name,
        specialty: formData.specialty,
        ...(ref ? { referral_code: ref } : {}),
      });
      if (ref) localStorage.removeItem('referral_code');

      // El backend ya conectó al colega y devuelve su nombre en la misma respuesta —
      // no depende de una segunda llamada de red que podía fallar en silencio.
      const colleagueName = result.colleague_name;

      toast({
        title: `¡Cuenta creada! Tienes ${trialDays} días Premium gratis`,
        description: "Bienvenido/a a MeDico App. Disfruta de acceso completo durante tu período de prueba.",
      });

      if (colleagueName) {
        setTimeout(() => toast({
          title: "¡Ya son colegas!",
          description: `Quedaste conectado con ${colleagueName} automáticamente.`,
        }), 800);
      }

      // El navigate lo hace el AuthContext automáticamente
    } catch (error: any) {
      console.error('Error en registro:', error);

      let errorMessage = "Ocurrió un error. Por favor intenta de nuevo.";

      // Manejar errores estructurados de AuthError/NetworkError — cualquier otro
      // tipo de error queda con el mensaje genérico de arriba en vez de mostrar
      // error.message crudo (puede ser un mensaje técnico del navegador/SDK).
      if (error instanceof AuthError) {
        errorMessage = error.getUserMessage();
      } else if (error instanceof NetworkError) {
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
    // referralCode here reflects whatever resolveReferralCode() found in
    // handleGoogleClick — by the time this fires (after the OAuth popup
    // round-trip), that resolution has long since finished.
    setIsLoading(true);
    try {
      const result = await loginWithGoogle(tokenResponse.access_token || tokenResponse.credential || tokenResponse.id_token, referralCode || undefined);
      if (referralCode) localStorage.removeItem('referral_code');
      const colleagueNameGoogle = result.colleague_name;
      const isNew = result.message.includes('Registro');
      toast({
        title: isNew ? `¡Bienvenido/a! Tienes ${trialDays} días Premium gratis` : "¡Bienvenido/a de nuevo!",
        description: isNew
          ? "Tu cuenta fue registrada. Disfrutá acceso completo durante tu período de prueba."
          : "Iniciaste sesión con Google correctamente.",
      });
      if (colleagueNameGoogle) {
        setTimeout(() => toast({ title: "¡Ya son colegas!", description: `Quedaste conectado con ${colleagueNameGoogle} automáticamente.` }), 800);
      }
    } catch (error: unknown) {
      let msg = "No se pudo registrar con Google.";
      if (error instanceof AuthError) msg = error.getUserMessage();
      else if (error instanceof NetworkError) msg = "Sin conexión a internet. Verificá tu red e intentá de nuevo.";
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
    // First await — still inside the button-tap gesture window the clipboard
    // read needs (native plugin calls aren't subject to popup-blocking, so
    // this await is safe here unlike the web OAuth popup path below).
    const ref = await resolveReferralCode();
    setIsLoading(true);
    try {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const token = result.credential?.idToken;
      if (!token) throw new Error('No se pudo obtener el token de Google');
      const resultNative = await loginWithGoogle(token, ref || undefined);
      if (ref) localStorage.removeItem('referral_code');
      const colleagueNameNative = resultNative.colleague_name;
      const isNewNative = resultNative.message.includes('Registro');
      toast({
        title: isNewNative ? `¡Bienvenido/a! Tienes ${trialDays} días Premium gratis` : "¡Bienvenido/a de nuevo!",
        description: isNewNative
          ? "Tu cuenta fue registrada. Disfrutá acceso completo durante tu período de prueba."
          : "Iniciaste sesión con Google correctamente.",
      });
      if (colleagueNameNative) {
        setTimeout(() => toast({ title: "¡Ya son colegas!", description: `Quedaste conectado con ${colleagueNameNative} automáticamente.` }), 800);
      }
    } catch (error: unknown) {
      const cancelled =
        (error as any)?.error === 'popup_closed_by_user' ||
        (error as any)?.message === 'User cancelled' ||
        (error as any)?.code === 12501;
      if (!cancelled) {
        let msg = "No se pudo registrar con Google.";
        if (error instanceof AuthError) msg = error.getUserMessage();
        else if (error instanceof NetworkError) msg = "Sin conexión a internet. Verificá tu red e intentá de nuevo.";
        toast({ variant: "destructive", title: "Error al registrarse", description: msg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (Capacitor.isNativePlatform()) {
      handleGoogleNative(); // resolves the referral code itself, safely (see above)
    } else {
      // loginGoogle() opens a real browser popup — it has to be called
      // synchronously off this click, or most browsers treat the popup as
      // not user-initiated and block it. So this fires without awaiting;
      // handleGoogleSuccess reads the resolved referralCode from state once
      // the OAuth round-trip completes (always well after this resolves).
      resolveReferralCode();
      loginGoogle();
    }
  };

  const handleAppleSignIn = async () => {
    // Same reasoning as handleGoogleNative — safe to await here (native plugin
    // call, not a web popup).
    const ref = await resolveReferralCode();
    setIsLoading(true);
    try {
      const result = await FirebaseAuthentication.signInWithApple();
      const idToken = result.credential?.idToken;
      if (!idToken) throw new Error('No se pudo obtener el token de Apple');

      const email = result.user?.email ?? null;
      const displayName = result.user?.displayName ?? null;
      const nameParts = displayName ? displayName.split(' ') : [];
      const givenName = nameParts[0] ?? null;
      const familyName = nameParts.slice(1).join(' ') || null;

      const resultApple = await loginWithApple({
        identity_token: idToken,
        given_name: givenName,
        family_name: familyName,
        email,
        referral_code: ref || undefined,
      });
      if (ref) localStorage.removeItem('referral_code');
      const colleagueNameApple = resultApple.colleague_name;
      const isNewApple = resultApple.message.includes('Registro');
      toast({
        title: isNewApple ? `¡Bienvenido/a! Tienes ${trialDays} días Premium gratis` : "¡Bienvenido/a de nuevo!",
        description: isNewApple
          ? "Tu cuenta fue registrada. Disfrutá acceso completo durante tu período de prueba."
          : "Iniciaste sesión con Apple correctamente.",
      });
      if (colleagueNameApple) {
        setTimeout(() => toast({ title: "¡Ya son colegas!", description: `Quedaste conectado con ${colleagueNameApple} automáticamente.` }), 800);
      }
    } catch (error: any) {
      const cancelled = error?.message?.includes('cancel') || error?.code === 'popup-closed-by-user';
      if (!cancelled) {
        console.error('Error en registro con Apple:', error?.name, error?.message);
        let msg = "No se pudo registrar con Apple.";
        if (error instanceof AuthError) msg = error.getUserMessage();
        else if (error instanceof NetworkError) msg = "Sin conexión a internet. Verificá tu red e intentá de nuevo.";
        toast({ variant: "destructive", title: "Error al registrarse", description: msg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isIOS = Capacitor.getPlatform() === 'ios';

  // Mientras se valida la sesión existente, no mostrar el formulario
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si ya está autenticado, redirigir al dashboard
  if (isAuthenticated) {
    return <Navigate to='/dashboard' replace />;
  }

  return (
    <div className='force-light flex min-h-screen w-full bg-slate-50'>
      {/* Panel izquierdo — solo desktop */}
      <div className='hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-sky-50 via-sky-200 to-sky-400 p-12 overflow-hidden relative'>
        <div className="absolute top-40 -left-20 w-80 h-80 bg-white/40 rounded-full blur-3xl z-0 pointer-events-none" />
        <div className="absolute -bottom-20 right-0 w-96 h-96 bg-white/40 rounded-full blur-3xl z-0 pointer-events-none" />
        <div className='relative z-10 flex items-center space-x-3 text-2xl font-bold text-sky-900'>
          <Activity className="h-8 w-8" />
          <span>MeDico App</span>
        </div>
        <div className='relative z-10 space-y-4 max-w-lg'>
          <HeartPulse className="h-12 w-12 text-sky-700/70" />
          <h1 className='text-4xl font-extrabold tracking-tight sm:text-5xl text-sky-900'>
            Únete a la evolución médica.
          </h1>
          <p className='text-lg text-sky-800/80'>
            Regístrate hoy para transformar la forma en que interactúas con tus pacientes, citas y facturación.
          </p>
        </div>
        <div className='relative z-10 text-sm text-sky-800/60'>
          © {new Date().getFullYear()} MeDico App Todos los derechos reservados.
        </div>
      </div>

      {/* Panel derecho — scroll independiente */}
      <div className='w-full lg:w-1/2 overflow-y-auto flex flex-col min-h-screen lg:min-h-0'>

        {/* Cabecera móvil */}
        <div className='lg:hidden w-full bg-gradient-to-br from-sky-50 via-sky-200 to-sky-400 px-6 pt-10 pb-8 relative overflow-hidden shrink-0'>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/50 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/50 rounded-full blur-2xl pointer-events-none" />
          <div className='relative flex items-center gap-3 mb-2 text-sky-900'>
            <img src="/favicon.png" alt="MeDico App" className="h-9 w-9 object-contain drop-shadow-sm" />
            <span className='text-2xl font-bold tracking-tight'>MeDico App</span>
          </div>
          <p className='relative text-sky-800/70 text-sm'>Únete y obtén {trialDays} días Premium gratis.</p>
        </div>

        {/* Contenido del formulario */}
        <div className='flex-1 flex items-start justify-center px-4 py-6 lg:items-center lg:px-8 lg:py-10'>
          <div className='w-full max-w-md space-y-5'>

            {/* Encabezado */}
            <div className='space-y-1'>
              <h1 className='text-2xl font-bold tracking-tight text-foreground'>Crear cuenta</h1>
              <p className='text-sm text-muted-foreground'>Ingresa tus datos para registrar tu perfil profesional</p>
            </div>

            {/* Badge Premium */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-400 rounded-lg">
              <Crown className="h-4 w-4 text-amber-900 shrink-0" />
              <span className="text-sm font-bold text-amber-900">{isFreeForAllPromo ? 'Gratis durante el período de desarrollo — Premium sin costo' : `${trialDays} días de acceso Premium gratis al registrarte`}</span>
            </div>

            {/* Apple — solo en iOS (requerido por App Store) */}
            {isIOS && (
              <button
                type="button"
                onClick={handleAppleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 h-13 px-4 py-3.5 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Official Apple "Sign in with Apple" logo-only artwork (white variant),
                    from Apple Design Resources — required as-is by App Review guideline 4. */}
                <svg className="h-5 w-5 shrink-0" viewBox="19 15 18 21" fill="currentColor">
                  <path d="M28.2226562,20.3846154 C29.0546875,20.3846154 30.0976562,19.8048315 30.71875,19.0317864 C31.28125,18.3312142 31.6914062,17.352829 31.6914062,16.3744437 C31.6914062,16.2415766 31.6796875,16.1087095 31.65625,16 C30.7304687,16.0362365 29.6171875,16.640178 28.9492187,17.4494596 C28.421875,18.06548 27.9414062,19.0317864 27.9414062,20.0222505 C27.9414062,20.1671964 27.9648438,20.3121424 27.9765625,20.3604577 C28.0351562,20.3725366 28.1289062,20.3846154 28.2226562,20.3846154 Z M25.2929688,35 C26.4296875,35 26.9335938,34.214876 28.3515625,34.214876 C29.7929688,34.214876 30.109375,34.9758423 31.375,34.9758423 C32.6171875,34.9758423 33.4492188,33.792117 34.234375,32.6325493 C35.1132812,31.3038779 35.4765625,29.9993643 35.5,29.9389701 C35.4179688,29.9148125 33.0390625,28.9122695 33.0390625,26.0979021 C33.0390625,23.6579784 34.9140625,22.5588048 35.0195312,22.474253 C33.7773438,20.6382708 31.890625,20.5899555 31.375,20.5899555 C29.9804688,20.5899555 28.84375,21.4596313 28.1289062,21.4596313 C27.3554688,21.4596313 26.3359375,20.6382708 25.1289062,20.6382708 C22.8320312,20.6382708 20.5,22.5950413 20.5,26.2911634 C20.5,28.5861411 21.3671875,31.013986 22.4335938,32.5842339 C23.3476562,33.9129053 24.1445312,35 25.2929688,35 Z" />
                </svg>
                {isLoading ? 'Conectando...' : 'Continuar con Apple'}
              </button>
            )}

            {/* ——— GOOGLE (botón principal, arriba) ——— */}
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isLoading}
              className="google-cta w-full flex items-center justify-center gap-3 h-13 px-4 py-3.5 rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {isLoading ? 'Conectando...' : 'Regístrate con Google'}
            </button>

            {/* Divisor */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-50 px-3 text-muted-foreground tracking-wide">O regístrate con tu email</span>
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label htmlFor='first_name'>Nombre</Label>
                  <Input id='first_name' name='first_name' placeholder='Juan'
                    value={formData.first_name} onChange={handleChange}
                    disabled={isLoading} aria-invalid={!!errors.first_name} />
                  {errors.first_name && <p className='text-xs text-destructive'>{errors.first_name}</p>}
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='last_name'>Apellido</Label>
                  <Input id='last_name' name='last_name' placeholder='Pérez'
                    value={formData.last_name} onChange={handleChange}
                    disabled={isLoading} aria-invalid={!!errors.last_name} />
                  {errors.last_name && <p className='text-xs text-destructive'>{errors.last_name}</p>}
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='username'>Usuario</Label>
                <Input id='username' name='username' placeholder='doctor123'
                  value={formData.username} onChange={handleChange}
                  disabled={isLoading} aria-invalid={!!errors.username} />
                {errors.username
                  ? <p className='text-xs text-destructive'>{errors.username}</p>
                  : <p className='text-xs text-muted-foreground'>Sin espacios. Así te reconocerán otros médicos.</p>
                }
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='email'>Email</Label>
                <Input id='email' name='email' type='email' placeholder='doctor@example.com'
                  value={formData.email} onChange={handleChange}
                  disabled={isLoading} aria-invalid={!!errors.email} />
                {errors.email && <p className='text-xs text-destructive'>{errors.email}</p>}
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='specialty'>Especialidad Médica</Label>
                <Select value={formData.specialty} onValueChange={handleSpecialtyChange} disabled={isLoading}>
                  <SelectTrigger id='specialty' aria-invalid={!!errors.specialty}
                    className={errors.specialty ? 'border-destructive' : ''}>
                    <SelectValue placeholder='Selecciona tu especialidad' />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.specialty && <p className='text-xs text-destructive'>{errors.specialty}</p>}
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label htmlFor='password'>Contraseña</Label>
                  <Input id='password' name='password' type='password' placeholder='••••••••'
                    value={formData.password} onChange={handleChange}
                    disabled={isLoading} aria-invalid={!!errors.password} />
                  {errors.password && <p className='text-xs text-destructive'>{errors.password}</p>}
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='password2'>Confirmar</Label>
                  <Input id='password2' name='password2' type='password' placeholder='••••••••'
                    value={formData.password2} onChange={handleChange}
                    disabled={isLoading} aria-invalid={!!errors.password2} />
                  {errors.password2 && <p className='text-xs text-destructive'>{errors.password2}</p>}
                </div>
              </div>

              <Button type='submit' className='w-full h-12 text-base' disabled={isLoading}>
                {isLoading ? <><Loader2 className='mr-2 h-5 w-5 animate-spin' />Creando cuenta...</> : 'Comenzar'}
              </Button>
            </form>

            {/* Links de pie */}
            <div className='space-y-3 pb-6'>
              <p className='text-center text-sm text-muted-foreground'>
                ¿Ya tienes cuenta?{' '}
                <Link to='/login' className='text-primary font-medium underline-offset-4 hover:underline'>
                  Inicia sesión aquí
                </Link>
              </p>
              <p className='text-center text-xs text-muted-foreground/70 pt-2 border-t border-slate-100'>
                Al crear tu cuenta aceptas nuestros{' '}
                <a href='/terms.html' onClick={(e) => { e.preventDefault(); openLegalDoc('/terms.html'); }}
                  className='text-primary underline underline-offset-2 hover:text-primary/80 transition-colors'>
                  Términos de Uso
                </a>{' '}y{' '}
                <a href='/privacy.html' onClick={(e) => { e.preventDefault(); openLegalDoc('/privacy.html'); }}
                  className='text-primary underline underline-offset-2 hover:text-primary/80 transition-colors'>
                  Política de Privacidad
                </a>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}