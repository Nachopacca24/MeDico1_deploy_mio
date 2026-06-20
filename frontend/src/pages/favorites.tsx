import { useEffect, useState } from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { loadCSV } from "@/shared/utils/csvLoader";
import { Star, StarOff, Building2, Shield, Stethoscope, Loader2 } from "lucide-react";
import { favoritesService, Favorite } from "@/services/favoritesService";
import { hospitalService } from "@/services/hospitalService";
import { insuranceService } from "@/services/insuranceService";
import { useFavorites } from "@/core/contexts/FavoritesContext";
import { useToast } from "@/shared/hooks/useToast";

const folderStructure = {
  Cardiovascular: {
    "Cardiovascular": "Cardiovascular/Cardiovascular.csv",
    "Corazón": "Cardiovascular/Corazón.csv",
    "Vasos Periféricos": "Cardiovascular/Vasos_periféricos.csv",
    "Tórax": "Cardiovascular/torax.csv",
  },
  Dermatología: { "Dermatología": "Dermatología/Dermatología.csv" },
  Digestivo: {
    "Digestivo": "Digestivo/Digestivo.csv",
    "Estómago e Intestino": "Digestivo/Estómago_e_intestino.csv",
    "Hígado y Páncreas": "Digestivo/Hígado_Páncreas.csv",
    "Peritoneo y Hernias": "Digestivo/Peritoneo_y_hernias.csv",
  },
  Endocrino: { "Endocrino": "Endocrino/Endocrino.csv" },
  Ginecología: { "Ginecología": "Ginecología/Ginecología.csv" },
  Mama: { "Mama": "Mama/Mama.csv" },
  Maxilofacial: { "Maxilofacial": "Maxilofacial/Maxilofacial.csv" },
  Neurocirugía: {
    "Neurocirugía": "Neurocirugía/Neurocirugía.csv",
    "Columna": "Neurocirugía/Columna.csv",
    "Cráneo y Columna": "Neurocirugía/Cráneo_y_columna.csv",
  },
  Obstetricia: { "Obstetricia": "Obstetricia/Obstetricia.csv" },
  Oftalmología: { "Oftalmología": "Oftalmología/Oftalmología.csv" },
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
  Plástica: { "Cirugía Plástica": "Plastica/Plastica.csv" },
  "Procesos Variados": {
    "Cirugía General": "Procesos_variados/Cirugía_General.csv",
    "Drenajes e Incisiones": "Procesos_variados/Drenajes___Incisiones.csv",
    "Reparaciones (Suturas)": "Procesos_variados/Reparaciones_(suturas).csv",
    "Uñas y Piel": "Procesos_variados/Uñas___piel.csv",
  },
  Urología: { "Urología": "Urología/Urología.csv" },
};

// ── Sección con título ────────────────────────────────────────────────────────
function Section({ icon, title, count, children }: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-primary/10 rounded-lg text-primary">{icon}</div>
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="ml-1 text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{count}</span>
      </div>
      {children}
    </div>
  );
}

// ── Tarjeta procedimiento ─────────────────────────────────────────────────────
function ProcedureCard({ op, isRemoving, onRemove }: {
  op: any; isRemoving: boolean; onRemove: () => void;
}) {
  return (
    <div className="border rounded-xl p-4 bg-card flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm leading-tight flex-1">{op.cirugia || 'Sin nombre'}</p>
        <button
          onClick={onRemove}
          disabled={isRemoving}
          className="p-1 rounded hover:bg-accent transition-colors disabled:opacity-50 shrink-0"
          title="Quitar de favoritos"
        >
          {isRemoving
            ? <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
            : <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />}
        </button>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{op.especialidad || '—'}</span>
        <span className="font-mono">{op.codigo}</span>
      </div>
      <div className="flex items-center justify-between text-xs pt-1 border-t">
        <span className="text-muted-foreground">RVU</span>
        <span className="font-bold text-base">{op.rvu || '0'}</span>
      </div>
    </div>
  );
}

// ── Tarjeta hospital/seguro ───────────────────────────────────────────────────
function SimpleCard({ name, isRemoving, onRemove }: {
  name: string; isRemoving: boolean; onRemove: () => void;
}) {
  return (
    <div className="border rounded-xl p-4 bg-card flex items-center justify-between gap-3">
      <p className="font-medium text-sm flex-1 leading-snug">{name}</p>
      <button
        onClick={onRemove}
        disabled={isRemoving}
        className="p-1 rounded hover:bg-accent transition-colors disabled:opacity-50 shrink-0"
        title="Quitar de favoritos"
      >
        {isRemoving
          ? <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
          : <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />}
      </button>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const FavoritesPage = () => {
  const { refreshFavorites } = useFavorites();
  const { toast } = useToast();

  const [procedures, setProcedures] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [insurances, setInsurances] = useState<any[]>([]);
  const [procedureFavs, setProcedureFavs] = useState<Favorite[]>([]);

  const [loading, setLoading] = useState(true);
  const [removingProcedure, setRemovingProcedure] = useState<number | null>(null);
  const [removingHospital, setRemovingHospital] = useState<number | null>(null);
  const [removingInsurance, setRemovingInsurance] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [apiFavs, favHospitals, allInsurances] = await Promise.all([
        favoritesService.getFavorites(),
        hospitalService.getFavoriteHospitals(),
        insuranceService.getInsurances(),
      ]);

      const favsArray: Favorite[] = Array.isArray(apiFavs) ? apiFavs : [];
      setProcedureFavs(favsArray);
      setHospitals(Array.isArray(favHospitals) ? favHospitals : []);
      setInsurances(Array.isArray(allInsurances) ? allInsurances.filter((i: any) => i.is_favorite) : []);

      if (favsArray.length === 0) {
        setProcedures([]);
        setLoading(false);
        return;
      }

      const favCodes = new Set(favsArray.map(f => String(f.surgery_code).trim()));
      const found: any[] = [];
      const foundCodes = new Set<string>();

      for (const subcategories of Object.values(folderStructure)) {
        for (const csvPath of Object.values(subcategories)) {
          try {
            const ops = await loadCSV(csvPath);
            ops.forEach((op: any) => {
              const code = String(op?.codigo || '').trim();
              if (favCodes.has(code) && !foundCodes.has(code)) {
                const fav = favsArray.find(f => String(f.surgery_code).trim() === code);
                found.push({ ...op, favorite_id: fav?.id });
                foundCodes.add(code);
              }
            });
          } catch { /* skip */ }
        }
      }

      setProcedures(found);
    } catch {
      toast.error('Error', 'No se pudieron cargar los favoritos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const removeProcedure = async (favoriteId: number) => {
    setRemovingProcedure(favoriteId);
    try {
      await favoritesService.removeFavorite(favoriteId);
      await refreshFavorites();
      setProcedures(prev => prev.filter(p => p.favorite_id !== favoriteId));
      setProcedureFavs(prev => prev.filter(f => f.id !== favoriteId));
    } catch {
      toast.error('Error', 'No se pudo quitar el favorito.');
    } finally {
      setRemovingProcedure(null);
    }
  };

  const removeHospital = async (hospitalId: number) => {
    setRemovingHospital(hospitalId);
    try {
      await hospitalService.unfavoriteHospital(hospitalId);
      setHospitals(prev => prev.filter(h => h.id !== hospitalId));
    } catch {
      toast.error('Error', 'No se pudo quitar el hospital.');
    } finally {
      setRemovingHospital(null);
    }
  };

  const removeInsurance = async (insuranceId: number) => {
    setRemovingInsurance(insuranceId);
    try {
      await insuranceService.unfavoriteInsurance(insuranceId);
      setInsurances(prev => prev.filter(i => i.id !== insuranceId));
    } catch {
      toast.error('Error', 'No se pudo quitar el seguro.');
    } finally {
      setRemovingInsurance(null);
    }
  };

  const total = procedures.length + hospitals.length + insurances.length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-start justify-center pt-24">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-yellow-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando favoritos...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8" data-tutorial="favorites-list">

        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mis Favoritos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{total} elemento{total !== 1 ? 's' : ''} guardado{total !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {total === 0 ? (
          <div className="border-2 border-dashed rounded-2xl p-16 text-center">
            <StarOff className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aún no tenés favoritos</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Guardá procedimientos, hospitales y seguros con la estrella ⭐ para encontrarlos rápido acá.
            </p>
          </div>
        ) : (
          <>
            {/* Procedimientos */}
            {procedures.length > 0 && (
              <Section icon={<Stethoscope className="w-4 h-4" />} title="Procedimientos" count={procedures.length}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {procedures.map((op, i) => (
                    <ProcedureCard
                      key={`proc-${op.codigo}-${i}`}
                      op={op}
                      isRemoving={removingProcedure === op.favorite_id}
                      onRemove={() => removeProcedure(op.favorite_id)}
                    />
                  ))}
                </div>
              </Section>
            )}

            {/* Hospitales */}
            {hospitals.length > 0 && (
              <Section icon={<Building2 className="w-4 h-4" />} title="Hospitales" count={hospitals.length}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {hospitals.map(h => (
                    <SimpleCard
                      key={`hosp-${h.id}`}
                      name={h.name}
                      isRemoving={removingHospital === h.id}
                      onRemove={() => removeHospital(h.id)}
                    />
                  ))}
                </div>
              </Section>
            )}

            {/* Seguros */}
            {insurances.length > 0 && (
              <Section icon={<Shield className="w-4 h-4" />} title="Seguros" count={insurances.length}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {insurances.map(ins => (
                    <SimpleCard
                      key={`ins-${ins.id}`}
                      name={ins.name}
                      isRemoving={removingInsurance === ins.id}
                      onRemove={() => removeInsurance(ins.id)}
                    />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default FavoritesPage;
