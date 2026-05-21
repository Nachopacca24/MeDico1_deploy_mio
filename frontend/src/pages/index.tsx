// src/pages/index.tsx

import { AppLayout } from "@/shared/components/layout/AppLayout";
import { EmailVerificationBanner } from "@/shared/components/EmailVerificationBanner";
import { WeekCalendarWidget } from "@/shared/components/ui/WeekCalendarWidget";
import { Badge } from "@/shared/components/ui/badge";
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
  Loader2,
  Plus
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

        {/* Carrusel de Anuncios */}
        {!loadingAds && goldAds.length > 0 && (
          <div className="relative rounded-xl overflow-hidden bg-black">
            {/* Imagen con blurred backdrop */}
            <div
              className="relative h-[380px] cursor-pointer group overflow-hidden"
              onClick={() => currentAd && handleAdClick(currentAd)}
            >
              {currentAd && (
                <>
                  {/* Fondo borroso */}
                  <img
                    src={currentAd.image_url}
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50 pointer-events-none"
                  />
                  {/* Imagen principal centrada */}
                  <img
                    src={currentAd.image_url}
                    alt={currentAd.image_alt_text || currentAd.title || 'Publicidad'}
                    className="relative z-10 h-full w-full object-contain"
                  />
                  <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/15 transition-colors duration-300 flex items-center justify-center">
                    <ExternalLink className="text-white opacity-0 group-hover:opacity-80 transition-opacity duration-300 h-8 w-8 drop-shadow-lg" />
                  </div>
                  {currentAd.title && (
                    <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/75 to-transparent px-5 py-4">
                      <p className="text-white font-semibold text-base leading-snug">{currentAd.title}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Etiqueta discreta */}
            <span className="absolute top-3 right-3 z-30 text-[10px] text-white/50 bg-black/30 px-2 py-0.5 rounded-full tracking-wide">
              Publicidad
            </span>

            {/* Controles de carrusel */}
            {goldAds.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-black/60 p-2 rounded-full backdrop-blur-sm transition-all"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-black/60 p-2 rounded-full backdrop-blur-sm transition-all"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
                  {goldAds.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentAdIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
                      }`}
                      aria-label={`Ir al anuncio ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Hero Section */}
        <div className="relative mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black mb-2 tracking-tight text-slate-900 dark:text-white">
              Panel de Control
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
              Hola, {user?.name || user?.first_name || "Doctor"}. Aquí tienes tu agenda para hoy.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-none text-sm font-bold">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Badge>
          </div>
        </div>

        {/* ✅ WIDGET DE CALENDARIO SEMANAL - Ahora más destacado */}
        <div className="grid grid-cols-1 gap-6">
           <WeekCalendarWidget />
        </div>

        {/* Stats Grid - Ahora más compacto al lado de las acciones */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="p-6 bg-gradient-to-br from-primary to-primary-foreground dark:from-primary/80 dark:to-primary/40 shadow-lg shadow-primary/20 rounded-3xl group transition-all hover:scale-[1.02]">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-bold text-white/80 uppercase tracking-widest">Total de Casos</span>
            </div>
            <div className="text-5xl font-black text-white">
              {loadingStats ? '...' : stats?.total_cases || 0}
            </div>
            <div className="mt-4 text-white/60 text-xs font-bold flex items-center gap-1 uppercase">
               Gestionados en la plataforma
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-3xl group transition-all hover:scale-[1.02] hover:border-amber-500/30">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Pendientes</span>
            </div>
            <div className="text-5xl font-black text-slate-800 dark:text-white">
              {loadingStats ? '...' : (stats?.cases_by_status?.scheduled?.count || 0)}
            </div>
            <div className="mt-4 text-slate-400 text-xs font-bold flex items-center gap-1 uppercase">
               Cirugías agendadas próximamente
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Acciones Rápidas</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Link
              to="/cases/new"
              className="group flex flex-col justify-between p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl hover:border-primary hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Plus className="h-20 w-20 text-primary" />
              </div>
              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl group-hover:bg-primary/10 transition-colors">
                    <Briefcase className="h-7 w-7 text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">Nuevo Caso</h3>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Registra y organiza un nuevo procedimiento quirúrgico de manera rápida.
                </p>
              </div>
              <div className="mt-6 flex items-center text-primary font-bold text-sm">
                Comenzar registro <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              to="/favorites"
              className="group flex flex-col justify-between p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl hover:border-primary hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Star className="h-20 w-20 text-amber-500" />
              </div>
              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl group-hover:bg-amber-500/10 transition-colors">
                    <Star className="h-7 w-7 text-slate-600 dark:text-slate-400 group-hover:text-amber-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">Favoritos</h3>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Accede rápidamente a tus plantillas y procedimientos guardados frecuentemente.
                </p>
              </div>
              <div className="mt-6 flex items-center text-amber-600 font-bold text-sm">
                Ver mis favoritos <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Cases */}
        {stats?.recent_cases && stats.recent_cases.length > 0 && (
          <div className="mt-12 mb-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-slate-300 dark:bg-slate-700 rounded-full" />
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Actividad Reciente</h2>
              </div>
              <Link to="/cases" className="text-sm font-bold text-primary hover:text-primary/80 bg-primary/5 px-6 py-2 rounded-2xl transition-all border border-primary/10 hover:border-primary/30">
                Ver historial completo
              </Link>
            </div>
            <div className="grid gap-4">
              {stats.recent_cases.slice(0, 5).map((case_: any) => (
                <Link
                  key={case_.id}
                  to={`/cases/${case_.id}`}
                  className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl hover:border-primary/40 hover:shadow-xl transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 dark:bg-slate-800 group-hover:bg-primary transition-colors" />
                  <div className="flex-1 ml-4">
                    <div className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors mb-1">
                      {case_.patient_name}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-3">
                      <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 border-none text-[10px] uppercase font-black tracking-widest px-2">
                        {case_.procedure_count} procedimient{case_.procedure_count !== 1 ? 'os' : 'o'}
                      </Badge>
                      <span className="text-xs font-bold text-slate-400">• {case_.total_rvu} RVU</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end pr-2">
                    <div className="font-black text-xl text-slate-900 dark:text-white">${case_.total_value?.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                      {new Date(case_.surgery_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
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