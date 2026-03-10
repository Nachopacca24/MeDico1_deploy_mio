// src/shared/hooks/useAdSystem.ts

import { useState, useEffect } from 'react';

interface AdSystemSettings {
  showPopups: boolean;
  showStickyBanner: boolean;
  showSidebarAds: boolean;
  showBetweenContent: boolean;
  popupStyle: 'full' | 'bottom-sheet';
  popupInitialDelay: number;
  popupInterval: number;
  popupMaxPerSession: number;
}

/**
 * Hook para configurar el sistema de anuncios
 * Los anuncios se muestran según el plan del CLIENTE que pagó el anuncio (definido en backend)
 * No depende del plan del usuario que navega
 */
export function useAdSystem(isMobile: boolean = false): AdSystemSettings {
  const [settings] = useState<AdSystemSettings>({
    // TODOS los tipos de anuncios están habilitados
    // El backend decide qué anuncios mostrar según el plan del cliente
    showPopups: true,
    showStickyBanner: true,
    showSidebarAds: !isMobile, // Desktop only
    showBetweenContent: true,
    
    // Configuración adaptativa según dispositivo
    popupStyle: isMobile ? 'bottom-sheet' : 'full',
    popupInitialDelay: isMobile ? 8 : 10,
    popupInterval: isMobile ? 180 : 120,
    popupMaxPerSession: isMobile ? 2 : 3,
  });

  return settings;
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