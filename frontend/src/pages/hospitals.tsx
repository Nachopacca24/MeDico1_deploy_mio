import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { hospitalService, type Hospital } from "@/services/hospitalService";
import { Building2, Search, Star, Loader2, AlertCircle, MapPin } from "lucide-react";
import { toast } from "@/shared/hooks/use-toast";
import { useAuth } from "@/shared/contexts/AuthContext";

const FREE_HOSPITAL_FAV_LIMIT = 2;
const CACHE_KEY = 'medico_hospitals_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const HospitalsPage = () => {
  const { user } = useAuth();
  const isFreePlan = !user?.has_premium_access;
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [favoritingId, setFavoritingId] = useState<number | null>(null);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async (skipCache = false) => {
    if (!skipCache) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setHospitals(data);
            setLoading(false);
            return;
          }
        }
      } catch {}
    }

    try {
      setLoading(true);
      const data = await hospitalService.getHospitals();
      setHospitals(data);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      setError(null);
    } catch (err: any) {
      console.error('Error fetching hospitals:', err);
      setError(err.message || 'Error al cargar hospitales');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (hospitalId: number, isFavorite: boolean) => {
    const currentFavCount = hospitals.filter(h => h.is_favorite).length;
    if (!isFavorite && isFreePlan && currentFavCount >= FREE_HOSPITAL_FAV_LIMIT) {
      toast({
        title: 'Límite alcanzado',
        description: 'Durante tu prueba Premium operaste sin límites. Reactiva Premium para continuar sin interrupciones.',
        variant: 'destructive'
      });
      return;
    }

    setFavoritingId(hospitalId);

    // Actualización optimista — sin refetch
    setHospitals(prev => prev.map(h =>
      h.id === hospitalId ? { ...h, is_favorite: !isFavorite } : h
    ));

    try {
      if (isFavorite) {
        await hospitalService.unfavoriteHospital(hospitalId);
        toast({ title: 'Eliminado de favoritos', description: 'Hospital quitado de tus favoritos' });
      } else {
        await hospitalService.favoriteHospital(hospitalId);
        toast({ title: 'Agregado a favoritos', description: 'Hospital agregado a tus favoritos' });
      }
      // Invalida caché para que la próxima visita traiga datos frescos
      sessionStorage.removeItem(CACHE_KEY);
    } catch (error: any) {
      // Revierte en caso de error
      setHospitals(prev => prev.map(h =>
        h.id === hospitalId ? { ...h, is_favorite: isFavorite } : h
      ));
      const msg = error?.response?.data?.error || 'Error al actualizar favoritos';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setFavoritingId(null);
    }
  };

  const filteredHospitals = useMemo(() => {
    if (!searchQuery) return hospitals;
    const query = searchQuery.toLowerCase();
    return hospitals.filter(hospital =>
      hospital.name.toLowerCase().includes(query) ||
      (hospital.location && hospital.location.toLowerCase().includes(query))
    );
  }, [hospitals, searchQuery]);

  const categorizedHospitals = useMemo(() => {
    const favorites: Hospital[] = [];
    const publicHospitals: Hospital[] = [];
    const igssHospitals: Hospital[] = [];
    const privateHospitals: Hospital[] = [];

    filteredHospitals.forEach(hospital => {
      if (hospital.is_favorite) favorites.push(hospital);

      if (hospital.name.toLowerCase().includes('igss')) {
        igssHospitals.push(hospital);
      } else if (
        hospital.name.toLowerCase().includes('nacional') ||
        hospital.name.toLowerCase().includes('regional') ||
        hospital.name.toLowerCase().includes('militar')
      ) {
        publicHospitals.push(hospital);
      } else {
        privateHospitals.push(hospital);
      }
    });

    return { favorites, publicHospitals, igssHospitals, privateHospitals };
  }, [filteredHospitals]);

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="pb-4 border-b">
            <div className="h-9 w-64 bg-muted rounded animate-pulse mb-2"></div>
            <div className="h-5 w-32 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 w-3/4 bg-muted rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-10 bg-muted rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Error al cargar hospitales</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => fetchHospitals(true)}>Reintentar</Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const renderHospitalCard = (hospital: Hospital) => (
    <Card key={hospital.id} className="hover:border-primary transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base line-clamp-2">{hospital.name}</CardTitle>
            {hospital.location && (
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {hospital.location}
              </CardDescription>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleFavorite(hospital.id, hospital.is_favorite || false)}
            disabled={favoritingId === hospital.id}
            className="shrink-0"
          >
            {favoritingId === hospital.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Star
                className={`h-4 w-4 ${
                  hospital.is_favorite
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground'
                }`}
              />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0" />
    </Card>
  );

  return (
    <AppLayout>
      <div className="space-y-6" data-tutorial="hospitals-list">
        {/* Header */}
        <div className="pb-4 border-b">
          <h1 className="text-3xl font-semibold mb-1 tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Hospitales
          </h1>
          <p className="text-muted-foreground">
            {filteredHospitals.length} de {hospitals.length} hospital{hospitals.length !== 1 ? 'es' : ''}
          </p>
        </div>

        {/* Búsqueda */}
        {hospitals.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar por nombre o ubicación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Favoritos */}
        {categorizedHospitals.favorites.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              Favoritos ({categorizedHospitals.favorites.length})
              {isFreePlan && (
                <span className={`ml-2 text-sm font-bold px-3 py-1 rounded-full ${
                  categorizedHospitals.favorites.length >= FREE_HOSPITAL_FAV_LIMIT
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {categorizedHospitals.favorites.length}/{FREE_HOSPITAL_FAV_LIMIT} · plan gratuito
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorizedHospitals.favorites.map(renderHospitalCard)}
            </div>
          </div>
        )}

        {/* Hospitales Públicos */}
        {categorizedHospitals.publicHospitals.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Hospitales Públicos ({categorizedHospitals.publicHospitals.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorizedHospitals.publicHospitals.map(renderHospitalCard)}
            </div>
          </div>
        )}

        {/* Hospitales IGSS */}
        {categorizedHospitals.igssHospitals.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Hospitales IGSS ({categorizedHospitals.igssHospitals.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorizedHospitals.igssHospitals.map(renderHospitalCard)}
            </div>
          </div>
        )}

        {/* Hospitales Privados */}
        {categorizedHospitals.privateHospitals.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Hospitales Privados ({categorizedHospitals.privateHospitals.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorizedHospitals.privateHospitals.map(renderHospitalCard)}
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {filteredHospitals.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
              <h2 className="text-2xl font-semibold mb-2">No se encontraron hospitales</h2>
              <p className="text-muted-foreground">
                {searchQuery ? 'Intenta ajustar tu búsqueda' : 'No hay hospitales disponibles'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default HospitalsPage;
