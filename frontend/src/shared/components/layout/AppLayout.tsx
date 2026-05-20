// src/shared/components/layout/AppLayout.tsx

import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/layout/Sidebar";
import { Separator } from "@/shared/components/ui/separator";
import { PopupAdManager } from "@/shared/components/ads/PopupAdManager";
import { MobilePopupAd } from "@/shared/components/ads/MobilePopupAd";
import { StickyBannerAd } from "@/shared/components/ads/StickyBannerAd";
import { useAdSystem, useIsMobile } from "@/shared/hooks/useAdSystem";

// Rutas donde los popups no deben aparecer (formularios, flujos críticos)
const NO_POPUP_ROUTES = ['/cases/new', '/cases/edit'];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const adSettings = useAdSystem(isMobile);
  const { pathname } = useLocation();
  const suppressPopups = NO_POPUP_ROUTES.some(route => pathname.startsWith(route));

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h2 className="text-lg font-semibold">MeDico</h2>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6 pb-20 md:pb-16">
          {children}
        </main>
      </SidebarInset>

      {/* Sistema de ads global — suprimido en formularios */}
      {adSettings.showPopups && !suppressPopups && (
        isMobile
          ? <MobilePopupAd
              initialDelay={adSettings.popupInitialDelay}
              interval={adSettings.popupInterval}
              maxPerSession={adSettings.popupMaxPerSession}
              style={adSettings.popupStyle}
            />
          : <PopupAdManager
              initialDelay={adSettings.popupInitialDelay}
              interval={adSettings.popupInterval}
              maxPerSession={adSettings.popupMaxPerSession}
            />
      )}

      {adSettings.showStickyBanner && (
        <StickyBannerAd position="bottom" />
      )}
    </SidebarProvider>
  );
}