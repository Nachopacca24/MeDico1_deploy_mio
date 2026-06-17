// src/core/components/SpotlightOverlay.tsx
import { useEffect, useState } from 'react';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Encuentra el elemento marcado con data-tutorial, hace scroll y devuelve su rect */
export function useSpotlightRect(target: string | undefined, step: number) {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!target) { setRect(null); return; }

    const update = () => {
      const el = document.querySelector(`[data-tutorial="${target}"]`);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      // If element is mostly out of viewport, hide spotlight so the fallback card shows
      const inView = r.bottom > 80 && r.top < window.innerHeight - 80;
      if (!inView) { setRect(null); return; }
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    // Espera que la ruta renderice, luego hace scroll al elemento
    const t1 = setTimeout(() => {
      const el = document.querySelector(`[data-tutorial="${target}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const t2 = setTimeout(update, 600);
        return () => clearTimeout(t2);
      } else {
        update();
      }
    }, 300);

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      clearTimeout(t1);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [target, step]);

  return rect;
}

interface SpotlightOverlayProps {
  rect: Rect;
  padding?: number;
}

/** Capa oscura con recorte sobre el elemento objetivo */
export function SpotlightOverlay({ rect, padding = 10 }: SpotlightOverlayProps) {
  const t = rect.top - padding;
  const l = rect.left - padding;
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;

  return (
    <>
      {/* Oscurecer todo excepto el elemento — box-shadow trick, pointer-events none */}
      <div
        style={{
          position: 'fixed',
          top: t,
          left: l,
          width: w,
          height: h,
          borderRadius: 12,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
          zIndex: 98,
          pointerEvents: 'none',
          transition: 'top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease',
        }}
      />
      {/* Borde de foco animado */}
      <div
        style={{
          position: 'fixed',
          top: t - 2,
          left: l - 2,
          width: w + 4,
          height: h + 4,
          borderRadius: 14,
          border: '2px solid rgba(0,188,212,0.8)',
          boxShadow: '0 0 12px rgba(0,188,212,0.4)',
          zIndex: 99,
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
          animation: 'spotlightPulse 2s infinite',
        }}
      />
      <style>{`
        @keyframes spotlightPulse {
          0%, 100% { box-shadow: 0 0 12px rgba(0,188,212,0.4); }
          50% { box-shadow: 0 0 24px rgba(0,188,212,0.7); }
        }
      `}</style>
    </>
  );
}

/** Calcula si el tooltip debe ir arriba o abajo del elemento destacado */
export function getTooltipPosition(rect: Rect, padding: number = 10) {
  const spaceBelow = window.innerHeight - (rect.top + rect.height + padding);
  const spaceAbove = rect.top - padding;
  const preferBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove;
  return preferBelow ? 'below' : 'above';
}
