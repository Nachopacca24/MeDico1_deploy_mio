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
                          className={`h-2 rounded-full transition-all ${index === currentAdIndex
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
        <div className="relative mb-8 pb-8 pt-6">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl -z-10" />
          <div className="px-6 py-4">
            <h1 className="text-4xl font-extrabold mb-2 tracking-tight text-slate-900 dark:text-white">
              Hola, {user?.name || user?.first_name || "Doctor"} 👋
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Resumen de tu gestión médica, citas y valoraciones
            </p>
          </div>
        </div>

        {/* ✅ WIDGET DE CALENDARIO SEMANAL */}
        <WeekCalendarWidget />

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl hover:shadow-md hover:border-primary/40 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total de Casos</span>
            </div>
            <div className="text-4xl font-black text-slate-800 dark:text-white">
              {loadingStats ? '...' : stats?.total_cases || 0}
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl hover:shadow-md hover:border-primary/40 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Agendados/Pendientes</span>
            </div>
            <div className="text-4xl font-black text-slate-800 dark:text-white">
              {loadingStats ? '...' : (stats?.cases_by_status?.scheduled?.count || 0)}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-100">Acciones Rápidas</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              to="/cases/new"
              className="group flex flex-col justify-between p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-primary/10 transition-colors">
                  <Briefcase className="h-6 w-6 text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Nuevo Caso</h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 ml-16">
                Registra y organiza un nuevo procedimiento quirúrgico
              </p>
            </Link>

            <Link
              to="/favorites"
              className="group flex flex-col justify-between p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-primary/10 transition-colors">
                  <Star className="h-6 w-6 text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Favoritos</h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 ml-16">
                Accede rápidamente a plantillas y procedimientos guardados
              </p>
            </Link>
          </div>
        </div>

        {/* Recent Cases */}
        {stats?.recent_cases && stats.recent_cases.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Casos Recientes</h2>
              <Link to="/cases" className="text-sm font-medium text-primary hover:underline bg-primary/10 px-4 py-1.5 rounded-full transition-colors hover:bg-primary/20">
                Ver todos
              </Link>
            </div>
            <div className="grid gap-3">
              {stats.recent_cases.slice(0, 5).map((case_: any) => (
                <Link
                  key={case_.id}
                  to={`/cases/${case_.id}`}
                  className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all group"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors mb-1">
                      {case_.patient_name}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                      <span className="inline-flex items-center bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-medium">
                        {case_.procedure_count} procedimient{case_.procedure_count !== 1 ? 'os' : 'o'}
                      </span>
                      <span>• {case_.total_rvu} RVU</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="font-bold text-lg text-slate-800 dark:text-white">${case_.total_value?.toLocaleString()}</div>
                    <div className="text-xs text-slate-400 font-medium">
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