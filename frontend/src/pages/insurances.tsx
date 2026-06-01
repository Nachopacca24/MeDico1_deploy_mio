import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { insuranceService, type InsuranceCompany } from "@/services/insuranceService";
import { ShieldCheck, Search, Star, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/shared/hooks/use-toast";

const CACHE_KEY = 'medico_insurances_cache';
const CACHE_TTL = 5 * 60 * 1000;

export default function InsurancesPage() {
  const [insurances, setInsurances] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [favoritingId, setFavoritingId] = useState<number | null>(null);

  useEffect(() => { fetchInsurances(); }, []);

  const fetchInsurances = async (skipCache = false) => {
    if (!skipCache) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setInsurances(data);
            setLoading(false);
            return;
          }
        }
      } catch {}
    }
    try {
      setLoading(true);
      const data = await insuranceService.getInsurances();
      setInsurances(data);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar aseguradoras');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (id: number, isFavorite: boolean) => {
    setFavoritingId(id);
    setInsurances(prev => prev.map(i => i.id === id ? { ...i, is_favorite: !isFavorite } : i));
    try {
      if (isFavorite) {
        await insuranceService.unfavoriteInsurance(id);
        toast({ title: 'Eliminado de favoritos' });
      } else {
        await insuranceService.favoriteInsurance(id);
        toast({ title: 'Agregado a favoritos' });
      }
      sessionStorage.removeItem(CACHE_KEY);
    } catch (err: any) {
      setInsurances(prev => prev.map(i => i.id === id ? { ...i, is_favorite: isFavorite } : i));
      toast({ title: 'Error', description: err?.message || 'Error al actualizar favoritos', variant: 'destructive' });
    } finally {
      setFavoritingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery) return insurances;
    const q = searchQuery.toLowerCase();
    return insurances.filter(i => i.name.toLowerCase().includes(q));
  }, [insurances, searchQuery]);

  const favorites = useMemo(() => filtered.filter(i => i.is_favorite), [filtered]);
  const rest      = useMemo(() => filtered.filter(i => !i.is_favorite), [filtered]);

  const renderCard = (ins: InsuranceCompany) => (
    <Card key={ins.id} className="hover:border-primary transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
            <CardTitle className="text-base line-clamp-2">{ins.name}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleFavorite(ins.id, ins.is_favorite || false)}
            disabled={favoritingId === ins.id}
            className="shrink-0"
          >
            {favoritingId === ins.id
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Star className={`h-4 w-4 ${ins.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
            }
          </Button>
        </div>
      </CardHeader>
    </Card>
  );

  if (loading) return (
    <AppLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {[1,2,3,4,5,6].map(i => (
          <Card key={i}><CardHeader><div className="h-6 w-3/4 bg-muted rounded animate-pulse" /></CardHeader></Card>
        ))}
      </div>
    </AppLayout>
  );

  if (error) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="w-16 h-16 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => fetchInsurances(true)}>Reintentar</Button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="pb-4 border-b">
          <h1 className="text-3xl font-semibold mb-1 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-8 w-8" />
            Seguros médicos
          </h1>
          <p className="text-muted-foreground">
            {filtered.length} de {insurances.length} aseguradora{insurances.length !== 1 ? 's' : ''}
          </p>
        </div>

        {insurances.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar aseguradora..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {favorites.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              Favoritos ({favorites.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map(renderCard)}
            </div>
          </div>
        )}

        {rest.length > 0 && (
          <div>
            {favorites.length > 0 && <h2 className="text-xl font-semibold mb-4">Todas ({rest.length})</h2>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map(renderCard)}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No se encontraron aseguradoras
          </div>
        )}
      </div>
    </AppLayout>
  );
}
