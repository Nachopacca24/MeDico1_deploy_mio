// Renders once for the entire authenticated session — survives page navigation.
// Ad timers and state are never reset by routing.

import { Outlet, useLocation } from "react-router-dom";
import { PopupAdManager } from "./PopupAdManager";
import { MobilePopupAd } from "./MobilePopupAd";
import { StickyBannerAd } from "./StickyBannerAd";
import { useAdSystem, useIsMobile } from "@/shared/hooks/useAdSystem";

const NO_POPUP_ROUTES = ['/cases/new', '/cases/edit'];

export function PersistentAdSystem() {
  const isMobile = useIsMobile();
  const adSettings = useAdSystem(isMobile);
  const { pathname } = useLocation();
  const suppressPopups = NO_POPUP_ROUTES.some(r => pathname.startsWith(r));

  return (
    <>
      <Outlet />

      {adSettings.showPopups && !suppressPopups && (
        isMobile
          ? <MobilePopupAd
              initialDelay={adSettings.popupInitialDelay}
              maxPerSession={adSettings.popupMaxPerSession}
              style={adSettings.popupStyle}
            />
          : <PopupAdManager
              initialDelay={adSettings.popupInitialDelay}
              maxPerSession={adSettings.popupMaxPerSession}
            />
      )}

      {adSettings.showStickyBanner && (
        <StickyBannerAd position="bottom" />
      )}
    </>
  );
}
