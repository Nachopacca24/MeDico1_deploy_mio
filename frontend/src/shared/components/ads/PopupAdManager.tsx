// src/shared/components/ads/PopupAdManager.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { advertisementService, type ActiveAd } from '@/admin/services/advertisementService';
import { useAuth } from '@/shared/contexts/AuthContext';
import { Button } from '@/shared/components/ui/button';

interface PopupAdManagerProps {
  initialDelay?: number;
  interval?: number;
  maxPerSession?: number;
}

/** Segundos que el popup permanece visible antes de cerrarse solo */
const AUTO_CLOSE_SECONDS = 8;

export function PopupAdManager({
  initialDelay = 10,
  interval = 120,
  maxPerSession = 3,
}: PopupAdManagerProps) {
  const { user } = useAuth();
  const userSpecialty = user?.specialty ?? '';
  const [popupAds, setPopupAds] = useState<ActiveAd[]>([]);
  const [currentAd, setCurrentAd] = useState<ActiveAd | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [popupCount, setPopupCount] = useState(0);
  const [progress, setProgress] = useState(100);

  // Refs to avoid stale closures inside setTimeout/setInterval
  const popupAdsRef = useRef<ActiveAd[]>([]);
  const adIndexRef = useRef(0);
  const popupCountRef = useRef(0);
  const isVisibleRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { popupAdsRef.current = popupAds; }, [popupAds]);
  useEffect(() => { popupCountRef.current = popupCount; }, [popupCount]);
  useEffect(() => { isVisibleRef.current = isVisible; }, [isVisible]);

  useEffect(() => {
    advertisementService
      .getActiveAds('popup', userSpecialty || undefined)
      .then(setPopupAds)
      .catch(() => {});
  }, [userSpecialty]);

  const showNextPopup = useCallback(() => {
    const ads = popupAdsRef.current;
    if (ads.length === 0 || popupCountRef.current >= maxPerSession) return;

    const ad = ads[adIndexRef.current % ads.length];
    adIndexRef.current += 1;

    setCurrentAd(ad);
    setIsVisible(true);
    setImgFailed(false);
    setProgress(100);
    setPopupCount(prev => prev + 1);

    advertisementService.trackImpression(ad.id).catch(() => {});
  }, [maxPerSession]);

  // Auto-close countdown when popup is visible
  useEffect(() => {
    if (!isVisible) return;

    // Animate progress bar from 100 → 0 over AUTO_CLOSE_SECONDS
    const step = 100 / (AUTO_CLOSE_SECONDS * 20); // update every 50ms
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) return 0;
        return prev - step;
      });
    }, 50);

    // Auto-close after AUTO_CLOSE_SECONDS
    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      setCurrentAd(null);
    }, AUTO_CLOSE_SECONDS * 1000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(closeTimer);
    };
  }, [isVisible]);

  // Schedule popups once ads are loaded
  useEffect(() => {
    if (popupAds.length === 0) return;

    // First appearance after initialDelay
    const firstTimer = setTimeout(showNextPopup, initialDelay * 1000);
    return () => clearTimeout(firstTimer);
  }, [popupAds.length, initialDelay, showNextPopup]);

  // Re-schedule after each dismiss
  useEffect(() => {
    if (isVisible || popupCount === 0 || popupAds.length === 0) return;
    if (popupCount >= maxPerSession) return;

    const nextTimer = setTimeout(showNextPopup, interval * 1000);
    return () => clearTimeout(nextTimer);
  }, [isVisible, popupCount, popupAds.length, interval, maxPerSession, showNextPopup]);

  const handleClose = () => {
    setIsVisible(false);
    setCurrentAd(null);
  };

  const handleAdClick = async (ad: ActiveAd) => {
    await advertisementService.trackClick(ad.id).catch(() => {});
    window.open(ad.redirect_url, ad.open_in_new_tab ? '_blank' : '_self');
    handleClose();
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
          onClick={e => e.stopPropagation()}
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
            <span className="px-3 py-1 bg-gradient-to-r from-primary to-primary/80 text-white text-xs font-bold rounded-full shadow-lg">
              Patrocinado
            </span>
          </div>

          <div className="cursor-pointer group" onClick={() => handleAdClick(currentAd)}>
            <div className="relative overflow-hidden">
              {currentAd.image_url && !imgFailed ? (
                <>
                  <img
                    src={currentAd.image_url}
                    alt={currentAd.image_alt_text || currentAd.title || 'Advertisement'}
                    className="w-full h-auto max-h-[60vh] object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={() => setImgFailed(true)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </>
              ) : (
                <div className="h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center">
                  <ExternalLink className="h-12 w-12 text-primary/40" />
                </div>
              )}
            </div>

            {currentAd.title && (
              <div className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                  {currentAd.title}
                </h3>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600 dark:text-gray-300">Click para más información</p>
                  <ExternalLink className="h-6 w-6 text-primary group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            )}
          </div>

          {/* Barra de cuenta regresiva — va de 100% a 0% */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-primary"
              style={{ width: `${progress}%`, transition: 'width 50ms linear' }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
