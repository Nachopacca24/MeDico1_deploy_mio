// src/shared/hooks/useNovedadesNew.ts
// Tracks whether the user has unseen novedades.
// Shows badge when user hasn't visited /novedades in STALE_MS or never.

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'medico_novedades_seen_at';
const STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const NOVEDADES_EVENT = 'medico:novedadesViewed';

function isStale(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return true;
  return Date.now() - Number(raw) > STALE_MS;
}

export function useNovedadesNew() {
  const [hasNew, setHasNew] = useState<boolean>(isStale);

  useEffect(() => {
    const handler = () => setHasNew(false);
    window.addEventListener(NOVEDADES_EVENT, handler);
    return () => window.removeEventListener(NOVEDADES_EVENT, handler);
  }, []);

  const markAsSeen = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setHasNew(false);
    window.dispatchEvent(new CustomEvent(NOVEDADES_EVENT));
  };

  return { hasNew, markAsSeen };
}
