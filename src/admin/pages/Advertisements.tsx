// src/admin/pages/Advertisements.tsx

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { 
  Plus, 
  Search, 
  Loader2, 
  AlertCircle, 
  Megaphone,
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  TrendingUp,
  Info
} from 'lucide-react';
import { advertisementService, type Advertisement } from '@/admin/services/advertisementService';
import { AdvertisementFormDialog } from '@/admin/components/AdvertisementFormDialog';

const Advertisements = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [placementFilter, setPlacementFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<number, 'loading' | 'loaded' | 'error'>>({});

  const handleImageLoad = useCallback((adId: number) => {
    setImageLoadingStates(prev => ({ ...prev, [adId]: 'loaded' }));
  }, []);

  const handleImageError = useCallback((adId: number) => {
    setImageLoadingStates(prev => ({ ...prev, [adId]: 'error' }));
  }, []);

  useEffect(() => {
    fetchAds();
  }, [statusFilter, placementFilter]);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const data = await advertisementService.getAdvertisements({
        status: statusFilter || undefined,
        placement: placementFilter || undefined,
        search: search || undefined,
      });
      setAds(data);
      setError(null);
      // Reset image loading states
      const initialStates: Record<number, 'loading'> = {};
      data.forEach(ad => {
        initialStates[ad.id] = 'loading';
      });
      setImageLoadingStates(initialStates);
    } catch (err: any) {
      console.error('Error loading advertisements:', err);
      setError(err.message || 'Error al cargar anuncios');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchAds();
  };

  const handleNewAd = () => {
    setSelectedAd(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleViewAd = (ad: Advertisement) => {
    setSelectedAd(ad);
    setDialogMode('view');
    setDialogOpen(true);
  };

  const handleEditAd = (ad: Advertisement) => {
    setSelectedAd(ad);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleDeleteAd = async (ad: Advertisement) => {
    if (!confirm(`¿Estás seguro de eliminar el anuncio "${ad.campaign_name}"?`)) return;
    
    try {
      await advertisementService.deleteAdvertisement(ad.id);
      fetchAds();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar anuncio');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlacementColor = (placement: string) => {
    switch (placement) {
      case 'home_banner': return 'bg-purple-100 text-purple-800';
      case 'sidebar': return 'bg-blue-100 text-blue-800';
      case 'footer': return 'bg-gray-100 text-gray-800';
      case 'popup': return 'bg-orange-100 text-orange-800';
      case 'between_content': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
            <Button onClick={fetchAds} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulario Dialog */}
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
          <p className="text-muted-foreground mt-1">
            Gestiona los anuncios que se muestran en la aplicación
          </p>
        </div>
        <Button onClick={handleNewAd}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Anuncio
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por campaña..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} variant="secondary">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="paused">Pausado</option>
              <option value="completed">Finalizado</option>
              <option value="draft">Borrador</option>
            </select>

            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={placementFilter}
              onChange={(e) => setPlacementFilter(e.target.value)}
            >
              <option value="">Todas las ubicaciones</option>
              <option value="home_banner">Banner Principal</option>
              <option value="sidebar">Barra Lateral</option>
              <option value="footer">Footer</option>
              <option value="popup">Popup</option>
              <option value="between_content">Entre Contenido</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Ads List */}
      {ads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay anuncios</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comienza creando tu primer anuncio publicitario
            </p>
            <Button onClick={handleNewAd}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Anuncio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => (
            <Card key={ad.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{ad.campaign_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {ad.client_name}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ad.status)}`}>
                    {ad.status_display}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Preview Image - FIXED: object-contain para ver imagen completa */}
                  {ad.image_url && (
                    <div className="relative w-full bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '150px' }}>
                      {imageLoadingStates[ad.id] === 'loading' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      
                      {imageLoadingStates[ad.id] === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-2">
                          <AlertCircle className="w-8 h-8 mb-2" />
                          <span className="text-xs text-center">Error al cargar imagen</span>
                        </div>
                      )}
                      
                      <img 
                        src={ad.image_url} 
                        alt={ad.image_alt_text || ad.campaign_name}
                        className={`max-w-full max-h-[200px] object-contain transition-opacity ${
                          imageLoadingStates[ad.id] === 'loaded' ? 'opacity-100' : 'opacity-0'
                        }`}
                        onLoad={() => handleImageLoad(ad.id)}
                        onError={() => handleImageError(ad.id)}
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Placement */}
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlacementColor(ad.placement)}`}>
                      {ad.placement_display}
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="text-xs text-muted-foreground">
                    {formatDate(ad.start_date)} - {formatDate(ad.end_date)}
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <Eye className="h-4 w-4 inline mr-1 text-muted-foreground" />
                      <span className="font-medium">{(ad.impressions || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <TrendingUp className="h-4 w-4 inline mr-1 text-muted-foreground" />
                      <span className="font-medium">{(ad.clicks || 0).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      CTR: {(ad.ctr || 0).toFixed(2)}%
                    </div>
                  </div>

                  {/* URL */}
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

                  {/* Priority */}
                  <div className="text-sm">
                    <span className="text-muted-foreground">Prioridad: </span>
                    <span className="font-medium">{ad.priority}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewAd(ad)}
                    >
                      <Info className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEditAd(ad)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteAd(ad)}
                      title="Eliminar anuncio"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Mensaje de ayuda si la imagen falló */}
                  {imageLoadingStates[ad.id] === 'error' && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      <p className="font-medium mb-1">⚠️ Imagen no disponible</p>
                      <p>Haz clic en "Editar" para subir una nueva imagen.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Advertisements;