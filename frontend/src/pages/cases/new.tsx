import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { BetweenContentAd } from '@/shared/components/ads/BetweenContentAd';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/useToast';
import { surgicalCaseService } from '@/services/surgicalCaseService';
import { hospitalService, type Hospital } from '@/services/hospitalService';
import { insuranceService, type InsuranceCompany } from '@/services/insuranceService';
import { colleaguesService } from '@/services/colleaguesService';
import { loadCSV } from '@/shared/utils/csvLoader';
import { favoritesService } from '@/services/favoritesService';
import { Loader2, Plus, X, Search, Calendar, User, Building2, Stethoscope, Star, Users, ImagePlus, Images } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import { authService } from '@/shared/services/authService';
import { uploadStore } from '@/shared/stores/uploadStore';

const API_URL = import.meta.env.VITE_API_URL || '';
import type { PatientGender } from '@/types/surgical-case';

const FOLDER_STRUCTURE: Record<string, Record<string, string>> = {
  "Cardiovascular": { "Cardiovascular": "Cardiovascular/Cardiovascular.csv", "Corazón": "Cardiovascular/Corazón.csv", "Vasos periféricos": "Cardiovascular/Vasos_periféricos.csv", "Tórax": "Cardiovascular/torax.csv" },
  "Dermatología": { "Dermatología": "Dermatología/Dermatología.csv" },
  "Digestivo": { "Digestivo": "Digestivo/Digestivo.csv", "Estómago e intestino": "Digestivo/Estómago_e_intestino.csv", "Hígado Páncreas": "Digestivo/Hígado_Páncreas.csv", "Peritoneo y hernias": "Digestivo/Peritoneo_y_hernias.csv" },
  "Endocrino": { "Endocrino": "Endocrino/Endocrino.csv" },
  "Ginecología": { "Ginecología": "Ginecología/Ginecología.csv" },
  "Mama": { "Mama": "Mama/Mama.csv" },
  "Maxilofacial": { "Maxilofacial": "Maxilofacial/Maxilofacial.csv" },
  "Neurocirugía": { "Neurocirugía": "Neurocirugía/Neurocirugía.csv", "Columna": "Neurocirugía/Columna.csv", "Cráneo y columna": "Neurocirugía/Cráneo_y_columna.csv" },
  "Obstetricia": { "Obstetricia": "Obstetricia/Obstetricia.csv" },
  "Oftalmología": { "Oftalmología": "Oftalmología/Oftalmología.csv" },
  "Ortopedia": { "Ortopedia": "Ortopedia/Ortopedia.csv", "Cadera": "Ortopedia/Cadera.csv", "Hombro": "Ortopedia/Hombro.csv", "Muñeca y mano": "Ortopedia/Muñeca_y_mano.csv", "Pie": "Ortopedia/Pie.csv", "Yesos y férulas": "Ortopedia/Yesos_y_ferulas.csv", "Injertos implantes": "Ortopedia/ortopedia_injertos_implantes_replantacion.csv", "Artroscopia": "Ortopedia/Artroscopia.csv" },
  "Otorrinolaringología": { "Laringe y tráqueas": "Otorrino/Laringe_y_traqueas.csv", "Nariz y senos paranasales": "Otorrino/Nariz_y_senos_paranasales.csv", "Otorrinolaringología": "Otorrino/Otorrinolaringología.csv", "Tórax": "Otorrino/torax.csv" },
  "Plástica": { "Plástica": "Plastica/Plastica.csv" },
  "Procesos variados": { "Cirugía General": "Procesos_variados/Cirugía_General.csv", "Drenajes e Incisiones": "Procesos_variados/Drenajes___Incisiones.csv", "Reparaciones (suturas)": "Procesos_variados/Reparaciones_(suturas).csv", "Uñas y piel": "Procesos_variados/Uñas___piel.csv" },
  "Urología": { "Urología": "Urología/Urología.csv" },
};


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

const NewCase = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isPremium = user?.has_premium_access;

  // Pending images (uploaded after case creation)
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
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [loadingColleagues, setLoadingColleagues] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Estados para favoritos
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [favoriteProcedures, setFavoriteProcedures] = useState<ProcedureData[]>([]);
  const [showFavorites, setShowFavorites] = useState(true);
  const [loadingFavoriteRvu, setLoadingFavoriteRvu] = useState<string | null>(null);
  const [loadingAllProcedures, setLoadingAllProcedures] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);

  // Cargar cada sección de forma independiente — el formulario se muestra de inmediato
  useEffect(() => {
    hospitalService.getHospitals()
      .then(setHospitals)
      .catch(() => toast.error('Error', 'No se pudieron cargar los hospitales'))
      .finally(() => setLoadingHospitals(false));

    insuranceService.getInsurances().then(setInsurances).catch(() => {});

    colleaguesService.getColleagues()
      .then(data => setColleagues(data.colleagues))
      .catch(() => {}) // no crítico
      .finally(() => setLoadingColleagues(false));

    favoritesService.getFavorites()
      .then(async favoritesData => {
        const favProcs: ProcedureData[] = favoritesData.map(fav => ({
          codigo: fav.surgery_code,
          cirugia: fav.surgery_name || fav.surgery_code,
          especialidad: fav.specialty || 'General',
          subespecialidad: undefined,
          grupo: '',
          rvu: 0,
        }));
        setFavoriteProcedures(favProcs);
        setLoadingFavorites(false);

        // Pre-load RVUs in background
        const updated = [...favProcs];
        for (let i = 0; i < updated.length; i++) {
          const proc = updated[i];
          try {
            const subs = FOLDER_STRUCTURE[proc.especialidad];
            const paths = subs ? Object.values(subs) : Object.values(FOLDER_STRUCTURE).flatMap(s => Object.values(s));
            for (const path of paths) {
              try {
                const rows = await loadCSV(path);
                const found = rows.find((r: any) => String(r.codigo || '').trim() === proc.codigo);
                if (found && parseFloat(found.rvu) > 0) {
                  updated[i] = { ...proc, rvu: parseFloat(found.rvu) || 0 };
                  setFavoriteProcedures([...updated]);
                  break;
                }
              } catch {}
            }
          } catch {}
        }
      })
      .catch(() => { setLoadingFavorites(false); });
  }, []);

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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) { setShowProcedureSearch(false); return; }
    setShowProcedureSearch(true);

    if (allProcedures.length === 0) {
      setLoadingAllProcedures(true);
      const tasks: Array<{ specialty: string; subName: string; csvPath: string }> = [];
      for (const [specialty, subcategories] of Object.entries(FOLDER_STRUCTURE)) {
        for (const [subName, csvPath] of Object.entries(subcategories)) {
          tasks.push({ specialty, subName, csvPath });
        }
      }
      const results = await Promise.allSettled(tasks.map(({ csvPath }) => loadCSV(csvPath)));
      const procedures: ProcedureData[] = [];
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          const { specialty, subName } = tasks[i];
          result.value.forEach((op: Record<string, string>) => {
            if (op.codigo) procedures.push({
              codigo: String(op.codigo).trim(),
              cirugia: op.cirugia || '',
              especialidad: specialty,
              subespecialidad: subName,
              grupo: op.grupo || '',
              rvu: parseFloat(op.rvu) || 0,
            });
          });
        }
      });
      setAllProcedures(procedures);
      setLoadingAllProcedures(false);
    }
  };
  const loadFavoriteRvu = async (proc: ProcedureData): Promise<ProcedureData | null> => {
    setLoadingFavoriteRvu(proc.codigo);
    try {
      if (allProcedures.length > 0) {
        const found = allProcedures.find(p => p.codigo === proc.codigo);
        if (found) return found;
      }
      const subcategories = FOLDER_STRUCTURE[proc.especialidad];
      const paths = subcategories
        ? Object.values(subcategories)
        : Object.values(FOLDER_STRUCTURE).flatMap(s => Object.values(s));
      for (const csvPath of paths) {
        try {
          const rows = await loadCSV(csvPath);
          const found = rows.find((r: Record<string, string>) => String(r.codigo || '').trim() === proc.codigo);
          if (found) return {
            codigo: String(found.codigo || '').trim(),
            cirugia: found.cirugia || '',
            especialidad: proc.especialidad,
            grupo: found.grupo || '',
            rvu: parseFloat(found.rvu) || 0,
          };
        } catch { /* ignore */ }
      }
      return null;
    } finally {
      setLoadingFavoriteRvu(null);
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

  // Set of favorite codes for fast lookup in search results
  const favoriteCodes = useMemo(() => new Set(favoriteProcedures.map(p => p.codigo)), [favoriteProcedures]);

  const handleToggleFavoriteInSearch = async (e: React.MouseEvent, proc: ProcedureData) => {
    e.stopPropagation();
    setTogglingFavorite(proc.codigo);
    try {
      if (favoriteCodes.has(proc.codigo)) {
        await favoritesService.removeFavoriteByCode(proc.codigo);
        setFavoriteProcedures(prev => prev.filter(p => p.codigo !== proc.codigo));
      } else {
        await favoritesService.addFavorite({
          surgery_code: proc.codigo,
          surgery_name: proc.cirugia,
          specialty: proc.especialidad,
        });
        setFavoriteProcedures(prev => [...prev, proc]);
      }
    } catch {
      toast.error('Error', 'No se pudo actualizar el favorito.');
    } finally {
      setTogglingFavorite(null);
    }
  };

  const [multipleRule, setMultipleRule] = useState(true);

  const MULTI_MULTIPLIERS = [1.0, 0.5, 0.10];
  const getMultiplier = (rank: number) => MULTI_MULTIPLIERS[Math.min(rank, MULTI_MULTIPLIERS.length - 1)];

  // Sorted indices by RVU desc (for the multiple rule rank)
  const sortedByRvu = useMemo(() => {
    return [...selectedProcedures]
      .map((p, i) => ({ ...p, originalIndex: i }))
      .sort((a, b) => b.rvu - a.rvu);
  }, [selectedProcedures]);

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

    if (patientAge) {
      const age = parseInt(patientAge);
      if (isNaN(age) || age < 0 || age > 120) {
        toast.error('Error de validación', 'La edad debe estar entre 0 y 120 años');
        return;
      }
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

    if (selectedProcedures.length === 0) {
      toast.error('Error de validación', 'Por favor agrega al menos un procedimiento');
      return;
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
        insurance_company: insuranceId ? parseInt(insuranceId) : undefined,
        procedures: selectedProcedures.map((proc, index) => ({
          surgery_code: proc.surgery_code,
          surgery_name: proc.surgery_name,
          specialty: proc.specialty,
          grupo: proc.grupo,
          rvu: proc.rvu,
          hospital_factor: hospitalFactor,
          calculated_value: proc.rvu * hospitalFactor * (multipleRule ? getMultiplier(rankMap[index] ?? index) : 1),
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

      const newCase = await surgicalCaseService.createCase(caseData);

      // Navigate immediately — images upload in the background
      if (isPremium && pendingImages.length > 0) {
        toast.success('¡Caso creado!', `Subiendo ${pendingImages.length} imagen${pendingImages.length > 1 ? 'es' : ''} en segundo plano...`);
        navigate('/cases');
        uploadStore.add(newCase.id);
        const caseIdForUpload = newCase.id;
        Promise.all(pendingImages.map(async (file) => {
          const formData = new FormData();
          formData.append('image', file);
          const resp = await authService.authenticatedFetch(
            `${API_URL}/api/v1/medico/cases/${caseIdForUpload}/images/upload/`,
            { method: 'POST', body: formData }
          );
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || `Error ${resp.status}`);
          }
        })).then(() => {
          // all good, spinner will disappear
        }).catch((err) => {
          toast.error('Algunas imágenes no se subieron', err.message || 'Revisá el caso y volvé a intentarlo.');
        }).finally(() => uploadStore.remove(caseIdForUpload));
      } else {
        toast.success('¡Caso creado exitosamente!', `El caso de ${patientName} ha sido registrado correctamente`);
        navigate('/cases');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Por favor intenta de nuevo.';
      toast.error('Error al crear caso', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-8 pb-12 pt-4 px-4">
        <div className="pb-6 border-b">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Nueva Cirugía</h1>
          <p className="text-muted-foreground text-lg">Ingresa los detalles del procedimiento quirúrgico</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Patient Information */}
          <Card className="shadow-sm border-slate-200" data-tutorial="patient-data">
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
                  <Label htmlFor="patientName" className="text-sm font-semibold">
                    Nombre Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="patientName"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientId" className="text-sm font-semibold">ID / No. Expediente</Label>
                  <Input
                    id="patientId"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 123456"
                    className="h-11"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientAge" className="text-sm font-semibold">Edad (años)</Label>
                  <Input
                    id="patientAge"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 45"
                    className="h-11"
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
          <Card className="shadow-sm border-slate-200" data-tutorial="hospital-selector">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                Detalles de la Cirugía
              </CardTitle>
              <CardDescription className="pl-12">Lugar y programación del evento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label htmlFor="hospital" className="text-sm font-semibold">
                    Hospital / Centro Médico <span className="text-destructive">*</span>
                  </Label>
                  <Select value={hospitalId} onValueChange={setHospitalId} required disabled={loadingHospitals}>
                    <SelectTrigger id="hospital" className="h-11">
                      {loadingHospitals
                        ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Cargando hospitales...</span>
                        : <SelectValue placeholder="Selecciona un hospital" />
                      }
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
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={rateMultiplier}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1');
                      setRateMultiplier(v);
                    }}
                    placeholder="Por defecto: 1 (total en RVU)"
                    className="h-11"
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
                  {loadingColleagues ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />Cargando colegas...
                    </div>
                  ) : colleagues.length === 0 ? (
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
          <Card data-tutorial="procedures-selector">
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
              {/* Acceso Rápido a Favoritos — siempre reserva espacio para evitar layout shift */}
              {loadingFavorites ? (
                <div className="h-10 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando procedimientos frecuentes...
                </div>
              ) : favoriteProcedures.length > 0 && (
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
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              {loadingFavoriteRvu === proc.codigo
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : proc.rvu > 0 && <span className="text-xs font-bold text-primary">{proc.rvu} RVU</span>
                              }
                            </div>
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
                              <div key={index} className="flex items-center gap-1 rounded-lg hover:bg-accent transition-colors">
                                <button
                                  type="button"
                                  onClick={() => handleAddProcedure(proc)}
                                  className="flex-1 text-left p-3"
                                >
                                  <div className="font-medium">{proc.cirugia}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {proc.codigo} · {proc.especialidad} · RVU: {proc.rvu}
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleFavoriteInSearch(e, proc)}
                                  disabled={togglingFavorite === proc.codigo}
                                  className="p-2 shrink-0 hover:text-yellow-500 transition-colors disabled:opacity-50"
                                  title={favoriteCodes.has(proc.codigo) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                                >
                                  {togglingFavorite === proc.codigo
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Star className={`h-4 w-4 ${favoriteCodes.has(proc.codigo) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                                  }
                                </button>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                </div>
              </div>

              {selectedProcedures.length > 1 && (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Regla de procedimientos múltiples</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">(1°×100% · 2°×50% · 3°+×10%)</span>
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
                <div className="space-y-3">
                  {selectedProcedures.map((proc, index) => {
                    const rank = rankMap[index] ?? index;
                    const mult = multipleRule ? getMultiplier(rank) : 1;
                    const factor = rateMultiplier ? parseFloat(rateMultiplier) || 1 : 1;
                    const adjValue = proc.rvu * mult * factor;
                    const pctLabels = ['100%', '50%', '10%'];
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
                  Imágenes pre-operatorias
                </p>
                <p className="text-xs text-muted-foreground">
                  Radiografías, estudios, fotos del paciente · <span className="text-amber-400/80">máximo 5 imágenes en total para todo el proceso</span>
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
                <p className="text-sm text-muted-foreground">Hacé clic o arrastrá imágenes aquí</p>
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
            <Button type="submit" disabled={submitting} data-tutorial="save-case-btn">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando Caso...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Caso
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

export default NewCase;