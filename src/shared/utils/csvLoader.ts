import Papa from "papaparse";

export const csvMap: Record<string, string> = {
  // Cardiovascular
  "Cardiovascular/Cardiovascular.csv": "surgeries/Cardiovascular/Cardiovascular.csv",
  "Cardiovascular/Corazón.csv": "surgeries/Cardiovascular/Corazón.csv",
  "Cardiovascular/Vasos_periféricos.csv": "surgeries/Cardiovascular/Vasos_periféricos.csv",
  
  // Dermatología
  "Dermatología/Dermatología.csv": "surgeries/Dermatología/Dermatología.csv",
  
  // Digestivo
  "Digestivo/Digestivo.csv": "surgeries/Digestivo/Digestivo.csv",
  "Digestivo/Estómago_e_intestino.csv": "surgeries/Digestivo/Estómago_e_intestino.csv",
  "Digestivo/Hígado_Páncreas.csv": "surgeries/Digestivo/Hígado_Páncreas.csv",
  "Digestivo/Peritoneo_y_hernias.csv": "surgeries/Digestivo/Peritoneo_y_hernias.csv",
  
  // Endocrino
  "Endocrino/Endocrino.csv": "surgeries/Endocrino/Endocrino.csv",
  
  // Ginecología
  "Ginecología/Ginecología.csv": "surgeries/Ginecología/Ginecología.csv",
  
  // Mama
  "Mama/Mama.csv": "surgeries/Mama/Mama.csv",
  
  // Neurocirugía
  "Neurocirugía/Neurocirugía.csv": "surgeries/Neurocirugía/Neurocirugía.csv",
  "Neurocirugía/Columna.csv": "surgeries/Neurocirugía/Columna.csv",
  "Neurocirugía/Cráneo_y_columna.csv": "surgeries/Neurocirugía/Cráneo_y_columna.csv",
  
  // Obstetricia
  "Obstetricia/Obstetricia.csv": "surgeries/Obstercia/Obstetricia.csv",
  
  // Oftalmología
  "Oftalmología/Oftalmología.csv": "surgeries/Oftamología/Oftalmología.csv",
  
  // Ortopedia
  "Ortopedia/Ortopedia.csv": "surgeries/Ortopedia/Ortopedia.csv",
  "Ortopedia/Cadera.csv": "surgeries/Ortopedia/Cadera.csv",
  "Ortopedia/Hombro.csv": "surgeries/Ortopedia/Hombro.csv",
  "Ortopedia/Muñeca_y_mano.csv": "surgeries/Ortopedia/Muñeca_y_mano.csv",
  "Ortopedia/Pie.csv": "surgeries/Ortopedia/Pie.csv",
  
  // Otorrino
  "Otorrino/Otorrino.csv": "surgeries/Otorrino/Otorrino.csv",
  
  // Procesos Variados
  "Procesos_variados/Cirugía_General.csv": "surgeries/Procesos_variados/Cirugía_General.csv",
  "Procesos_variados/Drenajes___Incisiones.csv": "surgeries/Procesos_variados/Drenajes___Incisiones.csv",
  "Procesos_variados/Reparaciones_(suturas).csv": "surgeries/Procesos_variados/Reparaciones_(suturas).csv",
  "Procesos_variados/Uñas___piel.csv": "surgeries/Procesos_variados/Uñas___piel.csv",
  
  // Urología
  "Urología/Urología.csv": "surgeries/Urologia/Urología.csv",
  
  // Sin clasificación
  "Sin_clasificación.csv": "surgeries/Sin_clasificación.csv",
};

export async function loadCSV(path: string) {
  const url = csvMap[path];
  if (!url) {
    throw new Error(`CSV no encontrado para la ruta: ${path}`);
  }

  try {
    const response = await fetch(`/${url}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: No se pudo cargar ${url}`);
    }

    const text = await response.text();

    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      throw new Error(`El archivo ${url} no existe o no es un CSV válido`);
    }

    const parsed = Papa.parse(text, { 
      header: true, 
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (header) => header.trim()
    });

    return parsed.data;
    
  } catch (error) {
    console.error(`Error cargando ${path}:`, error);
    throw error;
  }
}