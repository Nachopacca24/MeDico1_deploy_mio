import type React from "react";
import { useState } from "react";
import { useNavigate, Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import { AuthError, NetworkError } from '@/shared/services/authErrors';
import { authService } from '@/shared/services/authService';
import { openLegalDoc } from '@/shared/utils/openLegalDoc';
import { resolvePendingReferralCode } from '@/shared/utils/referralClipboard';

const API_URL = import.meta.env.VITE_API_URL || '';

async function processPendingInvite(code: string | null): Promise<string | null> {
  if (!code) return null;
  try {
    const res = await authService.authenticatedFetch(`${API_URL}/api/auth/accept-invite/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friend_code: code }),
    });
    const data = await res.json();
    // Only clear once we actually got an answer from the server — if the
    // request itself fails below (network blip right after login), the code
    // stays put so the next login retries instead of silently losing it.
    localStorage.removeItem('referral_code');
    if (data.ok && data.colleague_name) return data.colleague_name;
  } catch (err) {
    console.error('[processPendingInvite] No se pudo conectar como colega:', err);
  }
  return null;
}
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

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
  const { login, isAuthenticated, isAdmin, loading: authLoading, loginWithGoogle, loginWithApple } = useAuth();

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

    // First await in this handler — stays inside the button-tap gesture
    // window the clipboard read needs (see resolvePendingReferralCode).
    // Covers e.g. an existing doctor who scanned a colleague's QR without
    // the app, installed it fresh, and logs in with email/password instead
    // of registering — localStorage alone would miss that case.
    const ref = await resolvePendingReferralCode();

    setIsLoading(true);

    try {
      const response = await login({
        email: formData.email,
        password: formData.password,
      });

      const colleagueName = await processPendingInvite(ref);

      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión exitosamente.",
      });

      if (colleagueName) {
        setTimeout(() => toast({
          title: "¡Ya son colegas!",
          description: `Quedaste conectado con ${colleagueName} automáticamente.`,
        }), 800);
      }

      if (location.state?.from) {
        navigate(location.state.from);
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error('Error en login:', error);

      // NetworkError/AuthError always carry a clean, user-facing message — anything
      // else is unexpected, so show a generic message instead of a raw error.message
      // (which could be a browser/SDK technical string, not something written for users).
      let errorMessage = "Ocurrió un error inesperado. Intentá de nuevo.";

      if (error instanceof NetworkError) {
        errorMessage = error.message;
      } else if (error instanceof AuthError) {
        errorMessage = error.getUserMessage();
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

  // Extracts the most descriptive message from any error type. Deliberately does
  // NOT fall back to a raw Error.message for generic Error/TypeError instances —
  // those are browser/JS-level failures (e.g. "Failed to fetch") never meant for
  // an end user to read. The { message } / { error } object-shape handling below
  // is a narrower, intentional exception for known native SDK response shapes.
  const extractErrorMessage = (error: unknown): string => {
    if (error instanceof AuthError) return error.getUserMessage();
    if (error instanceof NetworkError) return 'Sin conexión a internet. Verificá tu red e intentá de nuevo.';
    if (!(error instanceof Error) && typeof error === 'object' && error !== null) {
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
    // Almost always resolves instantly from localStorage — either it was
    // already there, or handleGoogleClick's fire-and-forget clipboard check
    // (below) already wrote it there by the time this fires (it's called
    // once the OAuth popup round-trip completes, always well after that).
    // Harmless either way: the backend only *credits* a referral when this
    // Google account turns out to be genuinely new (grant_credit=created) —
    // an existing account logging back in just connects as a colleague if a
    // code is present, never gets charged a "new referral".
    const ref = await resolvePendingReferralCode();
    setIsLoading(true);
    try {
      const result = await loginWithGoogle(tokenResponse.access_token || tokenResponse.credential || tokenResponse.id_token, ref || undefined);
      if (ref) localStorage.removeItem('referral_code');
      toast({ title: "¡Bienvenido/a!", description: "Has iniciado sesión con Google exitosamente." });
      if (result.colleague_name) {
        setTimeout(() => toast({ title: "¡Ya son colegas!", description: `Quedaste conectado con ${result.colleague_name} automáticamente.` }), 800);
      }
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
    // Safe to await here (native plugin call, not a web popup) — see
    // handleGoogleClick for why the web path can't do the same.
    const ref = await resolvePendingReferralCode();
    setIsLoading(true);
    try {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const token = result.credential?.idToken;
      if (!token) throw new Error('No se pudo obtener el token de Google');
      const loginResult = await loginWithGoogle(token, ref || undefined);
      if (ref) localStorage.removeItem('referral_code');
      toast({ title: "¡Bienvenido/a!", description: "Has iniciado sesión con Google exitosamente." });
      if (loginResult.colleague_name) {
        setTimeout(() => toast({ title: "¡Ya son colegas!", description: `Quedaste conectado con ${loginResult.colleague_name} automáticamente.` }), 800);
      }
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
    if (Capacitor.isNativePlatform()) {
      handleGoogleNative(); // resolves the referral code itself, safely (see above)
    } else {
      // loginGoogle() opens a real browser popup — has to fire synchronously
      // off this click or most browsers block it as not user-initiated, so
      // this can't await first. handleGoogleSuccess reads the result from
      // localStorage once the OAuth round-trip completes (always well after
      // this resolves).
      resolvePendingReferralCode();
      loginGoogle();
    }
  };

  const handleAppleSignIn = async () => {
    // Same reasoning as handleGoogleNative — safe to await here (native
    // plugin call, not a web popup).
    const ref = await resolvePendingReferralCode();
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

      const loginResult = await loginWithApple({
        identity_token: idToken,
        given_name: givenName,
        family_name: familyName,
        email,
        referral_code: ref || undefined,
      });
      if (ref) localStorage.removeItem('referral_code');
      toast({ title: '¡Bienvenido/a!', description: 'Has iniciado sesión con Apple exitosamente.' });
      if (loginResult.colleague_name) {
        setTimeout(() => toast({ title: "¡Ya son colegas!", description: `Quedaste conectado con ${loginResult.colleague_name} automáticamente.` }), 800);
      }
      navigate(location.state?.from ?? '/dashboard');
    } catch (error: any) {
      const cancelled = error?.message?.includes('cancel') || error?.code === 'popup-closed-by-user';
      if (!cancelled) {
        console.error('Error en login con Apple:', error?.name, error?.message);
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo iniciar sesión con Apple.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isIOS = Capacitor.getPlatform() === 'ios';

  // Mientras se valida la sesión existente, no mostrar el formulario de login
  // (evita el flash de login -> dashboard al reabrir la app)
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si ya está autenticado, redirigir según el rol
  if (isAuthenticated) {
    if (isAdmin) {
      return <Navigate to='/admin' replace />;
    }
    return <Navigate to='/dashboard' replace />;
  }

  return (
    <div className='force-light flex min-h-screen w-full bg-slate-50'>
      {/* Panel izquierdo — solo desktop */}
      <div className='hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-sky-50 via-sky-200 to-sky-400 p-12 overflow-hidden relative'>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/40 rounded-full blur-3xl z-0 pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/40 rounded-full blur-3xl z-0 pointer-events-none" />

        <div className='relative z-10 flex items-center space-x-3 text-2xl font-bold text-sky-900'>
          <div className="bg-white rounded-lg p-1 flex items-center justify-center shadow-sm">
            <img src="/MEDICO-BAJA-01-solo-logo.JPG" alt="" className="h-7 w-7 object-contain" />
          </div>
          <span>MeDico App</span>
        </div>

        <div className='relative z-10 space-y-5 max-w-lg'>
          <h1 className='text-4xl font-extrabold tracking-tight sm:text-5xl text-sky-900'>
            Simplifica tu práctica médica diaria.
          </h1>
          <p className='text-lg text-sky-800/80'>
            La plataforma integral para gestionar pacientes, citas y facturación con seguridad y precisión.
          </p>
          {/* Features */}
          <ul className='space-y-2 text-sky-800/90 text-sm'>
            {['Gestión de cirugías y honorarios', 'Cálculo automático con tabla RVU', 'Exportación de PDF y estadísticas', 'Calendario sincronizado con Google'].map(f => (
              <li key={f} className='flex items-center gap-2'>
                <span className='h-1.5 w-1.5 rounded-full bg-sky-600 shrink-0' />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className='relative z-10 text-sm text-sky-800/60'>
          © {new Date().getFullYear()} MeDico App — Todos los derechos reservados.
        </div>
      </div>

      {/* Panel derecho */}
      <div className='w-full lg:w-1/2 overflow-y-auto flex flex-col min-h-screen lg:min-h-0'>

        {/* Cabecera móvil */}
        <div className='lg:hidden w-full bg-gradient-to-br from-sky-50 via-sky-200 to-sky-400 px-6 pt-10 pb-8 relative overflow-hidden shrink-0'>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/50 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/50 rounded-full blur-2xl pointer-events-none" />
          <div className='relative flex items-center gap-3 mb-2 text-sky-900'>
            <img src="/favicon.png" alt="MeDico App" className="h-9 w-9 object-contain drop-shadow-sm" />
            <span className='text-2xl font-bold tracking-tight'>MeDico App</span>
          </div>
          <p className='relative text-sky-800/70 text-sm'>Tu práctica médica, organizada.</p>
        </div>

        {/* Contenido */}
        <div className='flex-1 flex items-start justify-center px-4 py-8 lg:items-center lg:px-8 lg:py-10'>
          <div className='w-full max-w-md space-y-5'>

            {/* Encabezado */}
            <div className='space-y-1'>
              <h1 className='text-2xl font-bold tracking-tight text-foreground'>Bienvenido de nuevo</h1>
              <p className='text-sm text-muted-foreground'>Ingresa tus credenciales para acceder a tu cuenta</p>
            </div>

            {/* Apple — solo en iOS (requerido por App Store) */}
            {isIOS && (
              <div className="space-y-1.5">
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
                  {isLoading ? 'Conectando...' : 'Iniciar sesión con Apple'}
                </button>
                <p className="text-xs text-muted-foreground text-center px-2">
                  Asegurate de usar el mismo email con el que te registraste para evitar crear una cuenta duplicada.
                </p>
              </div>
            )}

            {/* Google — botón principal */}
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
              {isLoading ? 'Conectando...' : 'Continuar con Google'}
            </button>

            {/* Divisor */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-50 px-3 text-muted-foreground tracking-wide">O con tu email</span>
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='email'>Correo electrónico</Label>
                <Input
                  id='email' name='email' type='email' placeholder='doctor@ejemplo.com'
                  value={formData.email} onChange={handleChange}
                  disabled={isLoading} aria-invalid={!!errors.email}
                />
                {errors.email && <p className='text-xs text-destructive'>{errors.email}</p>}
              </div>

              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <Label htmlFor='password'>Contraseña</Label>
                  <Link to='/forgot-password' className='text-xs text-primary underline-offset-4 hover:underline'>
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input
                  id='password' name='password' type='password' placeholder='••••••••'
                  value={formData.password} onChange={handleChange}
                  disabled={isLoading} aria-invalid={!!errors.password}
                />
                {errors.password && <p className='text-xs text-destructive'>{errors.password}</p>}
              </div>

              <div className='flex items-center space-x-2'>
                <Checkbox id='rememberMe' checked={formData.rememberMe} onCheckedChange={handleCheckboxChange} />
                <Label htmlFor='rememberMe' className='text-sm font-normal cursor-pointer'>Recuérdame</Label>
              </div>

              <Button type='submit' className='w-full h-12 text-base' disabled={isLoading}>
                {isLoading
                  ? <><Loader2 className='mr-2 h-5 w-5 animate-spin' />Iniciando sesión...</>
                  : 'Iniciar sesión'}
              </Button>
            </form>

            {/* Crear cuenta */}
            <div className='pt-1 space-y-3'>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-50 px-3 text-muted-foreground tracking-wide">¿Nuevo en MeDico App?</span>
                </div>
              </div>

              <Link
                to='/signup'
                className='amber-cta w-full flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-sky-400 text-sky-700 font-semibold text-sm hover:bg-sky-50 hover:border-sky-500'
              >
                Crear cuenta gratis
              </Link>
            </div>

            {/* Legal */}
            <p className='text-center text-xs text-muted-foreground/70 pb-6 border-t border-slate-100 pt-3'>
              Al usar MeDico App aceptas nuestros{' '}
              <a href='/terms.html' onClick={(e) => { e.preventDefault(); openLegalDoc('/terms.html'); }} className='text-primary underline underline-offset-2 hover:text-primary/80 transition-colors'>Términos de Uso</a>
              {' '}y{' '}
              <a href='/privacy.html' onClick={(e) => { e.preventDefault(); openLegalDoc('/privacy.html'); }} className='text-primary underline underline-offset-2 hover:text-primary/80 transition-colors'>Política de Privacidad</a>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}