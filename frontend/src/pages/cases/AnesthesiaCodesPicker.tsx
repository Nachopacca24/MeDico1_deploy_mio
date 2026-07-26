import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Stethoscope, Search, Loader2, Trash2, Star } from "lucide-react";
import { loadCSV } from "@/shared/utils/csvLoader";
import { favoritesService, type Favorite } from "@/services/favoritesService";
import { useToast } from "@/shared/hooks/useToast";

const ANESTHESIA_CSVS = [
  "Anestesia/Espina_y_espalda.csv",
  "Anestesia/Cabeza.csv",
  "Anestesia/Cuello.csv",
  "Anestesia/Thorax.csv",
  "Anestesia/Intrathoracic.csv",
  "Anestesia/Brazo_y_codo.csv",
  "Anestesia/Antebrazo_muñeca_y_mano.csv",
  "Anestesia/Radiological.csv",
  "Anestesia/Rodilla_y_Politeal.csv",
  "Anestesia/Pierna_superior.csv",
  "Anestesia/Pierna_inferior.csv",
  "Anestesia/Hombro_y_axila.csv",
  "Anestesia/Abdomen_inferior.csv",
  "Anestesia/Abdomen_superior.csv",
];

export interface CsvRow {
  codigo: string;
  cirugia: string;
  nombre?: string;
  rvu?: string;
  minutos?: string;
  especialidad: string;
  grupo: string;
}

export interface AnesthesiaPickedItem {
  key: string;
  surgery_code: string;
  surgery_name: string;
  base_units: number;
}

interface Props {
  items: AnesthesiaPickedItem[];
  onAdd: (row: CsvRow) => void | Promise<void>;
  onRemove: (key: string) => void | Promise<void>;
}

export function AnesthesiaCodesPicker({ items, onAdd, onRemove }: Props) {
  const { toast } = useToast();
  const [allCodes, setAllCodes] = useState<CsvRow[]>([]);
  const [codeSearch, setCodeSearch] = useState("");
  const [codeResults, setCodeResults] = useState<CsvRow[]>([]);
  const [addingCode, setAddingCode] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [showFavorites, setShowFavorites] = useState(true);
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(ANESTHESIA_CSVS.map(k => loadCSV(k).catch(() => [] as CsvRow[]))).then(results => {
      setAllCodes(results.flat() as CsvRow[]);
    });
  }, []);

  useEffect(() => {
    favoritesService.getFavorites()
      .then(setFavorites)
      .catch(() => {})
      .finally(() => setLoadingFavorites(false));
  }, []);

  useEffect(() => {
    const q = codeSearch.trim().toLowerCase();
    if (!q) { setCodeResults([]); return; }
    setCodeResults(
      allCodes
        .filter(r => r.codigo?.toLowerCase().includes(q) || (r.cirugia || r.nombre || '').toLowerCase().includes(q))
        .slice(0, 20)
    );
  }, [codeSearch, allCodes]);

  const favoriteCodesSet = useMemo(() => new Set(favorites.map(f => f.surgery_code)), [favorites]);
  const favoriteRows = useMemo(
    () => allCodes.filter(r => r.codigo && favoriteCodesSet.has(r.codigo)),
    [allCodes, favoriteCodesSet]
  );
  const existingCodes = useMemo(() => new Set(items.map(i => i.surgery_code)), [items]);

  const handleAdd = async (row: CsvRow) => {
    if (!row.codigo || addingCode) return;
    if (existingCodes.has(row.codigo)) {
      toast.error("Ese código ya está agregado");
      return;
    }
    setAddingCode(true);
    try {
      await onAdd(row);
      setCodeSearch("");
      setCodeResults([]);
    } catch (e: any) {
      toast.error(e?.message || "Error al agregar código");
    } finally {
      setAddingCode(false);
    }
  };

  const handleRemove = async (key: string) => {
    setRemovingKey(key);
    try {
      await onRemove(key);
    } catch (e: any) {
      toast.error(e?.message || "Error al eliminar código");
    } finally {
      setRemovingKey(null);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, row: CsvRow) => {
    e.stopPropagation();
    if (!row.codigo) return;
    setTogglingFavorite(row.codigo);
    try {
      if (favoriteCodesSet.has(row.codigo)) {
        await favoritesService.removeFavoriteByCode(row.codigo);
        setFavorites(prev => prev.filter(f => f.surgery_code !== row.codigo));
      } else {
        const fav = await favoritesService.addFavorite({
          surgery_code: row.codigo,
          surgery_name: row.cirugia || row.nombre,
          specialty: row.especialidad,
        });
        setFavorites(prev => [...prev, fav]);
      }
    } catch {
      toast.error("No se pudo actualizar el favorito");
    } finally {
      setTogglingFavorite(null);
    }
  };

  return (
    <Card className="border-teal-200 dark:border-teal-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400 text-base">
          <Stethoscope className="w-4 h-4" />
          Códigos de anestesia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Favorites — reserva espacio mientras carga para evitar layout shift */}
        {loadingFavorites ? (
          <div className="h-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando procedimientos frecuentes...
          </div>
        ) : favoriteRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                Procedimientos Frecuentes ({favoriteRows.length})
              </span>
              <button
                type="button"
                onClick={() => setShowFavorites(v => !v)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                {showFavorites ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {showFavorites && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                {favoriteRows.map(r => (
                  <button
                    key={r.codigo}
                    type="button"
                    onClick={() => handleAdd(r)}
                    disabled={addingCode}
                    className="text-left p-2.5 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors border border-transparent hover:border-yellow-300 disabled:opacity-50 min-w-0"
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.cirugia || r.nombre}</div>
                        <div className="text-xs text-muted-foreground truncate">Código: {r.codigo}</div>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-teal-700 dark:text-teal-400">{r.rvu} uds</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-sm font-medium mb-1 block">Agregar código</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={codeSearch}
              onChange={e => setCodeSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
              placeholder="Buscar por código o descripción..."
              className="w-full border rounded-md pl-9 pr-3 py-2 text-sm bg-background focus:ring-2 focus:ring-teal-400 outline-none"
            />
          </div>
          {codeResults.length > 0 && (
            <div className="mt-1 border rounded-md overflow-hidden max-h-52 overflow-y-auto">
              {codeResults.map(r => (
                <div key={r.codigo} className="flex items-center gap-1 border-b last:border-0 min-w-0">
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left px-3 py-2 hover:bg-teal-50 dark:hover:bg-teal-950 flex items-center justify-between gap-2"
                    onClick={() => handleAdd(r)}
                    disabled={addingCode}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground">{r.codigo}</span>
                      <span className="ml-2 text-sm">{r.cirugia || r.nombre}</span>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-teal-700 bg-teal-100 dark:bg-teal-900 dark:text-teal-300">
                      {r.rvu} uds
                    </Badge>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, r)}
                    disabled={togglingFavorite === r.codigo}
                    className="p-2 mr-1 shrink-0 hover:text-yellow-500 transition-colors disabled:opacity-50"
                    title={r.codigo && favoriteCodesSet.has(r.codigo) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  >
                    {togglingFavorite === r.codigo
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Star className={`h-4 w-4 ${r.codigo && favoriteCodesSet.has(r.codigo) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">Procedimientos agregados</div>
            {items.map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg border-teal-100 dark:border-teal-900">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.surgery_name}</div>
                  <div className="text-xs text-muted-foreground">Código: {item.surgery_code}</div>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <Badge variant="secondary" className="text-teal-700 bg-teal-100 dark:bg-teal-900 dark:text-teal-300">
                    {item.base_units} uds
                  </Badge>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.key)}
                    disabled={removingKey === item.key}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    {removingKey === item.key
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Sin códigos aún — buscá arriba para agregar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
