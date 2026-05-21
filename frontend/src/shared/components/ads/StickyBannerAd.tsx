// src/shared/components/ads/StickyBannerAd.tsx

import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { advertisementService, type ActiveAd } from '@/admin/services/advertisementService';
import { useAuth } from '@/shared/contexts/AuthContext';

interface StickyBannerAdProps {
  position?: 'top' | 'bottom';
  /** Segundos antes de la primera aparición */
  initialDelay?: number;
  /** Segundos entre reapariciones tras cerrar */
  interval?: number;
  /** Máximo de apariciones por sesión */
  maxPerSession?: number;
}

function BannerImage({ ad }: { ad: ActiveAd }) {
  const [failed, setFailed] = useState(false);
  if (!ad.image_url || failed) return null;
  return (
    <img
      src={ad.image_url}
      alt={ad.image_alt_text || ad.title || 'Publicidad'}
      className="h-12 w-16 sm:h-14 sm:w-20 object-cover rounded-lg shadow-sm flex-shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

export function StickyBannerAd({
  position = 'bottom',
  initialDelay = 20,
  interval = 300,
  maxPerSession = 3,
}: StickyBannerAdProps) {
  const { user } = useAuth();
  const userSpecialty = user?.specialty ?? '';

  const [bannerAds, setBannerAds] = useState<ActiveAd[]>([]);
  const [adIndex, setAdIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showCount, setShowCount] = useState(0);

  // Load both home_banner (Gold) and footer ads, rotate through all of them
  useEffect(() => {
    const specialty = userSpecialty || undefined;
    Promise.all([
      advertisementService.getActiveAds('home_banner', specialty).catch(() => []),
      advertisementService.getActiveAds('footer', specialty).catch(() => []),
    ]).then(([banners, footers]) => {
      setBannerAds([...banners, ...footers]);
    });
  }, [userSpecialty]);

  // Schedule each appearance: initial delay, then interval after each dismiss
  useEffect(() => {
    if (bannerAds.length === 0 || isVisible || showCount >= maxPerSession) return;

    const delay = showCount === 0 ? initialDelay : interval;
    const timer = setTimeout(() => {
      setIsVisible(true);
      setShowCount(c => c + 1);
      setAdIndex(i => (i + 1) % bannerAds.length);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [bannerAds.length, isVisible, showCount, maxPerSession, initialDelay, interval]);

  // Track impression whenever a new ad becomes visible
  useEffect(() => {
    if (isVisible && bannerAds[adIndex]) {
      advertisementService.trackImpression(bannerAds[adIndex].id);
    }
  }, [isVisible, adIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = () => setIsVisible(false);

  const handleClick = async (ad: ActiveAd) => {
    try {
      await advertisementService.trackClick(ad.id);
    } catch { /* silent */ }
    window.open(ad.redirect_url, ad.open_in_new_tab ? '_blank' : '_self');
  };

  if (!isVisible || bannerAds.length === 0) return null;

  const currentAd = bannerAds[adIndex % bannerAds.length];
  const slideClass = position === 'top'
    ? 'top-20 animate-in slide-in-from-top-4'
    : 'bottom-4 animate-in slide-in-from-bottom-4';

  return (
    <div className={`fixed right-4 md:right-6 left-4 md:left-auto md:max-w-sm ${slideClass} z-[90] duration-300`}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <span className="flex-shrink-0 px-2 py-0.5 bg-slate-700 text-white text-[10px] font-bold rounded-full">
            Patrocinado
          </span>

          <BannerImage ad={currentAd} />

          <div
            className="flex-1 min-w-0 cursor-pointer group"
            onClick={() => handleClick(currentAd)}
          >
            {currentAd.title && (
              <p className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                {currentAd.title}
              </p>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <ExternalLink className="h-3 w-3 text-primary flex-shrink-0" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Ver más información</span>
            </div>
          </div>

          {bannerAds.length > 1 && (
            <div className="hidden md:flex gap-1 flex-shrink-0">
              {bannerAds.slice(0, 5).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === adIndex % bannerAds.length ? 'w-4 bg-primary' : 'w-1 bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Cerrar anuncio"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
