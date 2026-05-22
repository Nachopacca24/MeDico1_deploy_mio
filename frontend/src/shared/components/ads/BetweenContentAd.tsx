// src/shared/components/ads/BetweenContentAd.tsx
// Compact horizontal ad displayed between page content sections.
// Rotates through between_content placement ads with a shuffle per mount.

import { useState, useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { advertisementService, type ActiveAd } from '@/admin/services/advertisementService';
import { useAdSystem, useIsMobile } from '@/shared/hooks/useAdSystem';
import { useAuth } from '@/shared/contexts/AuthContext';

const ROTATE_MS = 12_000;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface BetweenContentAdProps {
  className?: string;
}

export function BetweenContentAd({ className = '' }: BetweenContentAdProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { showBetweenContent } = useAdSystem(isMobile);
  const [ads, setAds] = useState<ActiveAd[]>([]);
  const [index, setIndex] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const trackedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!showBetweenContent) return;
    advertisementService
      .getActiveAds('between_content', user?.specialty || undefined)
      .then(fetched => {
        if (fetched.length > 0) setAds(shuffle(fetched));
      });
  }, [showBetweenContent, user?.specialty]);

  // Auto-rotate
  useEffect(() => {
    if (ads.length <= 1) return;
    const t = setInterval(() => {
      setIndex(prev => {
        const next = (prev + 1) % ads.length;
        return next;
      });
      setImgFailed(false);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [ads.length]);

  // Track impression once per ad id
  useEffect(() => {
    const ad = ads[index];
    if (!ad) return;
    if (trackedRef.current.has(ad.id)) return;
    trackedRef.current.add(ad.id);
    advertisementService.trackImpression(ad.id).catch(() => {});
  }, [ads, index]);

  if (!showBetweenContent || ads.length === 0) return null;

  const ad = ads[index];

  const handleClick = async () => {
    await advertisementService.trackClick(ad.id).catch(() => {});
    window.open(ad.redirect_url, ad.open_in_new_tab ? '_blank' : '_self');
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        className="relative flex items-center gap-4 px-4 py-3 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-md transition-all duration-300 cursor-pointer group overflow-hidden"
        onClick={handleClick}
        role="link"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && handleClick()}
        aria-label={ad.title ? `Publicidad: ${ad.title}` : 'Publicidad'}
      >
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/3 to-transparent pointer-events-none" />

        {/* Image */}
        {ad.image_url && !imgFailed && (
          <img
            src={ad.image_url}
            alt={ad.image_alt_text || ad.title || 'Publicidad'}
            className="h-14 w-20 object-cover rounded-lg flex-shrink-0 shadow-sm"
            onError={() => setImgFailed(true)}
          />
        )}

        {/* Text */}
        <div className="flex-1 min-w-0 relative z-10">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              Patrocinado
            </span>
          </div>
          {ad.title && (
            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {ad.title}
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="flex-shrink-0 flex items-center gap-1.5 text-primary text-xs font-semibold relative z-10">
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ver más</span>
        </div>

        {/* Dots indicator (only when multiple ads) */}
        {ads.length > 1 && (
          <div className="absolute bottom-1.5 right-3 flex gap-1">
            {ads.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === index
                    ? 'w-3 bg-primary/60'
                    : 'w-1 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
