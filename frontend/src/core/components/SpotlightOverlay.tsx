// src/core/components/SpotlightOverlay.tsx
import { useEffect } from 'react';

/** Resalta el elemento con data-tutorial haciendo scroll y agregando clase CSS */
export function useHighlightTarget(target: string | undefined, step: number) {
  useEffect(() => {
    if (!target) return;

    let el: Element | null = null;

    const t = setTimeout(() => {
      el = document.querySelector(`[data-tutorial="${target}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('tutorial-highlight');
    }, 300);

    return () => {
      clearTimeout(t);
      const found = document.querySelector(`[data-tutorial="${target}"]`);
      found?.classList.remove('tutorial-highlight');
    };
  }, [target, step]);
}
