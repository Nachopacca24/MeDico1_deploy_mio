// src/shared/components/layout/AppLayout.tsx

import { ReactNode, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/layout/Sidebar";
import { MobileBottomNav } from "@/shared/components/layout/MobileBottomNav";
import { Separator } from "@/shared/components/ui/separator";
import { useAuth } from "@/shared/contexts/AuthContext";
import { Shield, Loader2 } from "lucide-react";
import { advertisementService } from "@/admin/services/advertisementService";
import { EmailVerificationBanner } from "@/shared/components/EmailVerificationBanner";
import { MobileForYouSection } from "@/shared/components/ads/MobileForYouSection";
import { useIsMobile } from "@/shared/hooks/useAdSystem";
import { WelcomeModal } from "@/core/components/WelcomeModal";
import { TutorialCard } from "@/core/components/TutorialCard";
import { usePullToRefresh } from "@/shared/hooks/usePullToRefresh";

export const APP_REFRESH_EVENT = 'app-pull-to-refresh';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const isAdmin = user?.is_admin;
  const isMobile = useIsMobile();

  const handleGlobalRefresh = useCallback(async () => {
    window.dispatchEvent(new CustomEvent(APP_REFRESH_EVENT));
    await new Promise(r => setTimeout(r, 800));
  }, []);
  const { pullDistance, refreshing } = usePullToRefresh(handleGlobalRefresh);

  // Pre-warm ad cache using the user's specialty so the exact cache keys match
  useEffect(() => {
    const specialty = user?.specialty || undefined;
    advertisementService.getActiveAds('home_banner', specialty).catch(() => {});
    advertisementService.getActiveAds('popup', specialty).catch(() => {});
    advertisementService.getActiveAds('sidebar', specialty).catch(() => {});
    advertisementService.getActiveAds('footer', specialty).catch(() => {});
  }, [user?.specialty]);

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        {/* Header — sticky so the menu trigger is always visible when scrolling */}
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 flex-1">
            {/* SidebarTrigger visible only on desktop — mobile uses MobileBottomNav */}
            <SidebarTrigger className="-ml-1 hidden md:flex" />
            <Separator orientation="vertical" className="mr-2 h-4 hidden md:flex" />
            <h2 className="text-lg font-semibold">MeDico App</h2>
          </div>
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
        </header>

        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || refreshing) && (
          <div
            className="flex items-center justify-center overflow-hidden transition-all duration-150 bg-background"
            style={{ height: refreshing ? 48 : pullDistance * 0.75 }}
          >
            <Loader2
              className={`w-5 h-5 text-primary ${refreshing ? 'animate-spin' : ''}`}
              style={{ opacity: refreshing ? 1 : pullDistance / 64 }}
            />
          </div>
        )}

        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6 overflow-x-hidden" style={{ paddingBottom: isMobile ? 'calc(4rem + var(--sab, 0px))' : 'calc(5rem + var(--sab, 0px))' }}>
          <EmailVerificationBanner />
          {isMobile && user?.plan !== 'premium' && (
            <MobileForYouSection specialty={user?.specialty} />
          )}
          {children}
        </main>
      </SidebarInset>

      {/* Bottom navigation — mobile only, always accessible */}
      <MobileBottomNav />

      {/* Tutorial system */}
      <WelcomeModal />
      <TutorialCard />

    </SidebarProvider>
  );
}