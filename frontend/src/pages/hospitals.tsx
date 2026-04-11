import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { hospitalService, type Hospital } from "@/services/hospitalService";
import { Building2, Search, Star, Loader2, AlertCircle, MapPin } from "lucide-react";
import { toast } from "@/shared/hooks/use-toast";

const HospitalsPage = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [favoritingId, setFavoritingId] = useState<number | null>(null);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const data = await hospitalService.getHospitals();
      setHospitals(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching hospitals:', err);
      setError(err.message || 'Error loading hospitals');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (hospitalId: number, isFavorite: boolean) => {
    setFavoritingId(hospitalId);
    try {
      if (isFavorite) {
        await hospitalService.unfavoriteHospital(hospitalId);
        toast({
          title: 'Removed from favorites',
          description: 'Hospital removed from your favorites'
        });
      } else {
        await hospitalService.favoriteHospital(hospitalId);
        toast({
          title: 'Added to favorites',
          description: 'Hospital added to your favorites'
        });
      }
      // Refresh the list to reflect changes
      await fetchHospitals();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorites',
        variant: 'destructive'
      });
    } finally {
      setFavoritingId(null);
    }
  };

  // Filter hospitals based on search
  const filteredHospitals = useMemo(() => {
    if (!searchQuery) return hospitals;
    
    const query = searchQuery.toLowerCase();
    return hospitals.filter(hospital =>
      hospital.name.toLowerCase().includes(query) ||
      (hospital.location && hospital.location.toLowerCase().includes(query))
    );
  }, [hospitals, searchQuery]);

  // Categorize hospitals
  const categorizedHospitals = useMemo(() => {
    const favorites: Hospital[] = [];
    const publicHospitals: Hospital[] = [];
    const igssHospitals: Hospital[] = [];
    const privateHospitals: Hospital[] = [];
    
    filteredHospitals.forEach(hospital => {
      if (hospital.is_favorite) {
        favorites.push(hospital);
      }
      
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

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier >= 2.5) return 'text-purple-600 dark:text-purple-400';
    if (multiplier >= 1.8) return 'text-blue-600 dark:text-blue-400';
    if (multiplier >= 1.2) return 'text-green-600 dark:text-green-400';
    return 'text-gray-600 dark:text-gray-400';
  };

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
            <h2 className="text-2xl font-semibold mb-2">Error loading hospitals</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={fetchHospitals}>Try Again</Button>
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
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Rate Multiplier:</span>
          <span className={`font-semibold ${getMultiplierColor(hospital.rate_multiplier)}`}>
            {hospital.rate_multiplier}x
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="pb-4 border-b">
          <h1 className="text-3xl font-semibold mb-1 tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Hospitals
          </h1>
          <p className="text-muted-foreground">
            {filteredHospitals.length} of {hospitals.length} hospital{hospitals.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        {hospitals.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by hospital name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Favorites Section */}
        {categorizedHospitals.favorites.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              Favorites ({categorizedHospitals.favorites.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorizedHospitals.favorites.map(renderHospitalCard)}
            </div>
          </div>
        )}

        {/* Public Hospitals */}
        {categorizedHospitals.publicHospitals.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Public Hospitals ({categorizedHospitals.publicHospitals.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorizedHospitals.publicHospitals.map(renderHospitalCard)}
            </div>
          </div>
        )}

        {/* IGSS Hospitals */}
        {categorizedHospitals.igssHospitals.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              IGSS Hospitals ({categorizedHospitals.igssHospitals.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorizedHospitals.igssHospitals.map(renderHospitalCard)}
            </div>
          </div>
        )}

        {/* Private Hospitals */}
        {categorizedHospitals.privateHospitals.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Private Hospitals ({categorizedHospitals.privateHospitals.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorizedHospitals.privateHospitals.map(renderHospitalCard)}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredHospitals.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
              <h2 className="text-2xl font-semibold mb-2">No hospitals found</h2>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search terms' : 'No hospitals available'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default HospitalsPage;
