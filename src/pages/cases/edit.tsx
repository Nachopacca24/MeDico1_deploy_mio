// src/pages/cases/edit.tsx

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { loadCSV } from '@/shared/utils/csvLoader';
import { Loader2, Plus, X, Search, Calendar, User, Building2, Stethoscope, ArrowLeft, AlertCircle, Users } from 'lucide-react';
import type { PatientGender } from '@/types/surgical-case';
import { colleaguesService } from '@/services/colleaguesService';


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
  const [allProcedures, setAllProcedures] = useState<ProcedureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [loadingColleagues, setLoadingColleagues] = useState(false);

  // Load case data
  useEffect(() => {
    if (id) {
      loadCase();
    }
  }, [id]);

  const loadCase = async () => {
    try {
      setLoading(true);
      const caseData = await surgicalCaseService.getCase(parseInt(id!));
      
      // Populate form fields
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
      setStatus((caseData.status?.toLowerCase?.() || 'scheduled') as import('@/types/surgical-case').CaseStatus);
      
      // Populate procedures
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
    } catch (err: any) {
      setError(err.message || 'Error loading case');
      toast.error(
        'Error al cargar caso',
        'No se pudieron cargar los datos del caso'
      );
    } finally {
      setLoading(false);
    }
  };

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

  // Load hospitals and procedures
  useEffect(() => {
    const loadData = async () => {
      try {
        const hospitalsData = await hospitalService.getHospitals();
        setHospitals(hospitalsData);
                  
        // Load all CSV files (same structure as new.tsx)
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
            "Muñeca y Mano": "Ortopedia/Muñeca_y_mano.csv",
            "Pie": "Ortopedia/Pie.csv",
            "Yesos y Férulas": "Ortopedia/Yesos_y_ferulas.csv",
            "Injertos, Implantes": "Ortopedia/ortopedia_injertos_implantes_replantacion.csv",
            "Artroscopias": "Ortopedia/Artroscopia.csv",
          },
          "Otorrino": {
            "Laringe y Tráqueas": "Otorrino/Laringe_y_traqueas.csv",
            "Nariz y Senos": "Otorrino/Nariz_y_senos_paranasales.csv",
            "Otorrinolaringología": "Otorrino/Otorrinolaringología.csv",
            "Tórax": "Otorrino/torax.csv",
          },
          "Plástica": {
            "Cirugía Plástica": "Plastica/Plastica.csv",
          },
          "Procesos Variados": {
            "Cirugía General": "Procesos_variados/Cirugía_General.csv",
            "Drenajes Incisiones": "Procesos_variados/Drenajes___Incisiones.csv",
            "Reparaciones": "Procesos_variados/Reparaciones_(suturas).csv",
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
              const csvData = await loadCSV(csvPath);
              csvData.forEach((row: any) => {
                if (row.codigo && row.cirugia && row.rvu) {
                  procedures.push({
                    codigo: String(row.codigo).trim(),
                    cirugia: String(row.cirugia).trim(),
                    especialidad: String(row.especialidad || specialty).trim(),
                    subespecialidad: subName,
                    grupo: String(row.grupo || '').trim(),
                    rvu: parseFloat(row.rvu) || 0
                  });
                }
              });
            } catch (error) {
              console.warn(`Failed to load ${csvPath}:`, error);
            }
          }
        }
        
        setAllProcedures(procedures);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error(
          'Error al cargar datos',
          'No se pudieron cargar hospitales o procedimientos'
        );
      }
    };

    loadData();
  }, [toast]);

  // Filter procedures based on search
  const filteredProcedures = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return allProcedures
      .filter(proc =>
        proc.cirugia.toLowerCase().includes(query) ||
        proc.codigo.toLowerCase().includes(query) ||
        proc.especialidad.toLowerCase().includes(query) ||
        proc.grupo.toLowerCase().includes(query)
      )
      .slice(0, 50);
  }, [searchQuery, allProcedures]);

  // Add procedure to selection
  const handleAddProcedure = (procedure: ProcedureData) => {
    const newProcedure: SelectedProcedure = {
      surgery_code: procedure.codigo,
      surgery_name: procedure.cirugia,
      specialty: procedure.especialidad,
      grupo: procedure.grupo,
      rvu: procedure.rvu,
      notes: ''
    };
    
    setSelectedProcedures([...selectedProcedures, newProcedure]);
    setSearchQuery('');
    setShowProcedureSearch(false);
    
    toast.success(
      'Procedimiento agregado',
      `${procedure.cirugia} agregado exitosamente`
    );
  };

  // Remove procedure from selection
  const handleRemoveProcedure = (index: number) => {
    const removedProc = selectedProcedures[index];
    setSelectedProcedures(selectedProcedures.filter((_, i) => i !== index));
    
    toast.info(
      'Procedimiento eliminado',
      `${removedProc.surgery_name} fue eliminado de la lista`
    );
  };

  // Update procedure notes
  const handleUpdateProcedureNotes = (index: number, notes: string) => {
    const updated = [...selectedProcedures];
    updated[index].notes = notes;
    setSelectedProcedures(updated);
  };

  // Calculate total RVU
  const totalRvu = useMemo(() => {
    return selectedProcedures.reduce((sum, proc) => sum + proc.rvu, 0);
  }, [selectedProcedures]);

  // Calculate total value
  const totalValue = useMemo(() => {
    if (!hospitalId) return 0;
    const hospital = hospitals.find(h => h.id === parseInt(hospitalId));
    if (!hospital) return 0;
    return totalRvu * parseFloat(hospital.rate_multiplier?.toString() || '1');
  }, [totalRvu, hospitalId, hospitals]);

  // En src/pages/cases/edit.tsx
// Reemplaza la función handleSubmit COMPLETA:

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validation
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

  setSubmitting(true);
  
  try {
    const hospital = hospitals.find(h => h.id === parseInt(hospitalId));
    const hospitalFactor = hospital?.rate_multiplier || 1;
    
    const caseData: any = {
      patient_name: patientName,
      patient_id: patientId || undefined,
      patient_age: patientAge ? parseInt(patientAge) : undefined,
      patient_gender: (patientGender || undefined) as PatientGender | undefined,
      hospital: parseInt(hospitalId),
      surgery_date: surgeryDate,
      surgery_time: surgeryTime || undefined,
      diagnosis: diagnosis || undefined,
      notes: notes || undefined,
      status: (status?.toLowerCase?.() as import('@/types/surgical-case').CaseStatus) || 'scheduled',
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

    // Manejar médico ayudante
    if (assistantType === 'colleague' && selectedColleagueId) {
      caseData.assistant_doctor = selectedColleagueId;
    } else if (assistantType === 'manual' && manualAssistantName.trim()) {
      caseData.assistant_doctor_name = manualAssistantName.trim();
    }
    // Si es 'none', no agregamos nada

    console.log('Final caseData to send:', JSON.stringify(caseData, null, 2));

    await surgicalCaseService.updateCase(parseInt(id!), caseData);
    
    toast.success(
      '¡Caso actualizado exitosamente!',
      `El caso de ${patientName} ha sido actualizado correctamente con ${selectedProcedures.length} procedimiento${selectedProcedures.length !== 1 ? 's' : ''}`
    );
    
    navigate(`/cases/${id}`);
  } catch (error: any) {
    console.error('Error updating case:', error);
    
    let errorMessage = 'No se pudo actualizar el caso quirúrgico.';
    
    if (error.message) {
      errorMessage = error.message;
    }
    
    toast.error('Error al actualizar caso', errorMessage);
  } finally {
    setSubmitting(false);
  }
};

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg text-muted-foreground">Cargando datos del caso...</p>
          </div>
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
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/cases/${id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold mb-1 tracking-tight">Editar Caso Quirúrgico</h1>
            <p className="text-muted-foreground">Actualizar información del caso y procedimientos</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Información del Paciente
              </CardTitle>
              <CardDescription>Detalles básicos del paciente e identificación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientName">Nombre del Paciente *</Label>
                  <Input
                    id="patientName"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Nombre completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientId">ID del Paciente / DPI</Label>
                  <Input
                    id="patientId"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientAge">Edad</Label>
                  <Input
                    id="patientAge"
                    type="number"
                    min="0"
                    max="150"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="Edad del paciente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientGender">Género</Label>
                  <Select value={patientGender} onValueChange={(value) => setPatientGender(value as PatientGender)}>
                    <SelectTrigger>
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
            </CardContent>
          </Card>

          {/* Surgery Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Detalles de la Cirugía
              </CardTitle>
              <CardDescription>Información del hospital, fecha y diagnóstico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="hospital">Hospital *</Label>
                  <Select value={hospitalId} onValueChange={setHospitalId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.map(hospital => (
                        <SelectItem key={hospital.id} value={hospital.id.toString()}>
                          {hospital.name} ({hospital.rate_multiplier}x)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surgeryDate">Fecha de Cirugía *</Label>
                  <Input
                    id="surgeryDate"
                    type="date"
                    value={surgeryDate}
                    onChange={(e) => setSurgeryDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surgeryTime">Hora de Cirugía</Label>
                  <Input
                    id="surgeryTime"
                    type="time"
                    value={surgeryTime}
                    onChange={(e) => setSurgeryTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surgeryEndTime">Hora de Fin (estimada)</Label>
                  <Input
                    id="surgeryEndTime"
                    type="time"
                    value={surgeryEndTime}
                    onChange={(e) => setSurgeryEndTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Programado</SelectItem>
                      <SelectItem value="completed">Completado</SelectItem>
                      <SelectItem value="billed">Facturado</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="diagnosis">Diagnóstico</Label>
                  <Textarea
                    id="diagnosis"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Diagnóstico preoperatorio"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assistant Doctor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
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
                  } else if (value === 'colleague') {
                    setManualAssistantName('');
                  } else if (value === 'manual') {
                    setSelectedColleagueId(null);
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
                <Stethoscope className="w-5 h-5" />
                Procedimientos
              </CardTitle>
              <CardDescription>
                Selecciona y administra procedimientos para este caso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Procedure Search */}
              <div className="space-y-2">
                <Label>Agregar Procedimiento</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowProcedureSearch(true);
                    }}
                    onFocus={() => setShowProcedureSearch(true)}
                    placeholder="Buscar procedimientos por nombre, código o especialidad..."
                    className="pl-10"
                  />
                  
                  {/* Search Results Dropdown */}
                  {showProcedureSearch && filteredProcedures.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-96 overflow-auto">
                      {filteredProcedures.map((proc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddProcedure(proc)}
                          className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0"
                        >
                          <div className="font-medium">{proc.cirugia}</div>
                          <div className="text-sm text-muted-foreground">
                            Código: {proc.codigo} • {proc.especialidad} • RVU: {proc.rvu}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Procedures */}
              {selectedProcedures.length > 0 ? (
                <div className="space-y-3">
                  {selectedProcedures.map((proc, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold">{proc.surgery_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Código: {proc.surgery_code} • {proc.specialty} • RVU: {proc.rvu}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProcedure(index)}
                          className="hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`proc-notes-${index}`}>Notas del Procedimiento (Opcional)</Label>
                        <Textarea
                          id={`proc-notes-${index}`}
                          value={proc.notes}
                          onChange={(e) => handleUpdateProcedureNotes(index, e.target.value)}
                          placeholder="Notas adicionales para este procedimiento..."
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Stethoscope className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No hay procedimientos agregados aún</p>
                  <p className="text-sm text-muted-foreground">Busca y agrega procedimientos arriba</p>
                </div>
              )}

              {/* Totals */}
              {selectedProcedures.length > 0 && hospitalId && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Procedimientos:</span>
                    <span className="font-semibold">{selectedProcedures.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">RVU Total:</span>
                    <span className="font-semibold">{totalRvu.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Factor del Hospital:</span>
                    <span className="font-semibold">
                      {hospitals.find(h => h.id === parseInt(hospitalId))?.rate_multiplier || 1}x
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Valor Total:</span>
                    <span className="text-lg font-bold text-primary">
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
              <CardDescription>Cualquier otra información relevante sobre este caso</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas generales, observaciones o consideraciones especiales..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/cases/${id}`)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Caso'
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default EditCase;