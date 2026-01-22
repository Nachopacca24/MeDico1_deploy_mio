//src/pages/cases/new.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/useToast';
import { surgicalCaseService } from '@/services/surgicalCaseService';
import { hospitalService, type Hospital } from '@/services/hospitalService';
import { colleaguesService } from '@/services/colleaguesService';
import { loadCSV } from '@/shared/utils/csvLoader';
import { Loader2, Plus, X, Search, Calendar, User, Building2, Stethoscope, Star, Users } from 'lucide-react';
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

const NewCase = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Form state
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<PatientGender | ''>('');
  const [hospitalId, setHospitalId] = useState('');
  const [surgeryDate, setSurgeryDate] = useState('');
  const [surgeryTime, setSurgeryTime] = useState('');
  const [surgeryEndTime, setSurgeryEndTime] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  
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
  const [loadingColleagues, setLoadingColleagues] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load hospitals and procedures
  useEffect(() => {
    const loadData = async () => {
      try {
        const hospitalsData = await hospitalService.getHospitals();
        setHospitals(hospitalsData);
        
        // Load all CSV files and flatten procedures (using only existing CSV files)
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
        
        // Optimización: Cargar solo archivos necesarios (ej: favoritos o los más comunes) o cargar bajo demanda
        const loadPromises: Promise<void>[] = [];

        // No cargar todo al inicio para evitar ERR_INSUFFICIENT_RESOURCES
        // Solo cargamos una pequeña muestra o esperamos a la búsqueda
        /* 
        for (const [specialty, subcategories] of Object.entries(folderStructure)) {
          for (const [subName, csvPath] of Object.entries(subcategories)) {
            // ... logic to load all
          }
        }
        */
        
        setAllProcedures([]); // Empezar vacío y cargar bajo demanda si es posible
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error(
          'Error al cargar datos',
          'No se pudieron cargar los hospitales y procedimientos'
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  // Load colleagues
  useEffect(() => {
    const loadColleagues = async () => {
      try {
        setLoadingColleagues(true);
        const data = await colleaguesService.getColleagues();
        setColleagues(data.colleagues);
      } catch (error) {
        console.error('Error loading colleagues:', error);
      } finally {
        setLoadingColleagues(false);
      }
    };

    loadColleagues();
  }, []);

  // Carga bajo demanda si no está en allProcedures
  const loadAllCSVData = async () => {
    if (allProcedures.length > 0) return;
    
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
    const specialties = Object.entries(folderStructure);
    
    for (const [specialty, subcategories] of specialties) {
      for (const [subName, csvPath] of Object.entries(subcategories)) {
        try {
          const csvContent = await loadCSV(csvPath);
          csvContent.forEach((op: any) => {
            procedures.push({
              codigo: op.codigo || '',
              cirugia: op.cirugia || '',
              especialidad: specialty,
              subespecialidad: subName,
              grupo: op.grupo || '',
              rvu: parseFloat(op.rvu) || 0
            });
          });
        } catch (err) {}
      }
    }
    setAllProcedures(procedures);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) return;
    await loadAllCSVData();
  };

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
      .slice(0, 50); // Limitar a 50 resultados
  }, [searchQuery, allProcedures]);
  const { totalRvu, totalValue } = useMemo(() => {
    const hospital = hospitals.find(h => h.id === parseInt(hospitalId));
    const factor = hospital?.rate_multiplier || 1;
    
    const rvu = selectedProcedures.reduce((sum, proc) => sum + proc.rvu, 0);
    const value = rvu * factor;
    
    return { totalRvu: rvu, totalValue: value };
  }, [selectedProcedures, hospitalId, hospitals]);

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
    
    // Validation
    if (!patientName.trim()) {
      toast.error(
        'Error de validación',
        'El nombre del paciente es requerido'
      );
      return;
    }
    
    if (!hospitalId) {
      toast.error(
        'Error de validación',
        'Por favor selecciona un hospital'
      );
      return;
    }
    
    if (!surgeryDate) {
      toast.error(
        'Error de validación',
        'La fecha de cirugía es requerida'
      );
      return;
    }
    
    if (selectedProcedures.length === 0) {
      toast.error(
        'Error de validación',
        'Por favor agrega al menos un procedimiento'
      );
      return;
    }

    setSubmitting(true);
    
    try {
      const hospital = hospitals.find(h => h.id === parseInt(hospitalId));
      const hospitalFactor = hospital?.rate_multiplier || 1;
      
      const caseData = {
        patient_name: patientName,
        patient_id: patientId || undefined,
        patient_age: patientAge ? parseInt(patientAge) : undefined,
        patient_gender: (patientGender || undefined) as PatientGender | undefined,
        hospital: parseInt(hospitalId),
        surgery_date: surgeryDate,
        surgery_time: surgeryTime || undefined,
        surgery_end_time: surgeryEndTime || undefined,
        diagnosis: diagnosis || undefined,
        notes: notes || undefined,
        // Médico ayudante
         assistant_doctor: assistantType === 'colleague' ? selectedColleagueId : undefined,
        assistant_doctor_name: assistantType === 'manual' ? manualAssistantName : undefined,
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
      // NO enviar assistant_accepted - se establece como null en el backend
    } else if (assistantType === 'manual' && manualAssistantName) {
      caseData.assistant_doctor_name = manualAssistantName;
    }

      await surgicalCaseService.createCase(caseData);
      
      toast.success(
        '¡Caso creado exitosamente!',
        `El caso de ${patientName} ha sido registrado correctamente con ${selectedProcedures.length} procedimiento${selectedProcedures.length !== 1 ? 's' : ''}`
      );
      
      navigate('/cases');
    } catch (error) {
      console.error('Error creating case:', error);
      toast.error(
        'Error al crear caso',
        'No se pudo crear el caso quirúrgico. Por favor intenta de nuevo.'
      );
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

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-8 pb-12 pt-4 px-4">
        <div className="pb-6 border-b">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Nuevo Caso Quirúrgico</h1>
          <p className="text-muted-foreground text-lg">Ingresa los detalles del procedimiento quirúrgico</p>
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
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Ej: 12345-6"
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
              <CardDescription className="pl-12">Lugar y programación del evento</CardDescription>
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
                              <span className="text-xs text-muted-foreground ml-1">
                                ({hospital.rate_multiplier}x)
                              </span>
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
              </div>
            </CardContent>
          </Card>

          {/* Assistant Doctor - NUEVO */}
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando colegas...
                    </div>
                  ) : colleagues.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/50">
                      No tienes colegas agregados. Ve a la sección de Colegas para agregar algunos.
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    setShowProcedureSearch(val.length > 0);
                    handleSearch(val);
                  }}
                  placeholder="Buscar procedimientos por nombre, código o especialidad..."
                  className="pl-10"
                />
                
                {showProcedureSearch && filteredProcedures.length > 0 && (
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

              {selectedProcedures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay procedimientos agregados aún</p>
                  <p className="text-sm">Busca y agrega procedimientos arriba</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedProcedures.map((proc, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-medium">{proc.surgery_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {proc.surgery_code} • {proc.specialty} • RVU: {proc.rvu}
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
                  ))}
                </div>
              )}

              {selectedProcedures.length > 0 && hospitalId && (
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">RVU Total:</span>
                    <span className="font-medium">{totalRvu.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Valor Estimado:</span>
                    <span className="text-lg font-semibold text-primary">
                      ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
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
      </div>
    </AppLayout>
  );
};

export default NewCase;