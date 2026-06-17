// src/core/components/TutorialCard.tsx

import { ChevronRight, X, BookOpen } from 'lucide-react';
import { useTutorial, TUTORIAL_STEPS } from '@/core/contexts/TutorialContext';
import { useIsMobile } from '@/shared/hooks/useAdSystem';
import { SpotlightOverlay, useSpotlightRect, getTooltipPosition } from './SpotlightOverlay';

export function TutorialCard() {
  const { tutorialState, currentStepData, nextStep, skipTutorial } = useTutorial();
  const isMobile = useIsMobile();

  const rect = useSpotlightRect(currentStepData?.target, tutorialState.step);

  if (!tutorialState.active || !currentStepData) return null;

  const total      = TUTORIAL_STEPS.length;
  const current    = tutorialState.step;
  const isLastStep = current === total;
  const progress   = (current / total) * 100;

  const PADDING = 10;
  const TOOLTIP_GAP = 12;

  // ── Spotlight mode ──────────────────────────────────────────────
  if (rect) {
    const pos = getTooltipPosition(rect, PADDING);
    const tooltipTop = pos === 'below'
      ? rect.top + rect.height + PADDING + TOOLTIP_GAP
      : rect.top - PADDING - TOOLTIP_GAP;

    const tooltipLeft = Math.max(
      8,
      Math.min(
        rect.left + rect.width / 2 - 160,
        window.innerWidth - 328
      )
    );

    return (
      <>
        <SpotlightOverlay rect={rect} padding={PADDING} />

        {/* Tooltip posicionado cerca del elemento */}
        <div
          style={{
            position: 'fixed',
            top: pos === 'below' ? tooltipTop : undefined,
            bottom: pos === 'above' ? window.innerHeight - tooltipTop : undefined,
            left: tooltipLeft,
            width: 320,
            zIndex: 100,
            transition: 'top 0.3s ease, bottom 0.3s ease, left 0.3s ease',
          }}
          className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* barra de progreso */}
          <div className="h-1 w-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Paso {current} de {total}
                  </p>
                  <p className="font-bold text-sm leading-tight">
                    {currentStepData.emoji} {currentStepData.title}
                  </p>
                </div>
              </div>
              <button
                onClick={skipTutorial}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                aria-label="Saltar tutorial"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {currentStepData.description}
            </p>

            <div className="bg-primary/5 border border-primary/15 rounded-lg px-3 py-2 mb-3">
              <p className="text-xs text-primary font-medium leading-snug">
                💡 {currentStepData.hint}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={skipTutorial}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2"
              >
                Saltar tutorial
              </button>
              <button
                onClick={nextStep}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-bold px-4 py-2 rounded-xl hover:bg-primary/90 active:scale-95 transition-all"
              >
                {isLastStep ? '¡Listo!' : 'Siguiente'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Fallback: tarjeta fija abajo (sin target, elemento fuera de vista o no encontrado) ──
  const scrollToTarget = () => {
    if (!currentStepData?.target) return;
    const el = document.querySelector(`[data-tutorial="${currentStepData.target}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div
      className={`
        fixed z-[100] bg-card border border-border rounded-2xl shadow-2xl
        w-[calc(100vw-2rem)] max-w-sm
        transition-all duration-200
        ${isMobile
          ? 'bottom-[calc(3.5rem+var(--sab,0px)+0.75rem)] left-1/2 -translate-x-1/2'
          : 'bottom-6 right-6'}
      `}
    >
      <div className="h-1 w-full bg-muted rounded-t-2xl overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Paso {current} de {total}
              </p>
              <p className="font-bold text-sm leading-tight truncate">
                {currentStepData.emoji} {currentStepData.title}
              </p>
            </div>
          </div>
          <button
            onClick={skipTutorial}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Saltar tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          {currentStepData.description}
        </p>
        <div className="bg-primary/5 border border-primary/15 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-primary font-medium leading-snug">
            💡 {currentStepData.hint}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={skipTutorial}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2"
          >
            Saltar
          </button>
          {currentStepData?.target && (
            <button
              onClick={scrollToTarget}
              className="text-xs text-primary hover:text-primary/80 transition-colors py-1 px-2 font-medium"
            >
              ↑ Ver paso
            </button>
          )}
          <button
            onClick={nextStep}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-bold px-4 py-2 rounded-xl hover:bg-primary/90 active:scale-95 transition-all"
          >
            {isLastStep ? '¡Listo!' : 'Siguiente'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
