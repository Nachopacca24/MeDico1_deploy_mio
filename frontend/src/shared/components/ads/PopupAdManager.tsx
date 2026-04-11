// src/shared/components/ads/PopupAdManager.tsx

import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { advertisementService, type ActiveAd } from '@/admin/services/advertisementService';
import { Button } from '@/shared/components/ui/button';

interface PopupAdManagerProps {
  initialDelay?: number;
  interval?: number;
  maxPerSession?: number;
}

export function PopupAdManager({ 
  initialDelay = 5,
  interval = 120,
  maxPerSession = 3 
}: PopupAdManagerProps) {
  const [popupAds, setPopupAds] = useState<ActiveAd[]>([]);
  const [currentAd, setCurrentAd] = useState<ActiveAd | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [popupCount, setPopupCount] = useState(0);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  useEffect(() => {
    const loadPopupAds = async () => {
      try {
        const ads = await advertisementService.getActiveAds('popup');
        setPopupAds(ads);
      } catch (error) {
        console.error('Error loading popup ads:', error);
      }
    };

    loadPopupAds();
  }, []);

  useEffect(() => {
    if (popupAds.length === 0 || popupCount >= maxPerSession) return;

    const initialTimer = setTimeout(() => {
      showNextPopup();
    }, initialDelay * 1000);

    return () => clearTimeout(initialTimer);
  }, [popupAds, initialDelay]);

  useEffect(() => {
    if (popupAds.length === 0 || popupCount >= maxPerSession || popupCount === 0) return;

    const intervalTimer = setInterval(() => {
      if (popupCount < maxPerSession && !isVisible) {
        showNextPopup();
      }
    }, interval * 1000);

    return () => clearInterval(intervalTimer);
  }, [popupAds, interval, popupCount, isVisible]);

  const showNextPopup = () => {
    if (popupAds.length === 0 || popupCount >= maxPerSession) return;

    const ad = popupAds[currentAdIndex % popupAds.length];
    setCurrentAd(ad);
    setIsVisible(true);
    setPopupCount(prev => prev + 1);
    setCurrentAdIndex(prev => prev + 1);

    advertisementService.trackImpression(ad.id);
  };

  const handleClose = () => {
    setIsVisible(false);
    setCurrentAd(null);
  };

  const handleAdClick = async (ad: ActiveAd) => {
    try {
      await advertisementService.trackClick(ad.id);
      window.open(ad.redirect_url, ad.open_in_new_tab ? '_blank' : '_self');
      handleClose();
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  if (!isVisible || !currentAd) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
        onClick={handleClose}
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full pointer-events-auto animate-in zoom-in-95 duration-300 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm"
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="absolute top-3 left-3 z-10">
            <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-xs font-bold rounded-full shadow-lg">
              GOLD SPONSOR
            </span>
          </div>

          <div 
            className="cursor-pointer group"
            onClick={() => handleAdClick(currentAd)}
          >
            <div className="relative overflow-hidden">
              <img
                src={currentAd.image_url}
                alt={currentAd.image_alt_text || currentAd.title || 'Advertisement'}
                className="w-full h-auto max-h-[60vh] object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {currentAd.title && (
              <div className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                  {currentAd.title}
                </h3>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600 dark:text-gray-300">
                    Click para más información
                  </p>
                  <ExternalLink className="h-6 w-6 text-primary group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
            <div 
              className="h-full bg-gradient-to-r from-yellow-500 to-amber-600"
              style={{ width: `${(popupCount / maxPerSession) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
}