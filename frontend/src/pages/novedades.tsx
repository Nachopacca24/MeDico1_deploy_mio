// src/pages/novedades.tsx

import { useEffect, useState, useCallback } from "react";
import { AppLayout, APP_REFRESH_EVENT } from "@/shared/components/layout/AppLayout";
import { advertisementService, type FeedAd, type AdCategory } from "@/admin/services/advertisementService";
import { openAdLink } from "@/shared/utils/openAdLink";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useNovedadesNew } from "@/shared/hooks/useNovedadesNew";
import { Search, ExternalLink, Loader2, Newspaper, Sparkles, ArrowRight } from "lucide-react";

const CATEGORIES: { value: AdCategory | ''; label: string; emoji: string }[] = [
  { value: '',            label: 'Todos',         emoji: '🌐' },
  { value: 'congreso',    label: 'Congresos',     emoji: '🎓' },
  { value: 'casa_medica', label: 'Casas Médicas', emoji: '🏥' },
  { value: 'hospital',    label: 'Hospitales',    emoji: '🏨' },
  { value: 'clinica',     label: 'Clínicas',      emoji: '🩺' },
  { value: 'tecnologia',  label: 'Tecnología',    emoji: '💡' },
  { value: 'farmaceutica',label: 'Farmacéutica',  emoji: '💊' },
  { value: 'educacion',   label: 'Educación',     emoji: '📚' },
  { value: 'general',     label: 'General',       emoji: '📋' },
];

const CATEGORY_COLORS: Record<AdCategory, string> = {
  congreso:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  casa_medica: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  hospital:    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  clinica:     'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  tecnologia:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  farmaceutica:'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  educacion:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  general:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

// Large hero card — used for the first featured item
function HeroAdCard({ ad, isNew }: { ad: FeedAd; isNew?: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  const catLabel = CATEGORIES.find(c => c.value === ad.category);

  const handleClick = async () => {
    try { await advertisementService.trackClick(ad.id); } catch { /* silent */ }
    openAdLink(ad.redirect_url, ad.open_in_new_tab);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative cursor-pointer rounded-2xl overflow-hidden border border-border hover:border-primary/40 hover:shadow-2xl transition-all duration-300 bg-card"
    >
      <div className="relative overflow-hidden aspect-[21/9] sm:aspect-[3/1] bg-slate-100 dark:bg-slate-800">
        {ad.image_url && !imgFailed ? (
          <img
            src={ad.image_url}
            alt={ad.image_alt_text || ad.title || 'Destacado'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Newspaper className="h-20 w-20 text-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[ad.category] || CATEGORY_COLORS.general}`}>
            {catLabel?.emoji} {ad.category_display}
          </span>
          {isNew && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary text-white animate-pulse">
              NUEVO
            </span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          {ad.title && (
            <h3 className="text-white font-bold text-xl sm:text-2xl lg:text-3xl leading-tight mb-2 drop-shadow">
              {ad.title}
            </h3>
          )}
          {ad.description && (
            <p className="text-white/80 text-sm sm:text-base line-clamp-2 mb-4 hidden sm:block">
              {ad.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-xs font-medium">{ad.client_name}</span>
            <span className="flex items-center gap-1.5 text-white text-sm font-semibold bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-full transition-colors">
              Ver más <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Standard grid card
function AdCard({ ad, isNew }: { ad: FeedAd; isNew?: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  const catLabel = CATEGORIES.find(c => c.value === ad.category);

  const handleClick = async () => {
    try { await advertisementService.trackClick(ad.id); } catch { /* silent */ }
    openAdLink(ad.redirect_url, ad.open_in_new_tab);
  };

  return (
    <div className="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={handleClick}>
      <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-[16/9] flex-shrink-0">
        {ad.image_url && !imgFailed ? (
          <img
            src={ad.image_url}
            alt={ad.image_alt_text || ad.title || 'Anuncio'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Newspaper className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[ad.category] || CATEGORY_COLORS.general}`}>
            {catLabel?.emoji} {ad.category_display}
          </span>
          {isNew && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary text-white">
              NUEVO
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        {ad.title && (
          <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2">
            {ad.title}
          </h3>
        )}
        {ad.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {ad.description}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium truncate pr-2">
            {ad.client_name}
          </span>
          <span className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 group-hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
            Ver más <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
}

const NovedadesPage = () => {
  const { user } = useAuth();
  const specialty = user?.specialty || '';
  const { markAsSeen } = useNovedadesNew();

  const [allAds, setAllAds] = useState<FeedAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AdCategory | ''>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => { markAsSeen(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const data = await advertisementService.getFeed({
        category: selectedCategory || undefined,
        specialty: specialty || undefined,
        search: debouncedSearch || undefined,
      });
      setAllAds(data);
    } catch {
      setAllAds([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, specialty, debouncedSearch]);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  useEffect(() => {
    window.addEventListener(APP_REFRESH_EVENT, fetchAds);
    return () => window.removeEventListener(APP_REFRESH_EVENT, fetchAds);
  }, [fetchAds]);

  const specialtyAds = specialty
    ? allAds.filter(ad => ad.target_specialties.length > 0 && ad.target_specialties.includes(specialty))
    : [];
  const otherAds = specialty
    ? allAds.filter(ad => ad.target_specialties.length === 0 || !ad.target_specialties.includes(specialty))
    : allAds;

  // Hero = first specialty ad if available, otherwise first general ad
  const heroAd = specialtyAds[0] ?? otherAds[0] ?? null;
  const specialtyGrid = specialtyAds.length > 0 ? specialtyAds.slice(1) : [];
  const generalGrid = heroAd && specialtyAds.length === 0 ? otherAds.slice(1) : otherAds;

  const isFiltering = !!selectedCategory || !!debouncedSearch;

  return (
    <AppLayout>
      <div className="space-y-6" data-tutorial="novedades-list">
        {/* Header */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 px-6 py-8">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="relative flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Sparkles className="h-4 w-4" />
              <span>Actualizado para ti</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Novedades</h1>
            <p className="text-muted-foreground max-w-lg">
              Descubrí congresos, nuevas tecnologías médicas, farmacéuticas y más — curado según tu especialidad.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar congresos, empresas, tecnología..."
            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Content */}
        {!loading && (
          <>
            {allAds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Newspaper className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {debouncedSearch ? `Sin resultados para "${debouncedSearch}"` : 'Sin novedades aún'}
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  {debouncedSearch
                    ? 'Intentá con otro término de búsqueda o filtrá por categoría'
                    : 'Pronto aparecerán congresos, productos y oportunidades relevantes para tu especialidad'}
                </p>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Hero — only shown when not filtering */}
                {!isFiltering && heroAd && (
                  <section>
                    <HeroAdCard ad={heroAd} isNew />
                  </section>
                )}

                {/* Para tu especialidad */}
                {specialtyAds.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-primary rounded-full" />
                        <h2 className="text-lg font-bold text-foreground">Para tu especialidad</h2>
                      </div>
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                        {specialty}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(isFiltering ? specialtyAds : specialtyGrid).map((ad, i) => (
                        <AdCard key={ad.id} ad={ad} isNew={i < 2} />
                      ))}
                    </div>
                  </section>
                )}

                {/* General / todos */}
                {generalGrid.length > 0 && (
                  <section>
                    {specialtyAds.length > 0 && (
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-1 h-6 bg-slate-300 dark:bg-slate-600 rounded-full" />
                        <h2 className="text-lg font-bold text-foreground">General</h2>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {generalGrid.map((ad, i) => (
                        <AdCard key={ad.id} ad={ad} isNew={specialtyAds.length === 0 && !isFiltering && i < 2} />
                      ))}
                    </div>
                  </section>
                )}

                {/* When filtering, show all ads flat */}
                {isFiltering && specialtyAds.length === 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allAds.map((ad, i) => (
                      <AdCard key={ad.id} ad={ad} isNew={i < 2} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default NovedadesPage;
