// src/core/components/TutorialCard.tsx

import { useState, useRef, useEffect } from 'react';
import { ChevronRight, X, BookOpen, ArrowUp } from 'lucide-react';
import { useTutorial, TUTORIAL_STEPS } from '@/core/contexts/TutorialContext';
import { useHighlightTarget } from './SpotlightOverlay';
import { useToast } from '@/shared/hooks/use-toast';

export function TutorialCard() {
  const { tutorialState, currentStepData, nextStep, skipTutorial } = useTutorial();
  const { toast } = useToast();

  const [collapsed, setCollapsed] = useState(false);
  // Position of the bubble when dragged; null = use default CSS position
  const [bubblePos, setBubblePos] = useState<{ x: number; y: number } | null>(null);

  const cardRef  = useRef<HTMLDivElement>(null);
  const drag     = useRef({ active: false, moved: false, startX: 0, startY: 0, startBX: 0, startBY: 0 });
  const prevActive = useRef(tutorialState.active);

  useHighlightTarget(currentStepData?.target, tutorialState.step);

  // Tapping anywhere outside the card collapses it to the bubble
  useEffect(() => {
    if (collapsed || !tutorialState.active) return;
    const onTouch = (e: TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setCollapsed(true);
      }
    };
    document.addEventListener('touchstart', onTouch, { capture: true, passive: true });
    return () => document.removeEventListener('touchstart', onTouch, true);
  }, [collapsed, tutorialState.active]);

  // Completion toast
  useEffect(() => {
    if (prevActive.current && !tutorialState.active && tutorialState.completed) {
      toast({
        title: '¡Tutorial completado!',
        description: 'Ya conocés todo MeDico App. Podés reiniciarlo desde Configuración → Tutorial.',
        duration: 6000,
      });
    }
    prevActive.current = tutorialState.active;
  }, [tutorialState.active, tutorialState.completed, toast]);

  if (!tutorialState.active || !currentStepData) return null;

  const total      = TUTORIAL_STEPS.length;
  const current    = tutorialState.step;
  const isLastStep = current === total;
  const progress   = (current / total) * 100;

  const scrollToTarget = () => {
    if (!currentStepData.target) return;
    document.querySelector(`[data-tutorial="${currentStepData.target}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ── Drag handlers (touch) ────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const defaultX = window.innerWidth  - 72;
    const defaultY = window.innerHeight - 160;
    drag.current = {
      active: true, moved: false,
      startX: t.clientX, startY: t.clientY,
      startBX: bubblePos?.x ?? defaultX,
      startBY: bubblePos?.y ?? defaultY,
    };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current.active) return;
    const t  = e.touches[0];
    const dx = t.clientX - drag.current.startX;
    const dy = t.clientY - drag.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) drag.current.moved = true;
    if (drag.current.moved) {
      setBubblePos({
        x: Math.max(8, Math.min(window.innerWidth  - 64, drag.current.startBX + dx)),
        y: Math.max(8, Math.min(window.innerHeight - 64, drag.current.startBY + dy)),
      });
    }
  };

  const onTouchEnd = () => {
    if (!drag.current.moved) setCollapsed(false); // tap → expand
    drag.current.active = false;
  };

  // ── Collapsed: floating draggable bubble ─────────────────────────
  if (collapsed) {
    const style: React.CSSProperties = bubblePos
      ? { position: 'fixed', left: bubblePos.x, top: bubblePos.y, zIndex: 100 }
      : { position: 'fixed', bottom: 'calc(3.5rem + var(--sab,0px) + 1.25rem)', right: '1rem', zIndex: 100 };

    return (
      <div
        style={style}
        className="touch-none select-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="w-14 h-14 rounded-full bg-primary shadow-xl flex flex-col items-center justify-center animate-bounce cursor-pointer active:scale-90 transition-transform">
          <BookOpen className="h-5 w-5 text-primary-foreground" />
          <span className="text-[10px] font-bold text-primary-foreground leading-none mt-0.5">
            {current}/{total}
          </span>
        </div>
      </div>
    );
  }

  // ── Expanded: full card ──────────────────────────────────────────
  return (
    <div
      ref={cardRef}
      className="fixed bottom-[calc(3.5rem+var(--sab,0px)+0.5rem)] left-2 right-2 z-[100] bg-card border border-border rounded-2xl shadow-2xl max-w-sm mx-auto"
    >
      <div className="h-1 w-full bg-muted rounded-t-2xl overflow-hidden">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-0.5">
                Paso {current} de {total}
              </p>
              <p className="font-bold text-sm leading-tight truncate">
                {currentStepData.emoji} {currentStepData.title}
              </p>
            </div>
          </div>
          <button
            onClick={skipTutorial}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            aria-label="Cerrar tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
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
          {currentStepData.target && (
            <button
              onClick={scrollToTarget}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors py-1 px-2 font-medium"
            >
              <ArrowUp className="h-3 w-3" />
              Ver en pantalla
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
