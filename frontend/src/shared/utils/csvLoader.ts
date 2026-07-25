import Papa from "papaparse";

export const csvMap: Record<string, string> = {
  // Cardiovascular
  "Cardiovascular/Cardiovascular.csv": "surgeries/Cardiovascular/Cardiovascular.csv",
  "Cardiovascular/Corazón.csv": "surgeries/Cardiovascular/Corazón.csv",
  "Cardiovascular/Vasos_periféricos.csv": "surgeries/Cardiovascular/Vasos_periféricos.csv",
  "Cardiovascular/torax.csv": "surgeries/Cardiovascular/torax.csv",

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

  // Maxilofacial
  "Maxilofacial/Maxilofacial.csv": "surgeries/Maxilofacial/Maxilofacial.csv",

  // Neurocirugía
  "Neurocirugía/Neurocirugía.csv": "surgeries/Neurocirugía/Neurocirugía.csv",
  "Neurocirugía/Columna.csv": "surgeries/Neurocirugía/Columna.csv",
  "Neurocirugía/Cráneo_y_columna.csv": "surgeries/Neurocirugía/Cráneo_y_columna.csv",

  // Obstetricia
  "Obstetricia/Obstetricia.csv": "surgeries/Obstetricia/Obstetricia.csv",

  // Oftalmología
  "Oftalmología/Oftalmología.csv": "surgeries/Oftamología/Oftalmología.csv",

  // Ortopedia
  "Ortopedia/Ortopedia.csv": "surgeries/Ortopedia/Ortopedia.csv",
  "Ortopedia/Brazo.csv": "surgeries/Ortopedia/Brazo.csv",
  "Ortopedia/Cadera.csv": "surgeries/Ortopedia/Cadera.csv",
  "Ortopedia/Hombro.csv": "surgeries/Ortopedia/Hombro.csv",
  "Ortopedia/Muñeca_y_mano.csv": "surgeries/Ortopedia/Muñeca_y_mano.csv",
  "Ortopedia/Pie.csv": "surgeries/Ortopedia/Pie.csv",
  "Ortopedia/Yesos_y_ferulas.csv": "surgeries/Ortopedia/Yesos_y_ferulas.csv",
  "Ortopedia/ortopedia_injertos_implantes_replantacion.csv": "surgeries/Ortopedia/ortopedia_injertos_implantes_replantacion.csv",
  "Ortopedia/Artroscopia.csv": "surgeries/Ortopedia/Artroscopia.csv",

  // Otorrino
  "Otorrino/Laringe_y_traqueas.csv": "surgeries/Otorrino/Laringe_y_traqueas.csv",
  "Otorrino/Nariz_y_senos_paranasales.csv": "surgeries/Otorrino/Nariz_y_senos_paranasales.csv",
  "Otorrino/Otorrinolaringología.csv": "surgeries/Otorrino/Otorrinolaringología.csv",
  "Otorrino/torax.csv": "surgeries/Otorrino/torax.csv",

  // Procesos Variados
  "Procesos_variados/Cirugía_General.csv": "surgeries/Procesos_variados/Cirugía_General.csv",
  "Procesos_variados/Drenajes___Incisiones.csv": "surgeries/Procesos_variados/Drenajes___Incisiones.csv",
  "Procesos_variados/Reparaciones_(suturas).csv": "surgeries/Procesos_variados/Reparaciones_(suturas).csv",
  "Procesos_variados/Uñas___piel.csv": "surgeries/Procesos_variados/Uñas___piel.csv",

  // Urología
  "Urología/Urología.csv": "surgeries/Urologia/Urología.csv",

  // Plástica
  "Plastica/Plastica.csv": "surgeries/Plastica/Plastica.csv",

  // Anestesia
  "Anestesia/Espina_y_espalda.csv": "surgeries/Anestesia/Espina_y_espalda.csv",
  "Anestesia/Cabeza.csv": "surgeries/Anestesia/Cabeza.csv",
  "Anestesia/Cuello.csv": "surgeries/Anestesia/Cuello.csv",
  "Anestesia/Thorax.csv": "surgeries/Anestesia/Thorax.csv",
  "Anestesia/Brazo_y_codo.csv": "surgeries/Anestesia/Brazo_y_codo.csv",
  "Anestesia/Antebrazo_muñeca_y_mano.csv": "surgeries/Anestesia/Antebrazo_muñeca_y_mano.csv",
  "Anestesia/Radiological.csv": "surgeries/Anestesia/Radiological.csv",
  "Anestesia/Rodilla_y_Politeal.csv": "surgeries/Anestesia/Rodilla_y_Politeal.csv",
  "Anestesia/Pierna_superior.csv": "surgeries/Anestesia/Pierna_superior.csv",
  "Anestesia/Pierna_inferior.csv": "surgeries/Anestesia/Pierna_inferior.csv",
  "Anestesia/Hombro_y_axila.csv": "surgeries/Anestesia/Hombro_y_axila.csv",
  "Anestesia/Abdomen_inferior.csv": "surgeries/Anestesia/Abdomen_inferior.csv",
  "Anestesia/Abdomen_superior.csv": "surgeries/Anestesia/Abdomen_superior.csv",
};

// In-memory cache: survives navigation, cleared on full page reload
const csvCache = new Map<string, any[]>();

// Deduplicate in-flight requests: same CSV requested twice won't fetch twice
const inflightRequests = new Map<string, Promise<any[]>>();

export async function loadCSV(path: string): Promise<any[]> {
  if (csvCache.has(path)) return csvCache.get(path)!;
  if (inflightRequests.has(path)) return inflightRequests.get(path)!;

  const url = csvMap[path];
  if (!url) {
    throw new Error(`CSV no encontrado para la ruta: ${path}`);
  }

  const promise = (async () => {
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

    const data = parsed.data as any[];
    csvCache.set(path, data);
    return data;

  } catch (error) {
    console.error(`Error cargando ${path}:`, error);
    inflightRequests.delete(path);
    throw error;
  }
  })();

  inflightRequests.set(path, promise);
  const result = await promise;
  inflightRequests.delete(path);
  return result;
}