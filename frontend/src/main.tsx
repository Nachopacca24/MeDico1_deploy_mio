// main.tsx

import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { Toaster } from "@/shared/components/ui/toaster";
import { ToastContainer } from "@/shared/hooks/useToast";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/shared/components/layout/theme-provider";
import { AuthProvider } from "@/shared/contexts/AuthContext";
import { FavoritesProvider } from "@/core/contexts/FavoritesContext";
import { QueryProvider, TooltipProviderWrapper } from "@/core/providers";
import { AppRouter } from "@/core/router";
import { NotificationInitializer } from "@/core/components/NotificationInitializer";
import { TutorialProvider } from "@/core/contexts/TutorialContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";
import * as Sentry from "@sentry/react";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ["localhost", /^https:\/\/me-dico1\.vercel\.app\/api/, /^https:\/\/medico1-h5lk\.onrender\.com\/api/],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <QueryProvider>
        <TooltipProviderWrapper>
          <ThemeProvider>
            <AuthProvider>
              <FavoritesProvider>
                <TutorialProvider>
                  <NotificationInitializer />
                  <AppRouter />
                  <ToastContainer />
                </TutorialProvider>
              </FavoritesProvider>
            </AuthProvider>
            <Sonner />
            <Toaster />
          </ThemeProvider>
        </TooltipProviderWrapper>
      </QueryProvider>
    </BrowserRouter>
  </GoogleOAuthProvider>
);