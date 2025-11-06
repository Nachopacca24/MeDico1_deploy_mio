// FavoritesPage.tsx
// Página de favoritos - COMPATIBLE con OperationsPage.tsx

import { useEffect, useState } from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { loadCSV } from "@/shared/utils/csvLoader";
import { Star, Trash2, StarOff, AlertCircle } from "lucide-react";

// IMPORTANTE: Esta estructura debe coincidir EXACTAMENTE con OperationsPage.tsx
const folderStructure = {
  Cardiovascular: {
    "Corazón": "Cardiovascular/Corazón.csv",
    "Vasos Periféricos": "Cardiovascular/Vasos_periféricos.csv",
    "Torax": "Cardiovascular/torax.csv",
  },
  Dermatología: {
    "Dermatología": "Dermatología/Dermatología.csv",
  },
  Digestivo: {
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
  Neurocirugía: {
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
    "Cadera": "Ortopedia/Cadera.csv",
    "Hombro": "Ortopedia/Hombro.csv",
    "Muñeca y Mano": "Ortopedia/Muñeca_y_mano.csv",
    "Pie": "Ortopedia/Pie.csv",
    "Yesos y Ferulas": "Ortopedia/Yesos_y_ferulas.csv",
    "Ortopedia Injertos, Implantes y Replantacion": "Ortopedia/ortopedia_injertos_implantes_replantacion.csv",
    "Artroscopias": "Ortopedia/Artroscopia.csv",
  },
  Otorrino: {
    "Laringe y Traqueas": "Otorrino/Laringe_y_traqueas.csv",
    "Nariz y Senos Paranasales": "Otorrino/Nariz_y_senos_paranasales.csv",
    "Otorrinolaringología": "Otorrino/Otorrinolaringología.csv",
    "Torax": "Otorrino/torax.csv",
  },
  "Procesos Variados": {
    "Cirugía General": "Procesos_variados/Cirugía_General.csv",
    "Drenajes e Incisiones": "Procesos_variados/Drenajes___Incisiones.csv",
    "Reparaciones (Suturas)": "Procesos_variados/Reparaciones_(suturas).csv",
    "Uñas y Piel": "Procesos_variados/Uñas___piel.csv",
  },
  Plastica: {
    "Cirugia Plastica": "Plastica/Plastica.csv",
  },
  Urología: {
    "Urología": "Urología/Urología.csv",
  },
  Maxilofacial: {
    "Maxilofacial": "Maxilofacial/Maxilofacial.csv",
  },
};

// Componente de tarjeta
function FavoriteOperationCard({ 
  operation, 
  onToggleFavorite
}: { 
  operation: any;
  onToggleFavorite: () => void;
}) {
  const codigo = operation?.codigo || 'N/A';
  const cirugia = operation?.cirugia || 'Sin nombre';
  const rvu = operation?.rvu || '0';
  const especialidad = operation?.especialidad || 'N/A';
  const grupo = operation?.grupo || 'N/A';
  
  return (
    <div className="border rounded-lg p-4 bg-white shadow hover:shadow-lg transition-all">
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={onToggleFavorite}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Quitar de favoritos"
        >
          <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
        </button>
        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
          {codigo}
        </span>
      </div>
      
      <h3 className="font-bold text-lg text-gray-900 mb-3">
        {cirugia}
      </h3>
      
      <div className="space-y-2 text-sm text-gray-700">
        <p>
          <span className="font-semibold text-gray-600">Especialidad:</span>{' '}
          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
            {especialidad}
          </span>
        </p>
        <p>
          <span className="font-semibold text-gray-600">Grupo:</span>{' '}
          <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
            {grupo}
          </span>
        </p>
        <p>
          <span className="font-semibold text-gray-600">RVU:</span>{' '}
          <span className="ml-2 bg-green-100 text-green-700 px-3 py-1 rounded font-bold text-base">
            {rvu}
          </span>
        </p>
      </div>
    </div>
  );
}

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteOperations, setFavoriteOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFavorites() {
      try {
        console.log("🔍 [FAVORITOS] Iniciando...");
        
        const savedFavorites = localStorage.getItem('surgery-favorites');
        console.log("📦 [FAVORITOS] localStorage:", savedFavorites);
        
        if (!savedFavorites) {
          console.log("ℹ️ [FAVORITOS] No hay favoritos");
          setLoading(false);
          return;
        }

        const favArray: string[] = JSON.parse(savedFavorites);
        const favSet = new Set<string>(favArray);
        setFavorites(favSet);

        console.log(`✅ [FAVORITOS] ${favSet.size} códigos:`, Array.from(favSet));

        if (favSet.size === 0) {
          setLoading(false);
          return;
        }

        console.log("📂 [FAVORITOS] Buscando en CSVs...");
        const foundOperations: any[] = [];

        for (const [specialty, subcategories] of Object.entries(folderStructure)) {
          for (const [subName, csvPath] of Object.entries(subcategories)) {
            try {
              const operations = await loadCSV(csvPath);
              
              operations.forEach((op: any) => {
                // Convertir ambos a string y hacer trim
                const opCodigo = String(op?.codigo || '').trim();
                
                // Buscar en el set de favoritos
                if (favSet.has(opCodigo)) {
                  console.log(`✅ [FAVORITOS] Encontrada: ${opCodigo} - ${op.cirugia}`);
                  foundOperations.push(op);
                }
              });
            } catch (err) {
              console.warn(`⚠️ [FAVORITOS] Error en ${csvPath}`);
            }
          }
        }

        console.log(`🎉 [FAVORITOS] Encontradas: ${foundOperations.length}`);
        setFavoriteOperations(foundOperations);

      } catch (err: any) {
        console.error("❌ [FAVORITOS] Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadFavorites();
  }, []);

  const removeFavorite = (codigo: string) => {
    const newFavorites = new Set(favorites);
    newFavorites.delete(codigo);
    
    localStorage.setItem('surgery-favorites', JSON.stringify(Array.from(newFavorites)));
    setFavorites(newFavorites);
    setFavoriteOperations(prev => prev.filter(op => op.codigo !== codigo));
  };

  const clearAllFavorites = () => {
    if (confirm('¿Estás seguro de que quieres eliminar todos los favoritos?')) {
      localStorage.removeItem('surgery-favorites');
      setFavorites(new Set());
      setFavoriteOperations([]);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-xl font-semibold text-gray-700">Cargando favoritos...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 m-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <h2 className="text-2xl font-bold text-red-700">Error</h2>
          </div>
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
                <Star className="w-8 h-8 fill-white" />
                Cirugías Favoritas
              </h1>
              <p className="text-yellow-50 text-lg">
                Acceso rápido a tus procedimientos guardados
              </p>
            </div>
            {favorites.size > 0 && (
              <button
                onClick={clearAllFavorites}
                className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-semibold"
              >
                <Trash2 className="w-5 h-5" />
                Limpiar todos
              </button>
            )}
          </div>
        </div>

        {/* Contador */}
        {favorites.size > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
            <p className="text-yellow-900 font-semibold text-lg">
              ⭐ <span className="font-bold text-xl">{favorites.size}</span> cirugía{favorites.size > 1 ? 's' : ''} guardada{favorites.size > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Contenido */}
        {favorites.size === 0 ? (
          <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-16 text-center">
            <StarOff className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              No tienes favoritos aún
            </h3>
            <p className="text-gray-500 text-lg max-w-md mx-auto">
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
                  onToggleFavorite={() => removeFavorite(operation.codigo)}
                />
              ))}
            </div>
            <div className="mt-6 text-center">
              <p className="text-gray-600 font-semibold text-lg">
                📊 Mostrando {favoriteOperations.length} de {favorites.size}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-orange-900 mb-3">
              Favoritos no encontrados
            </h3>
            <p className="text-orange-700 text-lg mb-4">
              Hay {favorites.size} código{favorites.size > 1 ? 's' : ''} guardado{favorites.size > 1 ? 's' : ''}
            </p>
            <div className="bg-orange-100 p-3 rounded mb-4">
              <p className="text-orange-800 text-sm font-semibold mb-2">Códigos:</p>
              <p className="text-orange-700 text-xs font-mono">{Array.from(favorites).join(', ')}</p>
            </div>
            <button
              onClick={clearAllFavorites}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold"
            >
              Limpiar favoritos
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default FavoritesPage;