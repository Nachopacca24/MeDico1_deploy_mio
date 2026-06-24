//operations.tsx
import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { loadCSV } from "@/shared/utils/csvLoader";
import { ChevronDown, ChevronRight, Folder, FolderOpen, Search, Star, Stethoscope } from "lucide-react";
import { useFavorites } from "@/core/contexts/FavoritesContext";
import { ScrollToTop } from "@/shared/components/ui/scroll-to-top";
import { useToast } from "@/shared/hooks/useToast";
import { BetweenContentAd } from "@/shared/components/ads/BetweenContentAd";

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
    "Corazón": "Cardiovascular/Corazón.csv",
    "Vasos Periféricos": "Cardiovascular/Vasos_periféricos.csv",
    "Tórax": "Cardiovascular/torax.csv",
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
  Maxilofacial: {
    "Maxilofacial": "Maxilofacial/Maxilofacial.csv",
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
    "Brazo": "Ortopedia/Brazo.csv",
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
  onToggleFavorite,
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
    <div className="group relative rounded-lg p-4 bg-card border border-border border-l-[3px] border-l-primary/70 hover:border-primary hover:bg-primary/5 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <button
          onClick={onToggleFavorite}
          disabled={isLoading}
          className="p-1.5 hover:bg-accent rounded transition-colors disabled:opacity-50"
          title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Star
              className={`w-4 h-4 transition-colors ${
                isFavorite 
                  ? "fill-yellow-500 text-yellow-500" 
                  : "text-muted-foreground hover:text-yellow-500"
              }`}
            />
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
          <span className="text-muted-foreground">Especialidad</span>
          <span className="font-medium">{especialidad}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Grupo</span>
          <span className="font-medium">{grupo}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-muted-foreground">RVU</span>
          <span className="text-lg font-semibold">{rvu}</span>
        </div>
      </div>

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
  const [globalSearch, setGlobalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const [lastExpandedSubkey, setLastExpandedSubkey] = useState<string | null>(null);
  const procedureSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const itemsPerPage = 24;

  // Usar el contexto de favoritos
  const { favorites, toggleFavorite: toggleFavoriteContext } = useFavorites();
  const { toast } = useToast();

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
    } catch (error: any) {
      toast.error('Límite alcanzado', error?.message || 'Error al actualizar favorito.');
    } finally {
      setLoadingFavorite(null);
    }
  };

  useEffect(() => {
    async function fetchAllCSV() {
      try {
        setLoading(true);

        // Collect all (specialty, subName, csvPath) tuples
        const tasks: Array<{ specialty: string; subName: string; csvPath: string }> = [];
        for (const [specialty, subcategories] of Object.entries(folderStructure)) {
          for (const [subName, csvPath] of Object.entries(subcategories)) {
            tasks.push({ specialty, subName, csvPath });
          }
        }

        // Load all CSVs in parallel (cache makes re-visits instant)
        const results = await Promise.allSettled(
          tasks.map(({ csvPath }) => loadCSV(csvPath))
        );

        const data: Record<string, CSVOperation[]> = {};
        results.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            const { specialty, subName, csvPath } = tasks[i];
            data[csvPath] = result.value.map(op => ({
              ...op,
              especialidad: specialty,
              subespecialidad: subName,
            }));
          }
        });

        setCsvData(data);

        const allExpanded = Object.keys(folderStructure).reduce<Record<string, boolean>>(
          (acc, s) => ({ ...acc, [s]: true }), {}
        );
        setExpandedSpecialties(allExpanded);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar procedimientos');
      } finally {
        setLoading(false);
      }
    }
    fetchAllCSV();
  }, []);

  const toggleSpecialty = async (specialty: string) => {
    const isExpanding = !expandedSpecialties[specialty];
    setExpandedSpecialties(prev => ({
      ...prev,
      [specialty]: isExpanding
    }));

    if (isExpanding) {
      const subcategories = folderStructure[specialty as keyof typeof folderStructure];
      const newCsvData = { ...csvData };
      let updated = false;

      for (const [subName, csvPath] of Object.entries(subcategories)) {
        if (!newCsvData[csvPath]) {
          try {
            const csvContent = await loadCSV(csvPath);
            newCsvData[csvPath] = csvContent;
            updated = true;
          } catch (err) {
            console.error(`Error loading ${csvPath}:`, err);
          }
        }
      }

      if (updated) {
        setCsvData(newCsvData);
      }
    }
  };

  const toggleSubcategory = (key: string) => {
    const isOpening = !expandedSubcategories[key];
    setExpandedSubcategories(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    if (isOpening) {
      setLastExpandedSubkey(key);
    }
  };

  useEffect(() => {
    if (!lastExpandedSubkey) return;
    const el = procedureSectionRefs.current[lastExpandedSubkey];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
    setLastExpandedSubkey(null);
  }, [lastExpandedSubkey]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-start justify-center pt-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">Cargando procedimientos...</p>
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
        {/* Header with Search */}
        <div className="space-y-4 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-1 tracking-tight">Tabla de Códigos</h1>
              <div className="flex items-center gap-4 flex-wrap text-muted-foreground">
                <span>{Object.values(csvData).reduce((total, ops) => total + ops.length, 0)} procedimientos</span>
                {favorites.size > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4" />
                    {favorites.size} favorito{favorites.size !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Búsqueda y Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar procedimientos..."
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setCurrentPage(1);
                }}
                data-tutorial="procedures-search"
                className="w-full pl-10 pr-4 py-2.5 border-2 border-primary/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background font-medium placeholder:text-muted-foreground/60"
              />
            </div>
            <select
              value={specialtyFilter}
              onChange={(e) => {
                setSpecialtyFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border-2 border-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              <option value="all">Todas las Especialidades</option>
              {Object.keys(folderStructure).map(specialty => (
                <option key={specialty} value={specialty}>{specialty}</option>
              ))}
            </select>
          </div>

          {/* Recordatorio compacto */}
          <p className="text-xs text-muted-foreground">
            ¿No encontrás el código? Escríbenos a {' '}
            <a href="mailto:contacto@medicoapp.app" className="text-primary hover:underline font-medium">
              contacto@medicoapp.app
            </a>
            {' '}y lo agregamos, por que está es una app hecha por médicos, para médicos.
          </p>
        </div>

        {/* Folder Structure Navigation - Grid View */}
        <div>
          {/* Show message if no specialties match */}
          {Object.entries(folderStructure).every(([specialty]) => {
            if (specialtyFilter !== "all" && specialty !== specialtyFilter) {
              return true;
            }
            const subcategories = folderStructure[specialty as keyof typeof folderStructure];
            const hasSearchResults = globalSearch 
              ? Object.values(subcategories).some(csvPath => {
                  const operations = csvData[csvPath] || [];
                  return operations.some(op => 
                    op?.cirugia?.toLowerCase().includes(globalSearch.toLowerCase()) ||
                    op?.codigo?.toLowerCase().includes(globalSearch.toLowerCase()) ||
                    op?.especialidad?.toLowerCase().includes(globalSearch.toLowerCase())
                  );
                })
              : true;
            return !hasSearchResults;
          }) && (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron procedimientos
            </div>
          )}

          {/* Specialty Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(folderStructure).map(([specialty, subcategories]) => {
              // Filter by specialty if selected
              if (specialtyFilter !== "all" && specialty !== specialtyFilter) {
                return null;
              }

              // Check if specialty has any matching operations in search
              const hasSearchResults = globalSearch 
                ? Object.values(subcategories).some(csvPath => {
                    const operations = csvData[csvPath] || [];
                    return operations.some(op => 
                      op?.cirugia?.toLowerCase().includes(globalSearch.toLowerCase()) ||
                      op?.codigo?.toLowerCase().includes(globalSearch.toLowerCase()) ||
                      op?.especialidad?.toLowerCase().includes(globalSearch.toLowerCase())
                    );
                  })
                : true;

              if (!hasSearchResults) {
                return null;
              }

              // Count total operations in specialty
              const totalOpsInSpecialty = Object.values(subcategories).reduce((sum, csvPath) => {
                const allOps = csvData[csvPath] || [];
                const filteredOps = globalSearch 
                  ? allOps.filter(op => 
                      op?.cirugia?.toLowerCase().includes(globalSearch.toLowerCase()) ||
                      op?.codigo?.toLowerCase().includes(globalSearch.toLowerCase()) ||
                      op?.especialidad?.toLowerCase().includes(globalSearch.toLowerCase())
                    )
                  : allOps;
                return sum + filteredOps.length;
              }, 0);

              return (
                <div key={specialty} className="col-span-full">
                  {/* Specialty Card */}
                  <button
                    onClick={() => toggleSpecialty(specialty)}
                    className="w-full border rounded-lg p-6 hover:border-primary transition-colors bg-card text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        {expandedSpecialties[specialty] ? (
                          <FolderOpen className="w-8 h-8 text-primary" />
                        ) : (
                          <Folder className="w-8 h-8 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-1">{specialty}</h3>
                        <p className="text-sm text-muted-foreground">
                          {totalOpsInSpecialty} procedimiento{totalOpsInSpecialty !== 1 ? 's' : ''} • {Object.keys(subcategories).length} categoría{Object.keys(subcategories).length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {expandedSpecialties[specialty] ? (
                        <ChevronDown className="w-6 h-6 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Subcategories Grid */}
                  {expandedSpecialties[specialty] && (
                    <div className="mt-4 ml-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Object.entries(subcategories).map(([subName, csvPath]) => {
                          const allOperations = csvData[csvPath] || [];
                          const operations = globalSearch 
                            ? allOperations.filter(op => 
                                op?.cirugia?.toLowerCase().includes(globalSearch.toLowerCase()) ||
                                op?.codigo?.toLowerCase().includes(globalSearch.toLowerCase()) ||
                                op?.especialidad?.toLowerCase().includes(globalSearch.toLowerCase())
                              )
                            : allOperations;
                          
                          const subKey = `${specialty}-${subName}`;
                          
                          // Skip if no results in search
                          if (globalSearch && operations.length === 0) {
                            return null;
                          }
                          
                          return (
                            <button
                              key={subKey}
                              onClick={() => toggleSubcategory(subKey)}
                              className="border rounded-lg p-4 hover:border-primary transition-colors bg-card text-left group"
                            >
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-muted rounded group-hover:bg-primary/10 transition-colors">
                                  <Stethoscope className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm mb-1 truncate">{subName}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {operations.length} procedimiento{operations.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                {expandedSubcategories[subKey] ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Operations Grid - Shown for expanded subcategories */}
                      {Object.entries(subcategories).map(([subName, csvPath]) => {
                        const subKey = `${specialty}-${subName}`;
                        
                        if (!expandedSubcategories[subKey]) {
                          return null;
                        }

                        const allOperations = csvData[csvPath] || [];
                        const operations = globalSearch 
                          ? allOperations.filter(op => 
                              op?.cirugia?.toLowerCase().includes(globalSearch.toLowerCase()) ||
                              op?.codigo?.toLowerCase().includes(globalSearch.toLowerCase()) ||
                              op?.especialidad?.toLowerCase().includes(globalSearch.toLowerCase())
                            )
                          : allOperations;

                        return (
                          <div key={`ops-${subKey}`} className="space-y-3" ref={(el) => { procedureSectionRefs.current[subKey] = el; }}>
                            <div className="flex items-center gap-2 px-2">
                              <Stethoscope className="w-4 h-4 text-primary" />
                              <h4 className="font-semibold text-base">{subName}</h4>
                              <span className="text-sm text-muted-foreground">({operations.length})</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {operations.map((op, idx) => {
                                const codigo = String(op?.codigo || '').trim();
                                const isFav = favorites.has(codigo);
                                
                                return (
                                  <SimpleOperationCard
                                    key={`${codigo}-${idx}`}
                                    operation={op}
                                    index={idx}
                                    isFavorite={isFav}
                                    isLoading={loadingFavorite === codigo}
                                    onToggleFavorite={() => handleToggleFavorite(codigo, op)}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BetweenContentAd className="mt-6" />
      <ScrollToTop />
    </AppLayout>
  );
};

export default Operations;