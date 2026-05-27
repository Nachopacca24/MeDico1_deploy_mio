// src/shared/components/ads/MobilePopupAd.tsx

import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ExternalLink } from 'lucide-react';
import { advertisementService, type ActiveAd } from '@/admin/services/advertisementService';
import { useAuth } from '@/shared/contexts/AuthContext';

interface MobilePopupAdProps {
  initialDelay?: number;
  maxPerSession?: number;
  style?: 'full' | 'bottom-sheet';
}

const AUTO_CLOSE_MS = 8000;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Variable interval: 50% short (6-9s), 50% long (10-13s)
const nextIntervalMs = (): number => {
  if (Math.random() < 0.5) return (6 + Math.random() * 3) * 1000;
  return (10 + Math.random() * 3) * 1000;
};

export function MobilePopupAd({
  initialDelay = 5,
  maxPerSession = 10,
  style = 'bottom-sheet'
}: MobilePopupAdProps) {
  const { user } = useAuth();
  const userSpecialty = user?.specialty ?? '';

  const [popupAds, setPopupAds] = useState<ActiveAd[]>([]);
  const [currentAd, setCurrentAd] = useState<ActiveAd | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [popupCount, setPopupCount] = useState(0);
  const [progress, setProgress] = useState(100);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const popupAdsRef = useRef<ActiveAd[]>([]);
  const adIndexRef = useRef(0);
  const popupCountRef = useRef(0);
  const isVisibleRef = useRef(false);

  useEffect(() => { popupAdsRef.current = popupAds; }, [popupAds]);
  useEffect(() => { popupCountRef.current = popupCount; }, [popupCount]);
  useEffect(() => { isVisibleRef.current = isVisible; }, [isVisible]);

  useEffect(() => {
    advertisementService
      .getActiveAds('popup', userSpecialty || undefined)
      .then(ads => {
        const shuffled = shuffle(ads);
        setPopupAds(shuffled);
      })
      .catch(() => {});
  }, [userSpecialty]);

  const showNextPopup = () => {
    let ads = popupAdsRef.current;
    if (ads.length === 0 || popupCountRef.current >= maxPerSession) return;

    // Re-shuffle when we've cycled through all ads
    if (adIndexRef.current >= ads.length) {
      const reshuffled = shuffle(ads);
      popupAdsRef.current = reshuffled;
      setPopupAds(reshuffled);
      adIndexRef.current = 0;
      ads = reshuffled;
    }

    const ad = ads[adIndexRef.current];
    adIndexRef.current += 1;

    setCurrentAd(ad);
    setIsVisible(true);
    setImgFailed(false);
    setProgress(100);
    setPopupCount(prev => prev + 1);

    advertisementService.trackImpression(ad.id).catch(() => {});
  };

  // First popup
  useEffect(() => {
    if (popupAds.length === 0) return;
    const t = setTimeout(showNextPopup, initialDelay * 1000);
    return () => clearTimeout(t);
  }, [popupAds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Next popup with variable interval after each close
  useEffect(() => {
    if (isVisible || popupCount === 0 || popupAds.length === 0) return;
    if (popupCount >= maxPerSession) return;

    const t = setTimeout(showNextPopup, nextIntervalMs());
    return () => clearTimeout(t);
  }, [isVisible, popupCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setCurrentAd(null), 300);
  };

  // Auto-close countdown
  useEffect(() => {
    if (!isVisible) return;
    setProgress(100);
    const step = 100 / (AUTO_CLOSE_MS / 50);
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.max(0, prev - step));
    }, 50);
    const closeTimer = setTimeout(handleClose, AUTO_CLOSE_MS);
    return () => {
      clearInterval(progressInterval);
      clearTimeout(closeTimer);
    };
  }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdClick = async (ad: ActiveAd) => {
    await advertisementService.trackClick(ad.id).catch(() => {});
    window.open(ad.redirect_url, ad.open_in_new_tab ? '_blank' : '_self');
    handleClose();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (style !== 'bottom-sheet') return;
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (style !== 'bottom-sheet') return;
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (style !== 'bottom-sheet') return;
    if (touchStart - touchEnd < -100) handleClose();
  };

  if (!isVisible || !currentAd) return null;

  if (style === 'bottom-sheet') {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
          onClick={handleClose}
        />

        <div
          className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden" style={{ paddingBottom: 'var(--sab, 0px)' }}>
            <div className="flex justify-center py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            <button
              onClick={handleClose}
              className="absolute top-6 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="absolute top-6 left-4 z-10">
              <span className="px-2.5 py-1 bg-primary text-white text-xs font-bold rounded-full shadow-lg">
                Patrocinado
              </span>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-60px)]">
              <div className="relative">
                {currentAd.image_url && !imgFailed ? (
                  <img
                    src={currentAd.image_url}
                    alt={currentAd.image_alt_text || currentAd.title || 'Advertisement'}
                    className="w-full h-auto object-cover"
                    onError={() => setImgFailed(true)}
                  />
                ) : (
                  <div className="h-40 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center">
                    <ExternalLink className="h-10 w-10 text-primary/40" />
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4">
                {currentAd.title && (
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentAd.title}
                  </h3>
                )}

                <button
                  onClick={() => handleAdClick(currentAd)}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <span>Ver más información</span>
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="pt-2">
                  <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${progress}%`, transition: 'width 50ms linear' }}
                    />
                  </div>
                  <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    Se cerrará automáticamente
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return null;
}
