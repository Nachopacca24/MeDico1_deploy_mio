// src/core/components/WelcomeModal.tsx

import { useState, useEffect } from 'react';
import { Stethoscope, Sparkles, ArrowRight, X, Mail, Loader2 } from 'lucide-react';
import { useTutorial } from '@/core/contexts/TutorialContext';
import { useAuth } from '@/shared/contexts/AuthContext';
import { emailVerificationService } from '@/shared/services/emailVerificationService';
import { useToast } from '@/shared/hooks/use-toast';

type Screen = 'email' | 'tutorial';

export function WelcomeModal() {
  const { tutorialState, startTutorial, dismissWelcome } = useTutorial();
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);

  const [visible, setVisible] = useState(() => {
    const justRegistered = sessionStorage.getItem('medico_just_registered') === 'true';
    const justVerified = sessionStorage.getItem('medico_just_verified') === 'true';
    return (justRegistered || justVerified) && !tutorialState.completed;
  });

  // Pantalla inicial: si recién registró y el email no está verificado → pantalla de email
  const [screen, setScreen] = useState<Screen>(() => {
    const justRegistered = sessionStorage.getItem('medico_just_registered') === 'true';
    const emailVerified = user?.is_email_verified ?? false;
    return justRegistered && !emailVerified ? 'email' : 'tutorial';
  });

  // Limpiar flags de sesión al montar
  useEffect(() => {
    if (visible) {
      sessionStorage.removeItem('medico_just_registered');
      sessionStorage.removeItem('medico_just_verified');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    dismissWelcome();
    setVisible(false);
  };

  const handleStartTutorial = () => {
    startTutorial();
    setVisible(false);
  };

  const handleSkipTutorial = () => {
    dismissWelcome();
    setVisible(false);
  };

  const handleResend = async () => {
    if (!accessToken) return;
    setIsResending(true);
    try {
      await emailVerificationService.resendVerificationEmail(accessToken);
      toast({
        title: 'Email enviado',
        description: 'Revisá tu bandeja de entrada y la carpeta de spam.',
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo reenviar el email. Intentá más tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!visible) return null;

  const firstName = user?.first_name || user?.username || 'Doctor';

  // ── Pantalla 1: verificación de email ──────────────────────────────────────
  if (screen === 'email') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="relative bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">

          <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-200" />

          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-8">
            <div className="flex justify-center mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700">
                <Mail className="h-10 w-10 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-black mb-2">
                ¡Bienvenido, {firstName}!
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Para activar todas las funciones necesitás verificar tu cuenta.
                Te enviamos un email a{' '}
                <span className="font-semibold text-foreground">{user?.email}</span>.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800 dark:text-amber-200 text-center">
                📧 Revisá tu bandeja de entrada y la carpeta de spam.
                El link expira en 24 horas.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setScreen('tutorial')}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 active:scale-95 transition-all"
              >
                Entendido, ver el tutorial
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={handleResend}
                disabled={isResending}
                className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isResending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                  : 'Reenviar email de verificación'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Pantalla 2: tutorial ───────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">

        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/70 to-primary/40" />

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                <Stethoscope className="h-10 w-10 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 border-2 border-background">
                <Sparkles className="h-3.5 w-3.5 text-gray-900" />
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-black mb-2">
              ¡Tu cuenta está lista!
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Tenés{' '}
              <span className="font-semibold text-amber-400">14 días de Premium gratis</span>{' '}
              para explorar todo sin límites.
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 mb-6 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              El tutorial te va a mostrar
            </p>
            {[
              '🩺 Cómo usar la Tabla de California',
              '🏥 Configurar hospitales y seguros',
              '🔪 Registrar tu primera cirugía',
              '📊 Ver tus estadísticas y exportar PDF',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-foreground/80">
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleStartTutorial}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 active:scale-95 transition-all"
            >
              Empezar el tutorial
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={handleSkipTutorial}
              className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Ahora no, explorar solo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
