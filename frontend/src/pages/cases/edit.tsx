//src/pages/cases/edit.tsx
import { useState, useEffect, useMemo } from 'react';
const API_URL = import.meta.env.VITE_API_URL || '';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { BetweenContentAd } from '@/shared/components/ads/BetweenContentAd';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/useToast';
import { authService } from '@/shared/services/authService';
import { surgicalCaseService } from '@/services/surgicalCaseService';
import { hospitalService, type Hospital } from '@/services/hospitalService';
import { insuranceService, type InsuranceCompany } from '@/services/insuranceService';
import { colleaguesService } from '@/services/colleaguesService';
import { loadCSV } from '@/shared/utils/csvLoader';
import { favoritesService } from '@/services/favoritesService';
import { Loader2, Plus, X, Search, Calendar, User, Building2, Stethoscope, Star, Users, ArrowLeft, AlertCircle, ImagePlus, Images } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import type { PatientGender } from '@/types/surgical-case';


interface ProcedureData {
  codigo: string;
  cirugia: string;
  especialidad: string;
  subespecialidad?: string;
  grupo: string;
  rvu: number;
}

interface SelectedProcedure {
  surgery_code: string;
  surgery_name: string;
  specialty: string;
  grupo: string;
  rvu: number;
  notes: string;
}

interface Colleague {
  id: number;
  full_name: string;
  specialty?: string;
}

const EditCase = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const isPremium = user?.plan === 'premium' || user?.is_permanent_premium;

  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - pendingImages.length;
    const toAdd = files.slice(0, remaining);
    setPendingImages(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPendingPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  };

  const removePendingImage = (idx: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== idx));
    setPendingPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  // Form state
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<PatientGender | ''>('');
  const [hospitalId, setHospitalId] = useState('');
  const [surgeryDate, setSurgeryDate] = useState('');
  const [surgeryTime, setSurgeryTime] = useState('');
  const [surgeryEndTime, setSurgeryEndTime] = useState('');
  const [rateMultiplier, setRateMultiplier] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [insuranceId, setInsuranceId] = useState('');
  const [insurances, setInsurances] = useState<InsuranceCompany[]>([]);
  const [status, setStatus] = useState<'scheduled' | 'completed' | 'billed' | 'paid' | 'cancelled'>('scheduled');

  // Assistant doctor state
  const [assistantType, setAssistantType] = useState<'colleague' | 'manual' | 'none'>('none');
  const [selectedColleagueId, setSelectedColleagueId] = useState<number | null>(null);
  const [manualAssistantName, setManualAssistantName] = useState('');

  // Procedure selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProcedures, setSelectedProcedures] = useState<SelectedProcedure[]>([]);
  const [showProcedureSearch, setShowProcedureSearch] = useState(false);

  // Data state
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [allProcedures, setAllProcedures] = useState<ProcedureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para favoritos
  const [favoriteProcedures, setFavoriteProcedures] = useState<ProcedureData[]>([]);
  const [showFavorites, setShowFavorites] = useState(true);
  const [loadingFavoriteRvu, setLoadingFavoriteRvu] = useState<string | null>(null);
  const [loadingAllProcedures, setLoadingAllProcedures] = useState(false);

  // ✅ CARGA INICIAL: Hospitales, colegas, favoritos Y caso (UNA VEZ)
  useEffect(() => {
    const loadInitialData = async () => {
      if (!id) return;

      try {
        console.log("[EditCase] Cargando datos iniciales...");
        setLoading(true);

        // Cargar hospitales, colegas, favoritos, seguros Y caso en paralelo
        const [hospitalsData, colleaguesData, favoritesData, insurancesData, caseData] = await Promise.all([
          hospitalService.getHospitals(),
          colleaguesService.getColleagues(),
          favoritesService.getFavorites(),
          insuranceService.getInsurances(),
          surgicalCaseService.getCase(parseInt(id))
        ]);

        setHospitals(hospitalsData);
        setColleagues(colleaguesData.colleagues);
        setInsurances(insurancesData);

        // Convertir favoritos a formato de procedimientos
        const favProcs: ProcedureData[] = favoritesData.map(fav => ({
          codigo: fav.surgery_code,
          cirugia: fav.surgery_name || fav.surgery_code,
          especialidad: fav.specialty || 'General',
          subespecialidad: undefined,
          grupo: '',
          rvu: 0 // Se cargará on-demand
        }));

        setFavoriteProcedures(favProcs);

        setPatientName(caseData.patient_name);
        setPatientId(caseData.patient_id || '');
        setPatientAge(caseData.patient_age?.toString() || '');
        setPatientGender(caseData.patient_gender || '');
        setHospitalId(caseData.hospital?.toString() || '');
        setSurgeryDate(caseData.surgery_date);
        setSurgeryTime(caseData.surgery_time || '');
        setSurgeryEndTime(caseData.surgery_end_time || '');
        setDiagnosis(caseData.diagnosis || '');
        setNotes(caseData.notes || '');
        setInsuranceId(caseData.insurance_company ? String(caseData.insurance_company) : '');
        setStatus((caseData.status?.toLowerCase?.() || 'scheduled') as typeof status);

        // Cargar procedimientos del caso
        if (caseData.procedures && caseData.procedures.length > 0) {
          const procedures = caseData.procedures.map(proc => ({
            surgery_code: proc.surgery_code,
            surgery_name: proc.surgery_name,
            specialty: proc.specialty,
            grupo: proc.grupo || '',
            rvu: parseFloat(proc.rvu?.toString() || '0'),
            notes: proc.notes || ''
          }));
          setSelectedProcedures(procedures);
        }

        console.log(`[EditCase] Datos iniciales cargados ✅ (${favProcs.length} favoritos)`);
      } catch (error: any) {
        console.error('[EditCase] Error:', error);
        setError(error.message || 'Error al cargar caso');
        toast.error('Error', 'No se pudieron cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [id]);

  // Filtrado de procedimientos basado en búsqueda
  const filteredProcedures = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase();
    return allProcedures
      .filter(proc => 
        (proc.cirugia && proc.cirugia.toLowerCase().includes(query)) ||
        (proc.codigo && proc.codigo.toLowerCase().includes(query)) ||
        (proc.especialidad && proc.especialidad.toLowerCase().includes(query))
      )
      .slice(0, 50);
  }, [searchQuery, allProcedures]);

  // ✅ BÚSQUEDA: Carga CSVs solo cuando el usuario busca
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setShowProcedureSearch(false);
      return;
    }

    setShowProcedureSearch(true);

    // Solo cargar CSVs la primera vez que se busca
    if (allProcedures.length === 0) {
      setLoadingAllProcedures(true);
      console.log("[CSV] Primera búsqueda - cargando todos los CSVs...");

      const folderStructure: Record<string, Record<string, string>> = {
        "Cardiovascular": {
          "Cardiovascular": "Cardiovascular/Cardiovascular.csv",
          "Corazón": "Cardiovascular/Corazón.csv",
          "Vasos periféricos": "Cardiovascular/Vasos_periféricos.csv",
          "Tórax": "Cardiovascular/torax.csv",
        },
        "Dermatología": {
          "Dermatología": "Dermatología/Dermatología.csv",
        },
        "Digestivo": {
          "Digestivo": "Digestivo/Digestivo.csv",
          "Estómago e intestino": "Digestivo/Estómago_e_intestino.csv",
          "Hígado Páncreas": "Digestivo/Hígado_Páncreas.csv",
          "Peritoneo y hernias": "Digestivo/Peritoneo_y_hernias.csv",
        },
        "Endocrino": {
          "Endocrino": "Endocrino/Endocrino.csv",
        },
        "Ginecología": {
          "Ginecología": "Ginecología/Ginecología.csv",
        },
        "Mama": {
          "Mama": "Mama/Mama.csv",
        },
        "Maxilofacial": {
          "Maxilofacial": "Maxilofacial/Maxilofacial.csv",
        },
        "Neurocirugía": {
          "Neurocirugía": "Neurocirugía/Neurocirugía.csv",
          "Columna": "Neurocirugía/Columna.csv",
          "Cráneo y columna": "Neurocirugía/Cráneo_y_columna.csv",
        },
        "Obstetricia": {
          "Obstetricia": "Obstetricia/Obstetricia.csv",
        },
        "Oftalmología": {
          "Oftalmología": "Oftalmología/Oftalmología.csv",
        },
        "Ortopedia": {
          "Ortopedia": "Ortopedia/Ortopedia.csv",
          "Cadera": "Ortopedia/Cadera.csv",
          "Hombro": "Ortopedia/Hombro.csv",
          "Muñeca y mano": "Ortopedia/Muñeca_y_mano.csv",
          "Pie": "Ortopedia/Pie.csv",
          "Yesos y férulas": "Ortopedia/Yesos_y_ferulas.csv",
          "Injertos implantes": "Ortopedia/ortopedia_injertos_implantes_replantacion.csv",
          "Artroscopia": "Ortopedia/Artroscopia.csv",
        },
        "Otorrinolaringología": {
          "Laringe y tráqueas": "Otorrino/Laringe_y_traqueas.csv",
          "Nariz y senos paranasales": "Otorrino/Nariz_y_senos_paranasales.csv",
          "Otorrinolaringología": "Otorrino/Otorrinolaringología.csv",
          "Tórax": "Otorrino/torax.csv",
        },
        "Plástica": {
          "Plástica": "Plastica/Plastica.csv",
        },
        "Procesos variados": {
          "Cirugía General": "Procesos_variados/Cirugía_General.csv",
          "Drenajes e Incisiones": "Procesos_variados/Drenajes___Incisiones.csv",
          "Reparaciones (suturas)": "Procesos_variados/Reparaciones_(suturas).csv",
          "Uñas y piel": "Procesos_variados/Uñas___piel.csv",
        },
        "Urología": {
          "Urología": "Urología/Urología.csv",
        },
      };

      const procedures: ProcedureData[] = [];

      for (const [specialty, subcategories] of Object.entries(folderStructure)) {
        for (const [subName, csvPath] of Object.entries(subcategories)) {
          try {
            const csvContent = await loadCSV(csvPath);
            csvContent.forEach((op: any) => {
              procedures.push({
                codigo: String(op.codigo || '').trim(),
                cirugia: op.cirugia || '',
                especialidad: specialty,
                subespecialidad: subName,
                grupo: op.grupo || '',
                rvu: parseFloat(op.rvu) || 0
              });
            });
          } catch (err) {
            console.warn(`[CSV] Error cargando ${csvPath}`);
          }
        }
      }

      setAllProcedures(procedures);
      setLoadingAllProcedures(false);
      console.log(`[CSV] ✅ Cargados ${procedures.length} procedimientos`);
    }
  };

  // ✅ NUEVA FUNCIÓN: Cargar RVU de un favorito específico
  const loadFavoriteRvu = async (proc: ProcedureData): Promise<ProcedureData | null> => {
    try {
      setLoadingFavoriteRvu(proc.codigo);

      // Si allProcedures ya está cargado, buscar ahí
      if (allProcedures.length > 0) {
        const found = allProcedures.find(p => p.codigo === proc.codigo);
        if (found) {
          setLoadingFavoriteRvu(null);
          return found;
        }
      }

      // Si no está cargado, buscar en los CSVs por especialidad
      const folderStructure: Record<string, Record<string, string>> = {
        "Cardiovascular": {
          "Cardiovascular": "Cardiovascular/Cardiovascular.csv",
          "Corazón": "Cardiovascular/Corazón.csv",
          "Vasos periféricos": "Cardiovascular/Vasos_periféricos.csv",
          "Tórax": "Cardiovascular/torax.csv",
        },
        "Dermatología": {
          "Dermatología": "Dermatología/Dermatología.csv",
        },
        "Digestivo": {
          "Digestivo": "Digestivo/Digestivo.csv",
          "Estómago e intestino": "Digestivo/Estómago_e_intestino.csv",
          "Hígado Páncreas": "Digestivo/Hígado_Páncreas.csv",
          "Peritoneo y hernias": "Digestivo/Peritoneo_y_hernias.csv",
        },
        "Endocrino": {
          "Endocrino": "Endocrino/Endocrino.csv",
        },
        "Ginecología": {
          "Ginecología": "Ginecología/Ginecología.csv",
        },
        "Mama": {
          "Mama": "Mama/Mama.csv",
        },
        "Maxilofacial": {
          "Maxilofacial": "Maxilofacial/Maxilofacial.csv",
        },
        "Neurocirugía": {
          "Neurocirugía": "Neurocirugía/Neurocirugía.csv",
          "Columna": "Neurocirugía/Columna.csv",
          "Cráneo y columna": "Neurocirugía/Cráneo_y_columna.csv",
        },
        "Obstetricia": {
          "Obstetricia": "Obstetricia/Obstetricia.csv",
        },
        "Oftalmología": {
          "Oftalmología": "Oftalmología/Oftalmología.csv",
        },
        "Ortopedia": {
          "Ortopedia": "Ortopedia/Ortopedia.csv",
          "Cadera": "Ortopedia/Cadera.csv",
          "Hombro": "Ortopedia/Hombro.csv",
          "Muñeca y mano": "Ortopedia/Muñeca_y_mano.csv",
          "Pie": "Ortopedia/Pie.csv",
          "Yesos y férulas": "Ortopedia/Yesos_y_ferulas.csv",
          "Injertos implantes": "Ortopedia/ortopedia_injertos_implantes_replantacion.csv",
          "Artroscopia": "Ortopedia/Artroscopia.csv",
        },
        "Otorrinolaringología": {
          "Laringe y tráqueas": "Otorrino/Laringe_y_traqueas.csv",
          "Nariz y senos paranasales": "Otorrino/Nariz_y_senos_paranasales.csv",
          "Otorrinolaringología": "Otorrino/Otorrinolaringología.csv",
          "Tórax": "Otorrino/torax.csv",
        },
        "Plástica": {
          "Plástica": "Plastica/Plastica.csv",
        },
        "Procesos variados": {
          "Cirugía General": "Procesos_variados/Cirugía_General.csv",
          "Drenajes e Incisiones": "Procesos_variados/Drenajes___Incisiones.csv",
          "Reparaciones (suturas)": "Procesos_variados/Reparaciones_(suturas).csv",
          "Uñas y piel": "Procesos_variados/Uñas___piel.csv",
        },
        "Urología": {
          "Urología": "Urología/Urología.csv",
        },
      };

      // Buscar solo en la especialidad del procedimiento
      const subcategories = folderStructure[proc.especialidad];
      if (subcategories) {
        for (const csvPath of Object.values(subcategories)) {
          try {
            const csvContent = await loadCSV(csvPath);
            const found = csvContent.find((op: any) => 
              String(op.codigo || '').trim() === proc.codigo
            );

            if (found) {
              const fullProc: ProcedureData = {
                codigo: String(found.codigo || '').trim(),
                cirugia: found.cirugia || '',
                especialidad: proc.especialidad,
                grupo: found.grupo || '',
                rvu: parseFloat(found.rvu) || 0
              };
              setLoadingFavoriteRvu(null);
              return fullProc;
            }
          } catch (err) {
            console.warn(`[CSV] Error cargando ${csvPath}`);
          }
        }
      }

      setLoadingFavoriteRvu(null);
      return null;
    } catch (error) {
      console.error('[EditCase] Error loading favorite RVU:', error);
      setLoadingFavoriteRvu(null);
      return null;
    }
  };

  // ✅ NUEVA FUNCIÓN: Agregar favorito con carga de RVU
  const handleAddFavoriteProcedure = async (proc: ProcedureData) => {
    // Si ya tiene RVU, agregarlo directamente
    if (proc.rvu > 0) {
      handleAddProcedure(proc);
      return;
    }

    // Cargar RVU del CSV
    const fullProc = await loadFavoriteRvu(proc);

    if (fullProc && fullProc.rvu > 0) {
      handleAddProcedure(fullProc);
    } else {
      toast.error(
        'RVU no encontrado',
        `No se pudo cargar el RVU para ${proc.cirugia}. Búscalo manualmente.`
      );
    }
  };

  const [multipleRule, setMultipleRule] = useState(false);

  const MULTI_MULTIPLIERS = [1.0, 0.5, 0.25, 0.10];
  const getMultiplier = (rank: number) => MULTI_MULTIPLIERS[Math.min(rank, MULTI_MULTIPLIERS.length - 1)];

  const sortedByRvu = useMemo(() => (
    [...selectedProcedures].map((p, i) => ({ ...p, originalIndex: i })).sort((a, b) => b.rvu - a.rvu)
  ), [selectedProcedures]);

  const rankMap = useMemo(() => {
    const m: Record<number, number> = {};
    sortedByRvu.forEach((p, rank) => { m[p.originalIndex] = rank; });
    return m;
  }, [sortedByRvu]);

  const { totalRvu, totalValue, adjustedValue } = useMemo(() => {
    const factor = rateMultiplier ? parseFloat(rateMultiplier) || 1 : 1;
    const rvu = selectedProcedures.reduce((sum, p) => sum + p.rvu, 0);
    const adj = selectedProcedures.reduce((sum, p, i) => {
      const mult = multipleRule ? getMultiplier(rankMap[i] ?? i) : 1;
      return sum + p.rvu * mult * factor;
    }, 0);
    return { totalRvu: rvu, totalValue: rvu * factor, adjustedValue: adj };
  }, [selectedProcedures, rateMultiplier, multipleRule, rankMap]);

  const handleAddProcedure = (proc: ProcedureData) => {
    const newProcedure: SelectedProcedure = {
      surgery_code: proc.codigo,
      surgery_name: proc.cirugia,
      specialty: proc.especialidad,
      grupo: proc.grupo,
      rvu: proc.rvu,
      notes: ''
    };

    setSelectedProcedures([...selectedProcedures, newProcedure]);
    setSearchQuery('');
    setShowProcedureSearch(false);

    toast.success(
      'Procedimiento agregado',
      `${proc.cirugia} agregado exitosamente`
    );
  };

  const handleRemoveProcedure = (index: number) => {
    const removedProc = selectedProcedures[index];
    setSelectedProcedures(selectedProcedures.filter((_, i) => i !== index));

    toast.info(
      'Procedimiento eliminado',
      `${removedProc.surgery_name} fue eliminado de la lista`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientName.trim()) {
      toast.error('Error de validación', 'El nombre del paciente es requerido');
      return;
    }

    if (!hospitalId) {
      toast.error('Error de validación', 'Por favor selecciona un hospital');
      return;
    }

    if (!surgeryDate) {
      toast.error('Error de validación', 'La fecha de cirugía es requerida');
      return;
    }

    if (selectedProcedures.length === 0) {
      toast.error('Error de validación', 'Por favor agrega al menos un procedimiento');
      return;
    }

    if (rateMultiplier) {
      const rate = parseFloat(rateMultiplier);
      if (isNaN(rate) || rate <= 0) {
        toast.error('Error de validación', 'El multiplicador debe ser un número mayor a 0');
        return;
      }
      if (rate > 999.99) {
        toast.error('Error de validación', 'El multiplicador no puede superar 999.99');
        return;
      }
    }

    setSubmitting(true);

    try {
      const hospitalFactor = rateMultiplier ? parseFloat(rateMultiplier) || 1 : 1;

      const caseData: any = {
        patient_name: patientName,
        patient_name_for_assistant: patientName,
        patient_id: patientId || undefined,
        patient_age: patientAge ? parseInt(patientAge) : undefined,
        patient_gender: (patientGender || undefined) as PatientGender | undefined,
        hospital: parseInt(hospitalId),
        surgery_date: surgeryDate,
        surgery_time: surgeryTime || undefined,
        surgery_end_time: surgeryEndTime || undefined,
        diagnosis: diagnosis || undefined,
        notes: notes || undefined,
        insurance_company: insuranceId ? parseInt(insuranceId) : null,
        status: status,
        procedures: selectedProcedures.map((proc, index) => ({
          surgery_code: proc.surgery_code,
          surgery_name: proc.surgery_name,
          specialty: proc.specialty,
          grupo: proc.grupo,
          rvu: proc.rvu,
          hospital_factor: hospitalFactor,
          calculated_value: proc.rvu * hospitalFactor,
          notes: proc.notes || undefined,
          order: index + 1
        }))
      };

      // Solo agregar campos de ayudante si hay uno seleccionado
      if (assistantType === 'colleague' && selectedColleagueId) {
        caseData.assistant_doctor = selectedColleagueId;
      } else if (assistantType === 'manual' && manualAssistantName) {
        caseData.assistant_doctor_name = manualAssistantName;
      }

      console.log('📤 Enviando actualización:', caseData);

      // ✅ CRÍTICO: Llamar a updateCase (NO createCase)
      await surgicalCaseService.updateCase(parseInt(id!), caseData);

      // Upload new images if any
      if (isPremium && pendingImages.length > 0) {
        for (const file of pendingImages) {
          try {
            const formData = new FormData();
            formData.append('image', file);
            await authService.authenticatedFetch(
              `${API_URL}/api/v1/medico/cases/${id}/images/upload/`,
              { method: 'POST', body: formData }
            );
          } catch (imgError) {
            console.warn('Error uploading image:', imgError);
          }
        }
      }

      toast.success(
        '¡Caso actualizado exitosamente!',
        `El caso de ${patientName} ha sido actualizado correctamente`
      );

      navigate(`/cases/${id}`);
    } catch (error: any) {
      console.error('❌ Error updating case:', error);
      toast.error('Error al actualizar caso', error.message || 'Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <h2 className="text-2xl font-semibold mb-2">Error al cargar caso</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/cases')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Casos
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-8 pb-12 pt-4 px-4">
        <div className="flex items-center gap-4 pb-6 border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/cases/${id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight">Editar Caso Quirúrgico</h1>
            <p className="text-muted-foreground text-lg">Actualiza los detalles del procedimiento quirúrgico</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Patient Information */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <User className="h-5 w-5" />
                </div>
                Información del Paciente
              </CardTitle>
              <CardDescription className="pl-12">Ingresa los datos demográficos del paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label htmlFor="patientName" className="text-sm font-semibold">Paciente</Label>
                  <Input
                    id="patientName"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Nombre del paciente"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientId" className="text-sm font-semibold">ID / No. Expediente</Label>
                  <Input
                    id="patientId"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Número de expediente (opcional)"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientAge" className="text-sm font-semibold">Edad (años)</Label>
                  <Input
                    id="patientAge"
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="Ej: 45"
                    className="h-11"
                    min="0"
                    max="150"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientGender" className="text-sm font-semibold">Género</Label>
                  <Select value={patientGender} onValueChange={(value) => setPatientGender(value as PatientGender)}>
                    <SelectTrigger id="patientGender" className="h-11">
                      <SelectValue placeholder="Selecciona el género" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Femenino</SelectItem>
                      <SelectItem value="O">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label htmlFor="diagnosis" className="text-sm font-semibold">Diagnóstico Principal</Label>
                  <Input
                    id="diagnosis"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Ej: Colecistitis crónica calculosa"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurance" className="text-sm font-semibold">Seguro médico</Label>
                  <Select value={insuranceId} onValueChange={setInsuranceId}>
                    <SelectTrigger id="insurance" className="h-11">
                      <SelectValue placeholder="Selecciona un seguro (opcional)" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={5} className="w-[var(--radix-select-trigger-width)] max-h-[300px]">
                      {insurances.map((ins) => (
                        <SelectItem key={ins.id} value={ins.id.toString()}>
                          <div className="flex items-center gap-2">
                            {ins.is_favorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                            <span>{ins.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Surgery Details */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                Detalles de la Cirugía
              </CardTitle>
              <CardDescription className="pl-12">Lugar, programación y estado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label htmlFor="hospital" className="text-sm font-semibold">
                    Hospital / Centro Médico <span className="text-destructive">*</span>
                  </Label>
                  <Select value={hospitalId} onValueChange={setHospitalId} required>
                    <SelectTrigger id="hospital" className="h-11">
                      <SelectValue placeholder="Selecciona un hospital" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={5} className="w-[var(--radix-select-trigger-width)] max-h-[300px]">
                      {hospitals.length > 0 ? (
                        hospitals.map((hospital) => (
                          <SelectItem key={hospital.id} value={hospital.id.toString()}>
                            <div className="flex items-center gap-2">
                              {hospital.is_favorite && (
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              )}
                              <Building2 className="h-4 w-4" />
                              <span className="font-medium">{hospital.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-center text-muted-foreground">
                          No hay hospitales disponibles
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surgeryDate" className="text-sm font-semibold">
                    Fecha de Intervención <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="surgeryDate"
                    type="date"
                    value={surgeryDate}
                    onChange={(e) => setSurgeryDate(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surgeryTime" className="text-sm font-semibold">Hora de Inicio</Label>
                  <Input
                    id="surgeryTime"
                    type="time"
                    value={surgeryTime}
                    onChange={(e) => setSurgeryTime(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surgeryEndTime" className="text-sm font-semibold">Hora de Finalización (estimada)</Label>
                  <Input
                    id="surgeryEndTime"
                    type="time"
                    value={surgeryEndTime}
                    onChange={(e) => setSurgeryEndTime(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rateMultiplier" className="text-sm font-semibold">Multiplicador (Q/RVU)</Label>
                  <Input
                    id="rateMultiplier"
                    type="number"
                    value={rateMultiplier}
                    onChange={(e) => setRateMultiplier(e.target.value)}
                    placeholder="Por defecto: 1 (total en RVU)"
                    className="h-11"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Si ingresas un valor, el total se calculará en Quetzales (Q)
                  </p>
                </div>
              </div>
              </CardContent>
              </Card>

              {/* Assistant Doctor */}
              <Card>
              <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Médico Ayudante
              </CardTitle>
              <CardDescription>Selecciona un colega o ingresa el nombre manualmente (opcional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assistantType">Tipo de Ayudante</Label>
                <Select value={assistantType} onValueChange={(value: any) => {
                  setAssistantType(value);
                  if (value === 'none') {
                    setSelectedColleagueId(null);
                    setManualAssistantName('');
                  }
                }}>
                  <SelectTrigger id="assistantType">
                    <SelectValue placeholder="Selecciona una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin ayudante</SelectItem>
                    <SelectItem value="colleague">Seleccionar colega</SelectItem>
                    <SelectItem value="manual">Ingresar nombre manualmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {assistantType === 'colleague' && (
                <div className="space-y-2">
                  <Label htmlFor="colleague">Seleccionar Colega</Label>
                  {colleagues.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/50">
                      No tienes colegas agregados.
                    </div>
                  ) : (
                    <Select 
                      value={selectedColleagueId?.toString() || ''} 
                      onValueChange={(value) => setSelectedColleagueId(parseInt(value))}
                    >
                      <SelectTrigger id="colleague">
                        <SelectValue placeholder="Selecciona un colega" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {colleagues.map((colleague) => (
                          <SelectItem key={colleague.id} value={colleague.id.toString()}>
                            <div className="flex flex-col">
                              <span>{colleague.full_name}</span>
                              {colleague.specialty && (
                                <span className="text-xs text-muted-foreground">{colleague.specialty}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {assistantType === 'manual' && (
                <div className="space-y-2">
                  <Label htmlFor="manualAssistant">Nombre del Médico Ayudante</Label>
                  <Input
                    id="manualAssistant"
                    value={manualAssistantName}
                    onChange={(e) => setManualAssistantName(e.target.value)}
                    placeholder="Ej: Dr. Juan Pérez"
                  />
                </div>
              )}
              </CardContent>
              </Card>

              {/* Procedures */}
              <Card>
              <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Procedimientos
              </CardTitle>
              <CardDescription>
                Agrega procedimientos quirúrgicos a este caso
                {selectedProcedures.length > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    ({selectedProcedures.length} seleccionado{selectedProcedures.length !== 1 ? 's' : ''})
                  </span>
                )}
              </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              {/* 🔥 NUEVA SECCIÓN: Acceso Rápido a Favoritos */}
              {favoriteProcedures.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      Procedimientos Frecuentes ({favoriteProcedures.length})
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFavorites(!showFavorites)}
                    >
                      {showFavorites ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </div>

                  {showFavorites && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      {favoriteProcedures.map((proc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddFavoriteProcedure(proc)}
                          disabled={loadingFavoriteRvu === proc.codigo}
                          className="text-left p-3 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors border border-transparent hover:border-yellow-300 disabled:opacity-50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{proc.cirugia}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {proc.codigo} • {proc.especialidad}
                              </div>
                            </div>
                            {loadingFavoriteRvu === proc.codigo && (
                              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Búsqueda Manual */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Buscar Otros Procedimientos</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Buscar por nombre, código o especialidad..."
                    className="pl-10"
                  />

                      {showProcedureSearch && loadingAllProcedures && (
                        <Card className="absolute z-10 mt-2 w-full">
                          <CardContent className="p-8 text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">
                              Cargando base de datos de procedimientos...
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {showProcedureSearch && !loadingAllProcedures && filteredProcedures.length > 0 && (
                        <Card className="absolute z-10 mt-2 w-full max-h-80 overflow-y-auto">
                      <CardContent className="p-2">
                        {filteredProcedures.map((proc, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleAddProcedure(proc)}
                            className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                          >
                            <div className="font-medium">{proc.cirugia}</div>
                            <div className="text-sm text-muted-foreground">
                              {proc.codigo} • {proc.especialidad} • RVU: {proc.rvu}
                            </div>
                          </button>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {selectedProcedures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay procedimientos agregados aún</p>
                  <p className="text-sm">
                    {favoriteProcedures.length > 0 
                      ? 'Selecciona de tus favoritos o busca manualmente'
                      : 'Busca y agrega procedimientos arriba'
                    }
                  </p>
                </div>
              ) : (
                <>
                  {selectedProcedures.length > 1 && (
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Regla de procedimientos múltiples</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">(1°×100% · 2°×50% · 3°×25% · 4°+×10%)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMultipleRule(v => !v)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${multipleRule ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${multipleRule ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  )}
                  <div className="space-y-3">
                  {selectedProcedures.map((proc, index) => {
                    const rank = rankMap[index] ?? index;
                    const mult = multipleRule ? getMultiplier(rank) : 1;
                    const factor = rateMultiplier ? parseFloat(rateMultiplier) || 1 : 1;
                    const adjValue = proc.rvu * mult * factor;
                    const pctLabels = ['100%', '50%', '25%', '10%'];
                    const pctLabel = pctLabels[Math.min(rank, pctLabels.length - 1)];
                    return (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{proc.surgery_name}</span>
                            {multipleRule && (
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${rank === 0 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                {rank + 1}° · {pctLabel}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {proc.surgery_code} · {proc.specialty} · <span className="font-medium">{proc.rvu} RVU</span>
                            {multipleRule && factor > 0 && (
                              <span className="ml-2 text-primary font-semibold">
                                → Q {adjValue.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProcedure(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`notes-${index}`}>Notas del Procedimiento (opcional)</Label>
                        <Textarea
                          id={`notes-${index}`}
                          value={proc.notes}
                          onChange={(e) => {
                            const updated = [...selectedProcedures];
                            updated[index].notes = e.target.value;
                            setSelectedProcedures(updated);
                          }}
                          placeholder="Agrega notas para este procedimiento..."
                          rows={2}
                        />
                      </div>
                    </div>
                    );
                  })}
                </div>
                </>
              )}

              {selectedProcedures.length > 0 && (
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">RVU Total:</span>
                    <span className="font-medium">{totalRvu.toFixed(2)}</span>
                  </div>
                  {rateMultiplier && !multipleRule && (
                    <div className="flex justify-between">
                      <span className="font-medium">Total (Q):</span>
                      <span className="text-lg font-semibold text-primary">
                        Q {totalValue.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {rateMultiplier && multipleRule && (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground line-through">
                        <span>Sin regla múltiple:</span>
                        <span>Q {totalValue.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <span className="font-semibold text-sm">Con regla múltiple:</span>
                        <span className="text-lg font-bold text-primary">
                          Q {adjustedValue.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
              </CardContent>
              </Card>

              {/* Additional Notes */}
              <Card>
              <CardHeader>
              <CardTitle>Notas Adicionales</CardTitle>
              <CardDescription>Cualquier información adicional sobre este caso</CardDescription>
              </CardHeader>
              <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ingresa notas adicionales..."
                rows={4}
              />
              </CardContent>
              </Card>

              {/* Images */}
              <div className={`rounded-xl border-2 border-dashed p-6 transition-colors ${isPremium ? 'border-amber-400/60 bg-amber-400/5' : 'border-border bg-muted/20'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Images className={`w-5 h-5 ${isPremium ? 'text-amber-400' : 'text-muted-foreground'}`} />
                  <div>
                    <p className={`font-semibold ${isPremium ? 'text-amber-400' : 'text-muted-foreground'}`}>
                      Agregar imágenes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Radiografías, estudios, fotos · <span className="text-amber-400/80">máximo 5 en total por cirugía</span>
                    </p>
                  </div>
                  {isPremium && pendingImages.length < 5 && (
                    <label className="ml-auto cursor-pointer">
                      <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple className="hidden" onChange={handleImageSelect} />
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400/50 text-amber-400 hover:bg-amber-400/10 text-sm font-medium transition-colors">
                        <ImagePlus className="w-4 h-4" />
                        Agregar ({pendingImages.length}/5)
                      </div>
                    </label>
                  )}
                </div>

                {!isPremium ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <ImagePlus className="w-10 h-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground text-center">
                      La carga de imágenes es exclusiva del <span className="text-amber-400 font-semibold">Plan Premium</span>
                    </p>
                  </div>
                ) : pendingPreviews.length === 0 ? (
                  <label className="flex flex-col items-center justify-center py-8 cursor-pointer rounded-lg border border-dashed border-amber-400/30 hover:border-amber-400/60 hover:bg-amber-400/5 transition-colors">
                    <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple className="hidden" onChange={handleImageSelect} />
                    <ImagePlus className="w-10 h-10 text-amber-400/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Hacé clic para agregar imágenes</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG o WEBP · Máx. 10 MB cada una</p>
                  </label>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {pendingPreviews.map((src, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-amber-400/30 aspect-square">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removePendingImage(idx)}
                          className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {pendingImages.length < 5 && (
                      <label className="flex items-center justify-center rounded-lg border-2 border-dashed border-amber-400/30 hover:border-amber-400/60 aspect-square cursor-pointer transition-colors">
                        <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple className="hidden" onChange={handleImageSelect} />
                        <ImagePlus className="w-6 h-6 text-amber-400/50" />
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 justify-end pt-4">
              <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/cases')}
              disabled={submitting}
              >
              Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando Caso...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Actualizar Caso
                </>
              )}
              </Button>
              </div>
              </form>

              <BetweenContentAd className="mt-2" />
              </div>
              </AppLayout>
              );
              };

              export default EditCase;