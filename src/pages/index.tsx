// src/pages/index.tsx

import { AppLayout } from "@/shared/components/layout/AppLayout";
import { EmailVerificationBanner } from "@/shared/components/EmailVerificationBanner";
import { WeekCalendarWidget } from "@/shared/components/ui/WeekCalendarWidget";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useAuth } from "@/shared/contexts/AuthContext";
import { 
  Star, 
  Briefcase, 
  TrendingUp, 
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { surgicalCaseService } from "@/services/surgicalCaseService";
import { advertisementService, type ActiveAd } from "@/admin/services/advertisementService";
import type { CaseStats } from "@/types/surgical-case";

const Index = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Estados para el carrusel
  const [goldAds, setGoldAds] = useState<ActiveAd[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [loadingAds, setLoadingAds] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await surgicalCaseService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // Cargar anuncios Gold
  useEffect(() => {
    const loadGoldAds = async () => {
      try {
        setLoadingAds(true);
        const ads = await advertisementService.getActiveAds('home_banner');
        setGoldAds(ads);
      } catch (error) {
        console.error('Error loading gold ads:', error);
      } finally {
        setLoadingAds(false);
      }
    };

    loadGoldAds();
  }, []);

  // Auto-play del carrusel cada 5 segundos
  useEffect(() => {
    if (!isAutoPlaying || goldAds.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % goldAds.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, goldAds.length]);

  // Registrar impresión cuando cambia el anuncio
  useEffect(() => {
    if (goldAds.length > 0 && goldAds[currentAdIndex]) {
      advertisementService.trackImpression(goldAds[currentAdIndex].id);
    }
  }, [currentAdIndex, goldAds]);

  const handleAdClick = async (ad: ActiveAd) => {
    try {
      await advertisementService.trackClick(ad.id);
      window.open(ad.redirect_url, ad.open_in_new_tab ? '_blank' : '_self');
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentAdIndex((prev) => (prev - 1 + goldAds.length) % goldAds.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentAdIndex((prev) => (prev + 1) % goldAds.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentAdIndex(index);
  };

  const currentAd = goldAds[currentAdIndex];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Email Verification Banner */}
        <EmailVerificationBanner />

        {/* Carrusel de Anuncios Gold */}
        {loadingAds ? (
          <Card className="overflow-hidden border-amber-200">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600 mb-2" />
                <p className="text-sm text-muted-foreground">Loading sponsors...</p>
              </div>
            </CardContent>
          </Card>
        ) : goldAds.length > 0 ? (
          <Card className="overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 border-amber-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-amber-600">⭐</span>
                  Premium Sponsors
                </CardTitle>
                <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded-full font-medium">
                  GOLD
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Imagen del Anuncio */}
                <div 
                  className="relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => currentAd && handleAdClick(currentAd)}
                >
                  {currentAd && (
                    <>
                      <img
                        src={currentAd.image_url}
                        alt={currentAd.image_alt_text || currentAd.title || 'Advertisement'}
                        className="w-full h-auto max-h-[400px] object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                      
                      {/* Overlay en hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                        <ExternalLink className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 h-8 w-8" />
                      </div>

                      {/* Título del anuncio (si existe) */}
                      {currentAd.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                          <h3 className="text-white font-semibold text-lg">
                            {currentAd.title}
                          </h3>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Controles del Carrusel */}
                {goldAds.length > 1 && (
                  <>
                    <button
                      onClick={goToPrevious}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                      aria-label="Previous ad"
                    >
                      <ChevronLeft className="h-5 w-5 text-gray-800" />
                    </button>
                    
                    <button
                      onClick={goToNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                      aria-label="Next ad"
                    >
                      <ChevronRight className="h-5 w-5 text-gray-800" />
                    </button>

                    <div className="flex justify-center gap-2 mt-4">
                      {goldAds.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToSlide(index)}
                          className={`h-2 rounded-full transition-all ${
                            index === currentAdIndex
                              ? 'w-8 bg-amber-600'
                              : 'w-2 bg-amber-300 hover:bg-amber-400'
                          }`}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      ))}
                    </div>

                    <div className="flex justify-center mt-3">
                      <button
                        onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                        className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                      >
                        {isAutoPlaying ? '⏸️ Pause' : '▶️ Play'} auto-rotation
                      </button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Hero Section */}
        <div className="pb-6 border-b">
          <h1 className="text-3xl font-semibold mb-1 tracking-tight">
            Welcome back, {user?.name || user?.full_name || "Doctor"}
          </h1>
          <p className="text-muted-foreground">
            Manage your surgical cases and valuations
          </p>
        </div>

        {/* ✅ WIDGET DE CALENDARIO SEMANAL */}
        <WeekCalendarWidget />

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 border rounded-lg hover:border-primary transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Cases</span>
            </div>
            <div className="text-3xl font-semibold">
              {loadingStats ? '...' : stats?.total_cases || 0}
            </div>
          </div>

          <div className="p-4 border rounded-lg hover:border-primary transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <div className="text-3xl font-semibold">
              {loadingStats ? '...' : (stats?.cases_by_status?.scheduled?.count || 0)}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Link 
              to="/cases/new"
              className="group p-4 border rounded-lg hover:border-primary hover:bg-accent/50 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <Briefcase className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <h3 className="font-medium">New Case</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Register a surgical case
              </p>
            </Link>
            
            <Link 
              to="/favorites"
              className="group p-4 border rounded-lg hover:border-primary hover:bg-accent/50 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <Star className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <h3 className="font-medium">Favorites</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Your saved procedures
              </p>
            </Link>
          </div>
        </div>

        {/* Recent Cases */}
        {stats?.recent_cases && stats.recent_cases.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Cases</h2>
              <Link to="/cases" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {stats.recent_cases.slice(0, 5).map((case_: any) => (
                <Link 
                  key={case_.id}
                  to={`/cases/${case_.id}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:border-primary hover:bg-accent/50 transition-all group"
                >
                  <div className="flex-1">
                    <div className="font-medium group-hover:text-primary transition-colors">
                      {case_.patient_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {case_.procedure_count} procedure{case_.procedure_count !== 1 ? 's' : ''} • {case_.total_rvu} RVU
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${case_.total_value?.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(case_.surgery_date).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;