// src/shared/hooks/useAdSystem.ts

import { useState, useEffect } from 'react';
import { useAuth } from '@/shared/contexts/AuthContext';

interface AdSystemSettings {
  showPopups: boolean;
  showStickyBanner: boolean;
  showSidebarAds: boolean;
  showBetweenContent: boolean;
  showForYouSection: boolean;
  popupStyle: 'full' | 'bottom-sheet';
  popupInitialDelay: number;
  popupInterval: number;
  popupMaxPerSession: number;
  userSpecialty: string;
  isPremium: boolean;
}

/**
 * Hook para configurar el sistema de anuncios según el plan del usuario.
 * - free: ve todos los anuncios (popups, banner, sidebar, entre contenido, "Para ti")
 * - premium: solo ve el sticky banner superior y la sección "Para ti" de especialidad
 */
export function useAdSystem(isMobile: boolean = false): AdSystemSettings {
  const { user } = useAuth();
  const isPremium = user?.plan === 'premium';
  const userSpecialty = user?.specialty || '';

  return {
    showPopups: !isPremium,
    showStickyBanner: true,
    showSidebarAds: !isPremium && !isMobile,
    showBetweenContent: !isPremium,
    showForYouSection: true,
    popupStyle: isMobile ? 'bottom-sheet' : 'full',
    popupInitialDelay: isMobile ? 8 : 10,
    popupInterval: isMobile ? 180 : 120,
    popupMaxPerSession: isMobile ? 2 : 3,
    userSpecialty,
    isPremium,
  };
}

/**
 * Hook para detectar si estamos en móvil
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
