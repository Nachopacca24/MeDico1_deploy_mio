// src/shared/components/ads/ForYouAds.tsx
// Specialty-targeted "Para ti" section — shown in sidebar for all users

import { useState, useEffect } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { advertisementService, type ActiveAd } from '@/admin/services/advertisementService';
import { openAdLink } from '@/shared/utils/openAdLink';

interface ForYouAdsProps {
  specialty: string;
}

export function ForYouAds({ specialty }: ForYouAdsProps) {
  const [ads, setAds] = useState<ActiveAd[]>([]);

  useEffect(() => {
    if (!specialty) return;

    const load = async () => {
      try {
        const results = await advertisementService.getActiveAds('sidebar', specialty);
        setAds(results.slice(0, 2));
      } catch {
        // non-critical, fail silently
      }
    };

    load();
  }, [specialty]);

  if (ads.length === 0) return null;

  const handleClick = async (ad: ActiveAd) => {
    try {
      await advertisementService.trackClick(ad.id);
    } catch {
      // non-critical, still open the ad even if tracking failed
    }
    openAdLink(ad.redirect_url, ad.open_in_new_tab);
  };

  return (
    <div className="px-2 py-3 space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wide">
          Para ti
        </span>
      </div>

      {ads.map((ad) => (
        <AdCard key={ad.id} ad={ad} onClick={() => handleClick(ad)} />
      ))}
    </div>
  );
}

function AdCard({ ad, onClick }: { ad: ActiveAd; onClick: () => void }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-sidebar-border bg-sidebar-accent/30 hover:bg-sidebar-accent transition-colors overflow-hidden"
    >
      {ad.image_url && !imgFailed ? (
        <div className="relative overflow-hidden h-20">
          <img
            src={ad.image_url}
            alt={ad.image_alt_text || ad.title || 'Anuncio'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgFailed(true)}
          />
        </div>
      ) : (
        <div className="h-10 bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary/50" />
        </div>
      )}

      <div className="p-2">
        {ad.title && (
          <p className="text-xs font-medium text-sidebar-foreground truncate leading-tight">
            {ad.title}
          </p>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          <ExternalLink className="h-2.5 w-2.5 text-primary flex-shrink-0" />
          <span className="text-[10px] text-muted-foreground">Ver más</span>
        </div>
      </div>
    </div>
  );
}
