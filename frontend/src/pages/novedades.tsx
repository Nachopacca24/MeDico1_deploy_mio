// src/pages/novedades.tsx

import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { advertisementService, type FeedAd, type AdCategory } from "@/admin/services/advertisementService";
import { useAuth } from "@/shared/contexts/AuthContext";
import { Search, ExternalLink, Loader2, Newspaper } from "lucide-react";

const CATEGORIES: { value: AdCategory | ''; label: string; emoji: string }[] = [
  { value: '',           label: 'Todos',          emoji: '🌐' },
  { value: 'congreso',   label: 'Congresos',      emoji: '🎓' },
  { value: 'casa_medica',label: 'Casas Médicas',  emoji: '🏥' },
  { value: 'hospital',   label: 'Hospitales',     emoji: '🏨' },
  { value: 'clinica',    label: 'Clínicas',       emoji: '🩺' },
  { value: 'tecnologia', label: 'Tecnología',     emoji: '💡' },
  { value: 'farmaceutica',label: 'Farmacéutica',  emoji: '💊' },
  { value: 'educacion',  label: 'Educación',      emoji: '📚' },
  { value: 'general',    label: 'General',        emoji: '📋' },
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

function AdCard({ ad }: { ad: FeedAd }) {
  const [imgFailed, setImgFailed] = useState(false);
  const catLabel = CATEGORIES.find(c => c.value === ad.category);

  const handleClick = async () => {
    try { await advertisementService.trackClick(ad.id); } catch { /* silent */ }
    window.open(ad.redirect_url, ad.open_in_new_tab ? '_blank' : '_self');
  };

  return (
    <div className="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-xl transition-all duration-300">
      {/* Image */}
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
        {/* Category badge over image */}
        <span className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[ad.category] || CATEGORY_COLORS.general}`}>
          {catLabel?.emoji} {ad.category_display}
        </span>
      </div>

      {/* Content */}
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
          <button
            onClick={handleClick}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            Ver más
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

const NovedadesPage = () => {
  const { user } = useAuth();
  const specialty = user?.specialty || '';

  const [allAds, setAllAds] = useState<FeedAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AdCategory | ''>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
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

  // Split into specialty-targeted and general
  const specialtyAds = specialty
    ? allAds.filter(ad => ad.target_specialties.length > 0 && ad.target_specialties.includes(specialty))
    : [];
  const otherAds = specialty
    ? allAds.filter(ad => ad.target_specialties.length === 0 || !ad.target_specialties.includes(specialty))
    : allAds;

  const totalShown = allAds.length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1 pb-4 border-b">
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Newspaper className="h-7 w-7" />
            Novedades
          </h1>
          <p className="text-muted-foreground">
            Congresos, tecnología médica, farmacéuticas y más
          </p>
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
            {totalShown === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Newspaper className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No hay novedades disponibles</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  {debouncedSearch
                    ? `No se encontraron resultados para "${debouncedSearch}"`
                    : 'Pronto habrá contenido disponible en esta sección'}
                </p>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Para tu especialidad */}
                {specialtyAds.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-6 bg-primary rounded-full" />
                      <h2 className="text-lg font-bold text-foreground">
                        Para tu especialidad
                        <span className="ml-2 text-sm font-normal text-muted-foreground">({specialty})</span>
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {specialtyAds.map(ad => <AdCard key={ad.id} ad={ad} />)}
                    </div>
                  </section>
                )}

                {/* All / Other ads */}
                {otherAds.length > 0 && (
                  <section>
                    {specialtyAds.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-slate-300 dark:bg-slate-600 rounded-full" />
                        <h2 className="text-lg font-bold text-foreground">General</h2>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {otherAds.map(ad => <AdCard key={ad.id} ad={ad} />)}
                    </div>
                  </section>
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
