// src/admin/pages/Advertisements.tsx

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Plus, Search, Loader2, AlertCircle, Megaphone,
  Eye, Pencil, Trash2, ExternalLink, TrendingUp, Info,
  Clock, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { advertisementService, type Advertisement } from '@/admin/services/advertisementService';
import { AdvertisementFormDialog } from '@/admin/components/AdvertisementFormDialog';

type Tab = 'active' | 'expiring' | 'expired' | 'all';

const CATEGORY_BADGE: Record<string, { label: string; emoji: string; cls: string }> = {
  congreso:     { label: 'Congreso',       emoji: '🎓', cls: 'bg-purple-100 text-purple-700' },
  casa_medica:  { label: 'Casa Médica',    emoji: '🏥', cls: 'bg-blue-100 text-blue-700' },
  hospital:     { label: 'Hospital',       emoji: '🏨', cls: 'bg-teal-100 text-teal-700' },
  tecnologia:   { label: 'Tecnología',     emoji: '💡', cls: 'bg-yellow-100 text-yellow-700' },
  farmaceutica: { label: 'Farmacéutica',   emoji: '💊', cls: 'bg-green-100 text-green-700' },
  educacion:    { label: 'Educación',      emoji: '📚', cls: 'bg-orange-100 text-orange-700' },
  clinica:      { label: 'Clínica',        emoji: '🩺', cls: 'bg-pink-100 text-pink-700' },
  general:      { label: 'General',        emoji: '📋', cls: 'bg-slate-100 text-slate-600' },
};

const PLAN_BADGE: Record<string, { label: string; cls: string }> = {
  gold:   { label: 'Oro',    cls: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
  silver: { label: 'Plata',  cls: 'bg-gray-100 text-gray-700 border border-gray-300' },
  bronze: { label: 'Bronce', cls: 'bg-orange-100 text-orange-800 border border-orange-300' },
};

function getDaysRemaining(endDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Parse as local date to avoid UTC-offset shifting the day
  const [y, m, d] = endDate.split('T')[0].split('-').map(Number);
  const end = new Date(y, m - 1, d);
  return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ endDate }: { endDate: string }) {
  const days = getDaysRemaining(endDate);
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      <AlertTriangle className="h-3 w-3" />
      Expirado hace {Math.abs(days)}d
    </span>
  );
  if (days <= 7) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      <Clock className="h-3 w-3" />
      {days === 0 ? 'Expira hoy' : `${days}d restantes`}
    </span>
  );
  if (days <= 14) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
      <Clock className="h-3 w-3" />
      {days}d restantes
    </span>
  );
  return null;
}

const Advertisements = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [placementFilter, setPlacementFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<number, 'loading' | 'loaded' | 'error'>>({});

  const handleImageLoad = useCallback((id: number) => {
    setImageLoadingStates(prev => ({ ...prev, [id]: 'loaded' }));
  }, []);
  const handleImageError = useCallback((id: number) => {
    setImageLoadingStates(prev => ({ ...prev, [id]: 'error' }));
  }, []);

  useEffect(() => { fetchAds(); }, [placementFilter, categoryFilter]);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const data = await advertisementService.getAdvertisements({
        placement: placementFilter || undefined,
        category: categoryFilter || undefined,
        search: search || undefined,
      });
      setAds(data);
      setError(null);
      const s: Record<number, 'loading'> = {};
      data.forEach(ad => { s[ad.id] = 'loading'; });
      setImageLoadingStates(s);
    } catch (err: any) {
      setError(err.message || 'Error al cargar anuncios');
    } finally {
      setLoading(false);
    }
  };

  const activeList = useMemo(() =>
    ads.filter(ad => ad.status === 'active' && getDaysRemaining(ad.end_date) >= 0), [ads]);
  const expiringList = useMemo(() =>
    ads.filter(ad => {
      const d = getDaysRemaining(ad.end_date);
      return ad.status === 'active' && d >= 0 && d <= 14;
    }), [ads]);
  const expiredList = useMemo(() =>
    ads.filter(ad => getDaysRemaining(ad.end_date) < 0), [ads]);

  const displayedAds = useMemo(() => {
    switch (activeTab) {
      case 'active':   return activeList;
      case 'expiring': return expiringList;
      case 'expired':  return expiredList;
      default:         return ads;
    }
  }, [ads, activeTab, activeList, expiringList, expiredList]);

  const handleNewAd = () => { setSelectedAd(null); setDialogMode('create'); setDialogOpen(true); };
  const handleViewAd = (ad: Advertisement) => { setSelectedAd(ad); setDialogMode('view'); setDialogOpen(true); };
  const handleEditAd = (ad: Advertisement) => { setSelectedAd(ad); setDialogMode('edit'); setDialogOpen(true); };

  const handleDeleteAd = async (ad: Advertisement) => {
    if (!confirm(`¿Estás seguro de eliminar "${ad.campaign_name}"?`)) return;
    try {
      await advertisementService.deleteAdvertisement(ad.id);
      fetchAds();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar anuncio');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':    return 'bg-green-100 text-green-800';
      case 'paused':    return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default:          return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlacementColor = (placement: string) => {
    switch (placement) {
      case 'home_banner':     return 'bg-purple-100 text-purple-800';
      case 'sidebar':         return 'bg-blue-100 text-blue-800';
      case 'footer':          return 'bg-gray-100 text-gray-800';
      case 'popup':           return 'bg-orange-100 text-orange-800';
      case 'between_content': return 'bg-teal-100 text-teal-800';
      default:                return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const tabs: { id: Tab; label: string; count: number; urgent?: boolean }[] = [
    { id: 'active',   label: 'Activos',     count: activeList.length },
    { id: 'expiring', label: 'Por Expirar', count: expiringList.length, urgent: expiringList.length > 0 },
    { id: 'expired',  label: 'Expirados',   count: expiredList.length, urgent: expiredList.length > 0 },
    { id: 'all',      label: 'Todos',       count: ads.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando anuncios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="border-destructive max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error al cargar datos</h2>
            <p className="text-muted-foreground text-center">{error}</p>
            <Button onClick={fetchAds} className="mt-4">Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdvertisementFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={fetchAds}
        advertisement={selectedAd}
        mode={dialogMode}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Publicidad</h1>
          <p className="text-muted-foreground mt-1">Gestiona los anuncios que se muestran en la aplicación</p>
        </div>
        <Button onClick={handleNewAd}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Anuncio
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-3xl font-bold">{activeList.length}</span>
            </div>
            <div className="text-sm text-muted-foreground">Activos ahora</div>
          </CardContent>
        </Card>

        <Card className={expiringList.length > 0 ? 'border-orange-300' : ''}>
          <CardContent className="pt-5 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className={`h-5 w-5 ${expiringList.length > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
              <span className={`text-3xl font-bold ${expiringList.length > 0 ? 'text-orange-600' : ''}`}>
                {expiringList.length}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">Expiran en 30d</div>
          </CardContent>
        </Card>

        <Card className={expiredList.length > 0 ? 'border-red-300' : ''}>
          <CardContent className="pt-5 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className={`h-5 w-5 ${expiredList.length > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              <span className={`text-3xl font-bold ${expiredList.length > 0 ? 'text-red-600' : ''}`}>
                {expiredList.length}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">Expirados</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{ads.length}</span>
            </div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          {/* Tabs */}
          <div className="flex gap-0 border-b mb-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : tab.urgent
                    ? tab.id === 'expired' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="Buscar por campaña o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAds()}
              />
              <Button onClick={fetchAds} variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={placementFilter}
              onChange={(e) => setPlacementFilter(e.target.value)}
            >
              <option value="">Todas las ubicaciones</option>
              <option value="home_banner">Banner Principal</option>
              <option value="popup">Popup</option>
              <option value="sidebar">Barra Lateral</option>
              <option value="between_content">Entre Contenido</option>
              <option value="footer">Footer / Sticky</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              <option value="congreso">🎓 Congreso</option>
              <option value="casa_medica">🏥 Casa Médica</option>
              <option value="hospital">🏨 Hospital</option>
              <option value="tecnologia">💡 Tecnología</option>
              <option value="farmaceutica">💊 Farmacéutica</option>
              <option value="educacion">📚 Educación</option>
              <option value="clinica">🩺 Clínica</option>
              <option value="general">📋 General</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Alert for expiring/expired tabs */}
      {activeTab === 'expiring' && expiringList.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800">
          <Clock className="h-5 w-5 shrink-0" />
          <p className="text-sm">
            <strong>{expiringList.length} anuncio{expiringList.length > 1 ? 's' : ''}</strong> expira{expiringList.length === 1 ? '' : 'n'} en los próximos 14 días.
            Contacta a los clientes para renovar.
          </p>
        </div>
      )}
      {activeTab === 'expired' && expiredList.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">
            <strong>{expiredList.length} anuncio{expiredList.length > 1 ? 's' : ''}</strong> ya expiró{expiredList.length === 1 ? '' : 'aron'}.
            Considera eliminarlos o renovarlos.
          </p>
        </div>
      )}

      {/* Ads grid */}
      {displayedAds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {activeTab === 'active'   && 'No hay anuncios activos'}
              {activeTab === 'expiring' && 'Ningún anuncio expira pronto'}
              {activeTab === 'expired'  && 'No hay anuncios expirados'}
              {activeTab === 'all'      && 'No hay anuncios'}
            </h3>
            {activeTab === 'all' && (
              <Button onClick={handleNewAd} className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Crear Anuncio
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayedAds.map((ad) => {
            const days = getDaysRemaining(ad.end_date);
            const planInfo = PLAN_BADGE[ad.client_plan ?? 'bronze'];
            const cardBorder =
              days < 0   ? 'border-red-300' :
              days <= 7  ? 'border-red-200' :
              days <= 30 ? 'border-orange-200' : '';

            return (
              <Card key={ad.id} className={`hover:shadow-lg transition-shadow ${cardBorder}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{ad.campaign_name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-sm text-muted-foreground truncate">{ad.client_name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${planInfo.cls}`}>
                          {planInfo.label}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${days < 0 ? 'bg-red-100 text-red-800' : getStatusColor(ad.status)}`}>
                      {days < 0 ? 'Expirado' : ad.status_display}
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* Image preview */}
                    {ad.image_url && (
                      <div className="relative w-full bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '130px' }}>
                        {imageLoadingStates[ad.id] === 'loading' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        )}
                        {imageLoadingStates[ad.id] === 'error' && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-2">
                            <AlertCircle className="w-8 h-8 mb-1" />
                            <span className="text-xs text-center">Imagen no disponible</span>
                          </div>
                        )}
                        <img
                          src={ad.image_url}
                          alt={ad.image_alt_text || ad.campaign_name}
                          className={`max-w-full max-h-[180px] object-contain transition-opacity ${
                            imageLoadingStates[ad.id] === 'loaded' ? 'opacity-100' : 'opacity-0'
                          }`}
                          onLoad={() => handleImageLoad(ad.id)}
                          onError={() => handleImageError(ad.id)}
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Placement + Category + Expiry */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPlacementColor(ad.placement)}`}>
                        {ad.placement_display}
                      </span>
                      {ad.category && CATEGORY_BADGE[ad.category] && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_BADGE[ad.category].cls}`}>
                          {CATEGORY_BADGE[ad.category].emoji} {CATEGORY_BADGE[ad.category].label}
                        </span>
                      )}
                      <ExpiryBadge endDate={ad.end_date} />
                    </div>

                    {/* Dates */}
                    <div className="text-xs text-muted-foreground">
                      {formatDate(ad.start_date)} → {formatDate(ad.end_date)}
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{(ad.impressions || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{(ad.clicks || 0).toLocaleString()}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        CTR {(ad.ctr || 0).toFixed(1)}%
                      </span>
                    </div>

                    {/* Redirect URL */}
                    {ad.redirect_url && (
                      <div className="text-xs truncate">
                        <ExternalLink className="h-3 w-3 inline mr-1" />
                        <a
                          href={ad.redirect_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {ad.redirect_url}
                        </a>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewAd(ad)}>
                        <Info className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditAd(ad)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteAd(ad)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {imageLoadingStates[ad.id] === 'error' && (
                      <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                        Haz clic en "Editar" para subir una nueva imagen.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Advertisements;
