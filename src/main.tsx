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
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <QueryProvider>
      <TooltipProviderWrapper>
        <ThemeProvider>
          <AuthProvider>
            <FavoritesProvider>
              <NotificationInitializer />
              <AppRouter />
              <ToastContainer />
            </FavoritesProvider>
          </AuthProvider>
          <Sonner />
          <Toaster />
        </ThemeProvider>
      </TooltipProviderWrapper>
    </QueryProvider>
  </BrowserRouter>
);