// src/shared/components/ads/StickyBannerAd.tsx
// Máximo 2 cuadritos simultáneos (1 en móvil).
// Rotan cada ROTATE_MS. Al cerrar con X vuelven luego de DISMISS_HIDE_MS.

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { advertisementService, type ActiveAd } from '@/admin/services/advertisementService';
import { openAdLink } from '@/shared/utils/openAdLink';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useIsMobile } from '@/shared/hooks/useAdSystem';

const ROTATE_MS = 13_000;       // Rotación cada 13s
const DISMISS_HIDE_MS = 13_000; // Al cerrar con X, vuelve en 13s

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface AdCardProps {
  ad: ActiveAd;
  onDismiss: () => void;
}

function AdCard({ ad, onDismiss }: AdCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const handleClick = async () => {
    await advertisementService.trackClick(ad.id).catch(() => {});
    openAdLink(ad.redirect_url, ad.open_in_new_tab);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden w-64 max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-4 duration-300 flex-shrink-0">
      {ad.image_url && !imgFailed && (
        <div
          className="relative w-full h-32 cursor-pointer overflow-hidden group"
          onClick={handleClick}
        >
          <img
            src={ad.image_url}
            alt={ad.image_alt_text || ad.title || 'Publicidad'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgFailed(true)}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ExternalLink className="text-white opacity-0 group-hover:opacity-90 h-6 w-6 drop-shadow-lg transition-opacity" />
          </div>
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-bold rounded-full backdrop-blur-sm">
            Patrocinado
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDismiss(); }}
            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors backdrop-blur-sm"
            aria-label="Cerrar anuncio"
          >
            <X className="h-3 w-3 text-white" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {(imgFailed || !ad.image_url) && (
          <span className="flex-shrink-0 px-2 py-0.5 bg-slate-700 text-white text-[10px] font-bold rounded-full">
            Patrocinado
          </span>
        )}
        <div className="flex-1 min-w-0 cursor-pointer group" onClick={handleClick}>
          {ad.title && (
            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
              {ad.title}
            </p>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            <ExternalLink className="h-3 w-3 text-primary flex-shrink-0" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Ver más información</span>
          </div>
        </div>
        {(imgFailed || !ad.image_url) && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Cerrar anuncio"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}

interface StickyBannerAdProps {
  position?: 'top' | 'bottom';
  initialDelay?: number;
}

export function StickyBannerAd({ position = 'bottom', initialDelay = 1 }: StickyBannerAdProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const slotCount = isMobile ? 1 : 2;

  const [pool, setPool] = useState<ActiveAd[]>([]);
  const [visible, setVisible] = useState<ActiveAd[]>([]);
  const [ready, setReady] = useState(false);

  // useRef para que pickNext siempre vea el pool más actualizado (evita stale closure)
  const poolRef = useRef<ActiveAd[]>([]);
  const slotCountRef = useRef(slotCount);
  const ptrRef = useRef(0);
  // Mapa de id → timestamp en que el anuncio vuelve a estar disponible
  const dismissedUntilRef = useRef<Map<number, number>>(new Map());
  const trackedRef = useRef<Set<number>>(new Set());

  useEffect(() => { poolRef.current = pool; }, [pool]);
  useEffect(() => { slotCountRef.current = slotCount; }, [slotCount]);

  // Cargar pool desde API
  useEffect(() => {
    const specialty = user?.specialty || undefined;
    Promise.all([
      advertisementService.getActiveAds('home_banner', specialty).catch(() => [] as ActiveAd[]),
      advertisementService.getActiveAds('footer', specialty).catch(() => [] as ActiveAd[]),
    ]).then(([banners, footers]) => {
      // Deduplicar por id — si el mismo anuncio está en ambos placements, solo aparece una vez
      const seen = new Set<number>();
      const unique = [...banners, ...footers].filter(ad => {
        if (seen.has(ad.id)) return false;
        seen.add(ad.id);
        return true;
      });
      setPool(shuffle(unique));
    });
  }, [user?.specialty]);

  // Selecciona los próximos n anuncios disponibles del pool
  const pickNext = useCallback((n: number): ActiveAd[] => {
    const p = poolRef.current;
    if (p.length === 0) return [];
    const now = Date.now();
    const result: ActiveAd[] = [];
    const usedIds = new Set<number>(); // evita duplicados en el mismo batch
    let attempts = 0;
    while (result.length < n && attempts < p.length) {
      const ad = p[ptrRef.current % p.length];
      ptrRef.current = (ptrRef.current + 1) % p.length;
      attempts++;
      const hideUntil = dismissedUntilRef.current.get(ad.id) ?? 0;
      if (now >= hideUntil && !usedIds.has(ad.id)) {
        result.push(ad);
        usedIds.add(ad.id);
      }
    }
    return result.slice(0, n); // cap defensivo
  }, []);

  // Mostrar batch inicial después del delay
  useEffect(() => {
    if (pool.length === 0) return;
    ptrRef.current = 0;
    dismissedUntilRef.current.clear();
    const t = setTimeout(() => {
      setVisible(pickNext(slotCountRef.current));
      setReady(true);
    }, initialDelay * 1000);
    return () => clearTimeout(t);
  }, [pool, initialDelay, pickNext]);

  // Timer de rotación — siempre activo cuando hay anuncios
  useEffect(() => {
    if (!ready || pool.length === 0) return;
    const t = setInterval(() => {
      setVisible(pickNext(slotCountRef.current));
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [ready, pool.length, pickNext]);

  // Registrar impresiones de los anuncios visibles
  useEffect(() => {
    if (!ready) return;
    visible.forEach(ad => {
      if (!trackedRef.current.has(ad.id)) {
        trackedRef.current.add(ad.id);
        advertisementService.trackImpression(ad.id).catch(() => {});
      }
    });
  }, [ready, visible]);

  const handleDismiss = (adId: number) => {
    // Oculta el anuncio durante DISMISS_HIDE_MS, luego vuelve a ser elegible
    dismissedUntilRef.current.set(adId, Date.now() + DISMISS_HIDE_MS);
    setVisible(prev => prev.filter(a => a.id !== adId));
  };

  if (!ready || visible.length === 0) return null;

  // ── Mobile: full-width horizontal banner at the very bottom ──────────────
  if (isMobile) {
    const ad = visible[0];
    const [mobileImgFailed, setMobileImgFailed] = useState(false);

    const handleClick = async () => {
      await advertisementService.trackClick(ad.id).catch(() => {});
      openAdLink(ad.redirect_url, ad.open_in_new_tab);
    };

    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-[90] animate-in slide-in-from-bottom-2 duration-300"
        style={{ paddingBottom: 'var(--sab, 0px)' }}
      >
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-2xl flex items-center gap-3 px-3 py-2.5">
          {/* Patrocinado tag */}
          <span className="shrink-0 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest border border-muted-foreground/20 rounded px-1.5 py-0.5">
            Ad
          </span>

          {/* Image */}
          {ad.image_url && !mobileImgFailed && (
            <img
              src={ad.image_url}
              alt={ad.image_alt_text || ad.title || 'Publicidad'}
              className="h-10 w-14 object-cover rounded-lg shrink-0"
              onError={() => setMobileImgFailed(true)}
            />
          )}

          {/* Text */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
            {ad.title && (
              <p className="text-sm font-semibold text-foreground truncate">{ad.title}</p>
            )}
            <p className="text-xs text-muted-foreground truncate">Ver más información</p>
          </div>

          {/* CTA */}
          <button
            onClick={handleClick}
            className="shrink-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
          >
            Ver
          </button>

          {/* Dismiss */}
          <button
            onClick={() => handleDismiss(ad.id)}
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar anuncio"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Desktop: floating cards in corner ────────────────────────────────────
  const positionStyle = position === 'bottom'
    ? { bottom: 'calc(1rem + var(--sab, 0px))' }
    : { top: '5rem' };

  return (
    <div
      className="fixed right-4 z-[90] flex flex-col gap-3 items-end"
      style={positionStyle}
    >
      {visible.slice(0, slotCount).map(ad => (
        <AdCard key={ad.id} ad={ad} onDismiss={() => handleDismiss(ad.id)} />
      ))}
    </div>
  );
}
