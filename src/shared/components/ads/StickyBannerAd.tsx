// src/shared/components/ads/StickyBannerAd.tsx

import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { advertisementService, type ActiveAd } from '@/admin/services/advertisementService';

interface StickyBannerAdProps {
  /** Posición del banner: 'top' o 'bottom' */
  position?: 'top' | 'bottom';
  /** Permitir que el usuario cierre el banner */
  dismissible?: boolean;
}

export function StickyBannerAd({ 
  position = 'bottom',
  dismissible = true 
}: StickyBannerAdProps) {
  const [bannerAds, setBannerAds] = useState<ActiveAd[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const loadBannerAds = async () => {
      try {
        const ads = await advertisementService.getActiveAds('home_banner');
        setBannerAds(ads);
      } catch (error) {
        console.error('Error loading banner ads:', error);
      }
    };

    loadBannerAds();
  }, []);

  // Rotar banners cada 15 segundos
  useEffect(() => {
    if (bannerAds.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % bannerAds.length);
    }, 15000);

    return () => clearInterval(interval);
  }, [bannerAds.length]);

  // Track impression cuando cambia el anuncio
  useEffect(() => {
    if (bannerAds.length > 0 && bannerAds[currentAdIndex]) {
      advertisementService.trackImpression(bannerAds[currentAdIndex].id);
    }
  }, [currentAdIndex, bannerAds]);

  const handleAdClick = async (ad: ActiveAd) => {
    try {
      await advertisementService.trackClick(ad.id);
      window.open(ad.redirect_url, ad.open_in_new_tab ? '_blank' : '_self');
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => setIsDismissed(true), 300);
  };

  if (isDismissed || bannerAds.length === 0) return null;

  const currentAd = bannerAds[currentAdIndex];
  const positionClasses = position === 'top' 
    ? 'top-0 border-b' 
    : 'bottom-0 border-t';

  return (
    <div
      className={`fixed left-0 right-0 ${positionClasses} bg-gradient-to-r from-slate-50/95 via-gray-50/95 to-slate-50/95 dark:from-slate-900/95 dark:via-gray-900/95 dark:to-slate-900/95 backdrop-blur-md border-slate-200 dark:border-slate-700 shadow-lg z-[100] transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : position === 'top' ? '-translate-y-full opacity-0' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 py-2.5 relative">
          {/* Sponsored badge */}
          <div className="flex-shrink-0">
            <span className="px-2 py-1 bg-gradient-to-r from-slate-600 to-slate-700 text-white text-xs font-bold rounded-full shadow">
              SILVER
            </span>
          </div>

          {/* Ad content */}
          <div 
            className="flex-1 flex items-center gap-4 cursor-pointer group"
            onClick={() => handleAdClick(currentAd)}
          >
            {/* Image thumbnail */}
            <div className="hidden sm:block flex-shrink-0">
              <img
                src={currentAd.image_url}
                alt={currentAd.image_alt_text || currentAd.title || 'Advertisement'}
                className="h-16 w-24 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
              />
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              {currentAd.title && (
                <h4 className="font-semibold text-sm md:text-base text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                  {currentAd.title}
                </h4>
              )}
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Click para más información
              </p>
            </div>

            {/* CTA Icon */}
            <div className="flex-shrink-0">
              <ExternalLink className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Rotation indicator */}
          {bannerAds.length > 1 && (
            <div className="hidden md:flex items-center gap-1 flex-shrink-0">
              {bannerAds.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentAdIndex 
                      ? 'w-6 bg-primary' 
                      : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Close button */}
          {dismissible && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="flex-shrink-0 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Cerrar anuncio"
            >
              <X className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}