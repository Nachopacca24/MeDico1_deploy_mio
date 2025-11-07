//operations.tsx
import { useEffect, useState } from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { loadCSV } from "@/shared/utils/csvLoader";
import { ChevronDown, ChevronRight, Folder, FolderOpen, Calculator, Star } from "lucide-react";
import { useFavorites } from "@/core/contexts/FavoritesContext";

// Tipo para las operaciones del CSV
interface CSVOperation {
  codigo?: string;
  cirugia?: string;
  rvu?: string;
  especialidad?: string;
  grupo?: string;
  [key: string]: any;
}

// ✅ Estructura completa sincronizada con csvLoader.ts
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

// Tarjeta de operación
export function SimpleOperationCard({ 
  operation, 
  index, 
  isFavorite, 
  isLoading,
  onToggleFavorite 
}: { 
  operation: any; 
  index: number;
  isFavorite: boolean;
  isLoading: boolean;
  onToggleFavorite: () => void;
}) {
  const codigo = String(operation?.codigo || 'N/A').trim();
  const cirugia = operation?.cirugia || 'Sin nombre';
  const rvu = operation?.rvu || '0';
  const especialidad = operation?.especialidad || 'N/A';
  const grupo = operation?.grupo || 'N/A';
  
  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow hover:shadow-lg transition-all relative">
      {/* Botón de favorito en la esquina superior izquierda */}
      <button
        onClick={onToggleFavorite}
        disabled={isLoading}
        className="absolute top-3 left-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
        title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Star
            className={`w-5 h-5 transition-colors ${
              isFavorite 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-gray-400 hover:text-yellow-400"
            }`}
          />
        )}
      </button>

      {/* Código en la esquina superior derecha */}
      <div className="flex justify-end mb-2">
        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
          {codigo}
        </span>
      </div>
      
      {/* Título de la cirugía */}
      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3 pr-8">
        {cirugia}
      </h3>
      
      {/* Información */}
      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
        <p>
          <span className="font-semibold text-gray-600 dark:text-gray-400">Especialidad:</span>{' '}
          <span className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
            {especialidad}
          </span>
        </p>
        <p>
          <span className="font-semibold text-gray-600 dark:text-gray-400">Grupo:</span>{' '}
          <span className="bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
            {grupo}
          </span>
        </p>
        <p>
          <span className="font-semibold text-gray-600 dark:text-gray-400">RVU:</span>{' '}
          <span className="ml-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded font-bold text-base">
            {rvu}
          </span>
        </p>
      </div>
      
      {/* Botón */}
      <button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold">
        <Calculator className="w-4 h-4" />
        Calcular Valor
      </button>
    </div>
  );
}

const Operations = () => {
  const [csvData, setCsvData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSpecialties, setExpandedSpecialties] = useState<Record<string, boolean>>({});
  const [expandedSubcategories, setExpandedSubcategories] = useState<Record<string, boolean>>({});
  const [loadingFavorite, setLoadingFavorite] = useState<string | null>(null);
  
  // Usar el contexto de favoritos
  const { favorites, toggleFavorite: toggleFavoriteContext } = useFavorites();

  // Toggle favorito usando el contexto
  const handleToggleFavorite = async (codigo: string, operation: any) => {
    const normalizedCode = String(codigo).trim();
    setLoadingFavorite(normalizedCode);
    
    try {
      await toggleFavoriteContext(
        normalizedCode,
        operation?.cirugia || '',
        operation?.especialidad || ''
      );
    } catch (error) {
      alert('Error al actualizar favorito. Por favor intenta de nuevo.');
    } finally {
      setLoadingFavorite(null);
    }
  };

  useEffect(() => {
    async function fetchAllCSV() {
      try {
        const data: Record<string, any[]> = {};
        
        for (const [specialty, subcategories] of Object.entries(folderStructure)) {
          for (const [subName, csvPath] of Object.entries(subcategories)) {
            const csvContent = await loadCSV(csvPath);
            data[csvPath] = csvContent;
          }
        }
        
        setCsvData(data);
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAllCSV();
  }, []);

  const toggleSpecialty = (specialty: string) => {
    setExpandedSpecialties(prev => ({
      ...prev,
      [specialty]: !prev[specialty]
    }));
  };

  const toggleSubcategory = (key: string) => {
    setExpandedSubcategories(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">Cargando cirugías...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-8 m-8">
          <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-4">❌ Error</h2>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-lg p-6 shadow-lg">
          <h1 className="text-3xl font-bold text-white mb-2">
            Base de Datos de Cirugías
          </h1>
          <p className="text-blue-100 dark:text-blue-200 flex items-center gap-2">
            {Object.values(csvData).reduce((total, ops) => total + ops.length, 0)} cirugías disponibles
            {favorites.size > 0 && (
              <span className="ml-4 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-sm font-bold">
                ⭐ {favorites.size} favorito{favorites.size !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        {/* Navegación por carpetas */}
        <div className="space-y-4">
          {Object.entries(folderStructure).map(([specialty, subcategories]) => (
            <div key={specialty} className="border dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-md">
              {/* Especialidad */}
              <button
                onClick={() => toggleSpecialty(specialty)}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-900 text-white transition-colors"
              >
                {expandedSpecialties[specialty] ? (
                  <ChevronDown className="w-6 h-6" />
                ) : (
                  <ChevronRight className="w-6 h-6" />
                )}
                <Folder className="w-6 h-6" />
                <span className="font-bold text-lg">{specialty}</span>
              </button>

              {/* Subcategorías */}
              {expandedSpecialties[specialty] && (
                <div className="bg-gray-50 dark:bg-gray-900">
                  {Object.entries(subcategories).map(([subName, csvPath]) => {
                    const operations = csvData[csvPath] || [];
                    const subKey = `${specialty}-${subName}`;
                    
                    return (
                      <div key={subKey} className="border-t dark:border-gray-700">
                        {/* Subcategoría */}
                        <button
                          onClick={() => toggleSubcategory(subKey)}
                          className="w-full flex items-center gap-3 p-3 pl-8 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          {expandedSubcategories[subKey] ? (
                            <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          )}
                          <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="font-semibold text-gray-900 dark:text-white">{subName}</span>
                          <span className="ml-auto bg-blue-600 dark:bg-blue-700 text-white px-3 py-1 rounded-full text-sm font-bold">
                            {operations.length}
                          </span>
                        </button>

                        {/* Tarjetas de operaciones */}
                        {expandedSubcategories[subKey] && (
                          <div className="p-6 bg-white dark:bg-gray-800">
                            {operations.length === 0 ? (
                              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                                No hay cirugías en esta categoría
                              </p>
                            ) : (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {operations.map((op, idx) => {
                                    const codigo = String(op?.codigo || '').trim();
                                    const isFav = favorites.has(codigo);
                                    
                                    return (
                                      <SimpleOperationCard
                                        key={idx}
                                        operation={op}
                                        index={idx}
                                        isFavorite={isFav}
                                        isLoading={loadingFavorite === codigo}
                                        onToggleFavorite={() => handleToggleFavorite(codigo, op)}
                                      />
                                    );
                                  })}
                                </div>

                                <p className="mt-6 text-center text-gray-600 dark:text-gray-400 font-semibold">
                                  📊 Mostrando {operations.length} cirugías
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Operations;