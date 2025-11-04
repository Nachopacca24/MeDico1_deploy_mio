import { useEffect, useState } from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { loadCSV } from "@/utils/csvLoader";
import { ChevronDown, ChevronRight, Folder, FolderOpen, Calculator } from "lucide-react";

// Tipo para las operaciones del CSV
interface CSVOperation {
  codigo?: string;
  cirugia?: string;
  rvu?: string;
  especialidad?: string;
  grupo?: string;
  [key: string]: any;
}

const folderStructure = {
  Cardiovascular: {
    "Cardiovascular": "Cardiovascular/Cardiovascular.csv",
    "Corazón": "Cardiovascular/Corazón.csv",
    "Vasos Periféricos": "Cardiovascular/Vasos_periféricos.csv",
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
  },
  Otorrino: {
    "Otorrino": "Otorrino/Otorrino.csv",
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
  "Sin Clasificación": {
    "Sin Clasificación": "Sin_clasificación.csv",
  },
  Demartología: {
    Demartología: "Dermatologia/Dermatología.csv",
  },
  Digestivo: {
    "Estómago e Intestino": "Digestivo/Estómagp_e_intestino.csv",
    "Peritoneo y Hernias": "Digestivo/Peritoneo_y_hernias.csv",
    "Hígado & Páncreas": "Digestivo/Hígado_Páncreas.csv",
  },
  Endocrino: {
    Endocrino: "Endocrino/Endocrino.csv",
  },
  Ginecologia: {
    Ginecología: "Ginecología/Ginecología.csv",
  },

  Mama: {
    Mama: "Mama/Mama.csv",
  },
  Neurocirugía: {
    "Columna vertebral": "Neurocirugía/Columna_vertebral.csv",
    "Cráneo y Columna": "Neurocirugía/Cráneo_y_columna.csv",
  },
  Obstetricia: {
    Obstetricia: "Obstercia/Obstetricia.csv",
  },
  Oftalmología: {
    Oftalmología: "Oftamología/Oftalmología.csv",
  },

  Ortopedia: {
    Cadera: "Ortopedia/Cadera.csv",
    Hombro: "Ortopedia/Hombro.csv",
    "Muñeca y Mano": "Ortopedia/Muñeca_y_mano.csv",
    Pie: "Ortopedia/Pie.csv",
  },

  Otorrino: {
    Otorrino: "Otorrino/Otorrino.csv",
  },

  "Procesos variados": {
    "Cirugía general": "Procesos_variados/Cirugía_General.csv",
    "Drenajes e incisiones": "Procesos_variados/Drenajes_incisiones.csv",
    "Reparaciones y suturas": "Procesos_varaidos/Reparaciones_(suturas).csv",
    "Uñas y piel": "Procesos_varaidos/Uñas___piel.csv",
  },

  Urologia: {
    Urología: "Urologia/Urología.csv",
  },
  "Sin clasificación": {
    "Sin clasificación": "Sin_clasificacion/Sin_clasificación.csv",
  },




  
};

// Tarjeta de operación
function SimpleOperationCard({ operation, index }: { operation: any; index: number }) {
  const codigo = operation?.codigo || 'N/A';
  const cirugia = operation?.cirugia || 'Sin nombre';
  const rvu = operation?.rvu || '0';
  const especialidad = operation?.especialidad || 'N/A';
  const grupo = operation?.grupo || 'N/A';
  
  return (
    <div className="border rounded-lg p-4 bg-white shadow hover:shadow-lg transition-shadow">
      {/* Código en la esquina superior derecha */}
      <div className="flex justify-end mb-2">
        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
          {codigo}
        </span>
      </div>
      
      {/* Título de la cirugía */}
      <h3 className="font-bold text-lg text-gray-900 mb-3">
        {cirugia}
      </h3>
      
      {/* Información */}
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

  useEffect(() => {
    async function fetchAllCSV() {
      console.log("🚀 Iniciando carga de CSVs...");
      
      try {
        const data: Record<string, any[]> = {};
        
        for (const [specialty, subcategories] of Object.entries(folderStructure)) {
          for (const [subName, csvPath] of Object.entries(subcategories)) {
            const csvContent = await loadCSV(csvPath);
            data[csvPath] = csvContent;
            console.log(`✅ ${csvPath}: ${csvContent.length} cirugías cargadas`);
          }
        }
        
        console.log("🎉 Todos los CSVs cargados exitosamente");
        setCsvData(data);
        
      } catch (err: any) {
        console.error("💥 ERROR:", err);
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
            <p className="text-xl font-semibold text-gray-700">Cargando cirugías...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 m-8">
          <h2 className="text-2xl font-bold text-red-700 mb-4">❌ Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 shadow-lg">
          <h1 className="text-3xl font-bold text-white mb-2">
            Base de Datos de Cirugías
          </h1>
          <p className="text-blue-100">
            {Object.values(csvData).reduce((total, ops) => total + ops.length, 0)} cirugías disponibles
          </p>
        </div>

        {/* Navegación por carpetas */}
        <div className="space-y-4">
          {Object.entries(folderStructure).map(([specialty, subcategories]) => (
            <div key={specialty} className="border rounded-lg overflow-hidden bg-white shadow-md">
              {/* Especialidad */}
              <button
                onClick={() => toggleSpecialty(specialty)}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-colors"
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
                <div className="bg-gray-50">
                  {Object.entries(subcategories).map(([subName, csvPath]) => {
                    const operations = csvData[csvPath] || [];
                    const subKey = `${specialty}-${subName}`;
                    
                    return (
                      <div key={subKey} className="border-t">
                        {/* Subcategoría */}
                        <button
                          onClick={() => toggleSubcategory(subKey)}
                          className="w-full flex items-center gap-3 p-3 pl-8 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          {expandedSubcategories[subKey] ? (
                            <ChevronDown className="w-5 h-5 text-blue-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                          )}
                          <FolderOpen className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-gray-900">{subName}</span>
                          <span className="ml-auto bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                            {operations.length}
                          </span>
                        </button>

                        {/* Tarjetas de operaciones */}
                        {expandedSubcategories[subKey] && (
                          <div className="p-6 bg-white">
                            {operations.length === 0 ? (
                              <p className="text-center text-gray-500 py-8">
                                No hay cirugías en esta categoría
                              </p>
                            ) : (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {operations.map((op, idx) => (
                                    <SimpleOperationCard
                                      key={idx}
                                      operation={op}
                                      index={idx}
                                    />
                                  ))}
                                </div>

                                <p className="mt-6 text-center text-gray-600 font-semibold">
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