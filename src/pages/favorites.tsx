// FavoritesPage.tsx
// Página de favoritos - Usa API backend

import { useEffect, useState } from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { loadCSV } from "@/shared/utils/csvLoader";
import { Star, Trash2, StarOff, AlertCircle, Calculator } from "lucide-react";
import { favoritesService, Favorite } from "@/services/favoritesService";
import { useFavorites } from "@/core/contexts/FavoritesContext";

// IMPORTANTE: Esta estructura debe coincidir EXACTAMENTE con operations.tsx
const folderStructure = {
  Cardiovascular: {
    "Cardiovascular": "Cardiovascular/Cardiovascular.csv",
    "Corazón": "Cardiovascular/Corazón.csv",
    "Vasos Periféricos": "Cardiovascular/Vasos_periféricos.csv",
    "Tórax": "Cardiovascular/torax.csv",
  },
  Dermatología: {
    "Dermatología": "Dermatología/Dermatología.csv",
  },
  Digestivo: {
    "Digestivo": "Digestivo/Digestivo.csv",
    "Estómago e Intestino": "Digestivo/Estómago_e_intestino.csv",
    "Hígado y Páncreas": "Digestivo/Hígado_Páncreas.csv",
    "Peritoneo y Hernias": "Digestivo/Peritoneo_y_hernias.csv",
  },
  Endocrino: {
    "Endocrino": "Endocrino/Endocrino.csv",
  },
  Ginecología: {
    "Ginecología": "Ginecología/Ginecología.csv",
  },
  Mama: {
    "Mama": "Mama/Mama.csv",
  },
  Maxilofacial: {
    "Maxilofacial": "Maxilofacial/Maxilofacial.csv",
  },
  Neurocirugía: {
    "Neurocirugía": "Neurocirugía/Neurocirugía.csv",
    "Columna": "Neurocirugía/Columna.csv",
    "Cráneo y Columna": "Neurocirugía/Cráneo_y_columna.csv",
  },
  Obstetricia: {
    "Obstetricia": "Obstetricia/Obstetricia.csv",
  },
  Oftalmología: {
    "Oftalmología": "Oftalmología/Oftalmología.csv",
  },
  Ortopedia: {
    "Ortopedia": "Ortopedia/Ortopedia.csv",
    "Cadera": "Ortopedia/Cadera.csv",
    "Hombro": "Ortopedia/Hombro.csv",
    "Muñeca y Mano": "Ortopedia/Muñeca_y_mano.csv",
    "Pie": "Ortopedia/Pie.csv",
    "Yesos y Férulas": "Ortopedia/Yesos_y_ferulas.csv",
    "Injertos, Implantes y Replantación": "Ortopedia/ortopedia_injertos_implantes_replantacion.csv",
    "Artroscopias": "Ortopedia/Artroscopia.csv",
  },
  Otorrino: {
    "Laringe y Tráqueas": "Otorrino/Laringe_y_traqueas.csv",
    "Nariz y Senos Paranasales": "Otorrino/Nariz_y_senos_paranasales.csv",
    "Otorrinolaringología": "Otorrino/Otorrinolaringología.csv",
    "Tórax": "Otorrino/torax.csv",
  },
  Plástica: {
    "Cirugía Plástica": "Plastica/Plastica.csv",
  },
  "Procesos Variados": {
    "Cirugía General": "Procesos_variados/Cirugía_General.csv",
    "Drenajes e Incisiones": "Procesos_variados/Drenajes___Incisiones.csv",
    "Reparaciones (Suturas)": "Procesos_variados/Reparaciones_(suturas).csv",
    "Uñas y Piel": "Procesos_variados/Uñas___piel.csv",
  },
  Urología: {
    "Urología": "Urología/Urología.csv",
  },
};

// Componente de tarjeta
function FavoriteOperationCard({ 
  operation, 
  isRemoving,
  onToggleFavorite
}: { 
  operation: any;
  isRemoving: boolean;
  onToggleFavorite: () => void;
}) {
  const codigo = operation?.codigo || 'N/A';
  const cirugia = operation?.cirugia || 'Sin nombre';
  const rvu = operation?.rvu || '0';
  const especialidad = operation?.especialidad || 'N/A';
  const grupo = operation?.grupo || 'N/A';
  
  return (
    <div className="group relative border rounded-lg p-4 bg-card hover:border-primary transition-colors">
      <div className="flex items-start justify-between mb-3">
        <button
          onClick={onToggleFavorite}
          disabled={isRemoving}
          className="p-1.5 hover:bg-accent rounded transition-colors disabled:opacity-50"
          title="Remove from favorites"
        >
          {isRemoving ? (
            <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
          )}
        </button>
        <span className="text-xs font-mono text-muted-foreground">
          {codigo}
        </span>
      </div>
      
      <h3 className="font-semibold text-base mb-3 leading-tight min-h-[2.5rem]">
        {cirugia}
      </h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Specialty</span>
          <span className="font-medium">{especialidad}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Group</span>
          <span className="font-medium">{grupo}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-muted-foreground">RVU</span>
          <span className="text-lg font-semibold">{rvu}</span>
        </div>
      </div>

      <button className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-4 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2">
        <Calculator className="w-4 h-4" />
        Calculate Value
      </button>
    </div>
  );
}

const FavoritesPage = () => {
  const [favoritesData, setFavoritesData] = useState<Favorite[]>([]);
  const [favoriteOperations, setFavoriteOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Usar el contexto de favoritos
  const { refreshFavorites } = useFavorites();

  useEffect(() => {
    async function loadFavorites() {
      setLoading(true);
      setError(null);
      
      try {
        // Obtener favoritos desde la API
        const apiFavorites = await favoritesService.getFavorites();
        const favoritesArray = Array.isArray(apiFavorites) ? apiFavorites : [];
        
        if (favoritesArray.length === 0) {
          setFavoritesData([]);
          setFavoriteOperations([]);
          return;
        }
        
        setFavoritesData(favoritesArray);

        // Crear set de códigos para búsqueda rápida
        const favCodes = new Set(favoritesArray.map(f => String(f.surgery_code).trim()));
        const foundOperations: any[] = [];
        const foundCodes = new Set<string>(); // Para evitar duplicados

        // Buscar operaciones en los CSVs
        for (const [specialty, subcategories] of Object.entries(folderStructure)) {
          for (const [subName, csvPath] of Object.entries(subcategories)) {
            try {
              const operations = await loadCSV(csvPath);
              
              operations.forEach((op: any) => {
                const opCodigo = String(op?.codigo || '').trim();
                
                // Solo agregar si es favorito y no lo hemos agregado ya
                if (favCodes.has(opCodigo) && !foundCodes.has(opCodigo)) {
                  const favorite = favoritesArray.find(f => String(f.surgery_code).trim() === opCodigo);
                  foundOperations.push({
                    ...op,
                    favorite_id: favorite?.id
                  });
                  foundCodes.add(opCodigo); // Marcar como encontrado
                }
              });
            } catch (err) {
              // Silently skip CSVs that can't be loaded
            }
          }
        }

        setFavoriteOperations(foundOperations);

      } catch (err: any) {
        setError(err.message || 'Error al cargar favoritos');
      } finally {
        setLoading(false);
      }
    }

    loadFavorites();
  }, [refreshTrigger]);

  const removeFavorite = async (codigo: string, favoriteId?: number) => {
    if (!favoriteId) return;

    setRemoving(favoriteId);
    
    try {
      await favoritesService.removeFavorite(favoriteId);
      await refreshFavorites();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      alert('Error al eliminar favorito. Por favor intenta de nuevo.');
    } finally {
      setRemoving(null);
    }
  };

  const clearAllFavorites = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar todos los favoritos?')) {
      return;
    }

    setLoading(true);
    
    try {
      const result = await favoritesService.clearAll();
      await refreshFavorites();
      setRefreshTrigger(prev => prev + 1);
      alert(`${result.count} favorito(s) eliminado(s) correctamente`);
    } catch (error) {
      alert('Error al limpiar favoritos. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">Cargando favoritos...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-8 m-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            <h2 className="text-2xl font-bold text-red-700 dark:text-red-400">Error al cargar favoritos</h2>
          </div>
          <p className="text-red-600 dark:text-red-400 text-lg mb-4">{error}</p>
          <p className="text-red-500 dark:text-red-300 text-sm">
            Si el problema persiste, intenta cerrar sesión y volver a iniciar sesión.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Minimal Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h1 className="text-3xl font-semibold mb-1 tracking-tight">Favorite Surgeries</h1>
            <p className="text-muted-foreground">
              {favoritesData.length} saved procedure{favoritesData.length !== 1 ? 's' : ''}
            </p>
          </div>
          {favoritesData.length > 0 && (
            <button
              onClick={clearAllFavorites}
              className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {/* Contador */}
        {favoritesData.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-900 dark:text-yellow-300 font-semibold text-lg">
              ⭐ <span className="font-bold text-xl">{favoritesData.length}</span> cirugía{favoritesData.length > 1 ? 's' : ''} guardada{favoritesData.length > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Contenido */}
        {favoritesData.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-16 text-center">
            <StarOff className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              No tienes favoritos aún
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-md mx-auto">
              Agrega cirugías a favoritos desde Operations haciendo clic en la estrella
            </p>
          </div>
        ) : favoriteOperations.length > 0 ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteOperations.map((operation, idx) => (
                <FavoriteOperationCard
                  key={`fav-${operation.codigo}-${idx}`}
                  operation={operation}
                  isRemoving={removing === operation.favorite_id}
                  onToggleFavorite={() => removeFavorite(operation.codigo, operation.favorite_id)}
                />
              ))}
            </div>

          </div>
        ) : null}
      </div>
    </AppLayout>
  );
};

export default FavoritesPage;