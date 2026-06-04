// src/core/components/WelcomeModal.tsx

import { useState, useEffect } from 'react';
import { Stethoscope, Sparkles, ArrowRight, X } from 'lucide-react';
import { useTutorial } from '@/core/contexts/TutorialContext';
import { useAuth } from '@/shared/contexts/AuthContext';

export function WelcomeModal() {
  const { tutorialState, startTutorial, dismissWelcome } = useTutorial();
  const { user } = useAuth();

  // Solo mostrar si el usuario acaba de registrarse en esta sesión
  const [visible, setVisible] = useState(() => {
    const justRegistered = sessionStorage.getItem('medico_just_registered') === 'true';
    return justRegistered && !tutorialState.seen && !tutorialState.completed;
  });

  // Limpiar el flag de registro y marcar como visto al montar
  useEffect(() => {
    if (visible) {
      sessionStorage.removeItem('medico_just_registered');
      dismissWelcome();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  const firstName = user?.first_name || user?.username || 'Doctor';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">

        {/* top gradient accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/70 to-primary/40" />

        {/* dismiss */}
        <button
          onClick={dismissWelcome}
          className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-8">
          {/* icon */}
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

          {/* text */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black mb-2">
              ¡Bienvenido, {firstName}!
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Tu cuenta de MeDico App está lista. Tenés{' '}
              <span className="font-semibold text-amber-400">14 días de Premium gratis</span>{' '}
              para explorar todo sin límites.
            </p>
          </div>

          {/* what they'll learn */}
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

          {/* actions */}
          <div className="space-y-3">
            <button
              onClick={startTutorial}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 active:scale-95 transition-all"
            >
              Empezar el tutorial
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={dismissWelcome}
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
