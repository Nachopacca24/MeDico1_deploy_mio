// src/shared/components/ads/MobileForYouSection.tsx
// "Para ti" specialty-targeted ads for mobile — shown inline in content area
// since the sidebar stays closed on mobile.

import { useState, useEffect } from 'react';
import { ExternalLink, Sparkles, X } from 'lucide-react';
import { advertisementService, type ActiveAd } from '@/admin/services/advertisementService';
import { openAdLink } from '@/shared/utils/openAdLink';

interface MobileForYouSectionProps {
  specialty?: string;
}

export function MobileForYouSection({ specialty }: MobileForYouSectionProps) {
  const [ads, setAds] = useState<ActiveAd[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const REAPPEAR_MS = 2 * 60 * 1000; // 2 minutos

  useEffect(() => {
    if (!specialty) return;
    setDismissed(false);
    advertisementService
      .getActiveAds('sidebar', specialty)
      .then(results => setAds(results.slice(0, 3)))
      .catch(() => {});
  }, [specialty]);

  if (ads.length === 0 || dismissed) return null;

  return (
    <div className="mb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Para ti
          </span>
        </div>
        <button
          onClick={() => { setDismissed(true); setTimeout(() => setDismissed(false), REAPPEAR_MS); }}
          className="p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          aria-label="Ocultar anuncios"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Horizontal scroll row */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
        {ads.map(ad => (
          <MobileAdCard key={ad.id} ad={ad} />
        ))}
      </div>
    </div>
  );
}

function MobileAdCard({ ad }: { ad: ActiveAd }) {
  const [imgFailed, setImgFailed] = useState(false);

  const handleClick = async () => {
    await advertisementService.trackClick(ad.id).catch(() => {});
    openAdLink(ad.redirect_url, ad.open_in_new_tab);
  };

  return (
    <div
      onClick={handleClick}
      className="flex-shrink-0 w-44 snap-start cursor-pointer rounded-xl border border-border bg-card overflow-hidden active:scale-95 transition-transform shadow-sm"
    >
      {ad.image_url && !imgFailed ? (
        <div className="relative h-24 overflow-hidden">
          <img
            src={ad.image_url}
            alt={ad.image_alt_text || ad.title || 'Anuncio'}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
          <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">
            Patrocinado
          </span>
        </div>
      ) : (
        <div className="h-16 bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary/50" />
        </div>
      )}
      <div className="p-2.5">
        {ad.title && (
          <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight mb-1">
            {ad.title}
          </p>
        )}
        <div className="flex items-center gap-1 text-primary">
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="text-[10px] font-medium">Ver más</span>
        </div>
      </div>
    </div>
  );
}
