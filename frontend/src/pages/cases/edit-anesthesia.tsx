import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Switch } from '@/shared/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/useToast';
import { surgicalCaseService } from '@/services/surgicalCaseService';
import { hospitalService, type Hospital } from '@/services/hospitalService';
import { insuranceService, type InsuranceCompany } from '@/services/insuranceService';
import { anesthesiaService, type AnesthesiaItem } from '@/services/anesthesiaService';
import { Loader2, User, Building2, Stethoscope, Wrench } from 'lucide-react';
import type { PatientGender } from '@/types/surgical-case';
import { AnesthesiaCodesPicker, type AnesthesiaPickedItem, type CsvRow } from './AnesthesiaCodesPicker';

const EditAnesthesiaCase = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const caseId = Number(id);

  const [loading, setLoading] = useState(true);

  // Patient info
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<PatientGender | ''>('');

  // Surgery info
  const [hospitalId, setHospitalId] = useState('');
  const [surgeryDate, setSurgeryDate] = useState('');
  const [surgeryTime, setSurgeryTime] = useState('');
  const [surgeryEndTime, setSurgeryEndTime] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [insuranceId, setInsuranceId] = useState('');

  // Anesthesia
  const [unitValue, setUnitValue] = useState('');
  const [equipmentEnabled, setEquipmentEnabled] = useState(false);
  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentCost, setEquipmentCost] = useState('');
  const [codeItems, setCodeItems] = useState<AnesthesiaItem[]>([]);

  const pickedItems: AnesthesiaPickedItem[] = codeItems.map(i => ({
    key: String(i.id),
    surgery_code: i.surgery_code,
    surgery_name: i.surgery_name,
    base_units: i.base_units,
  }));

  const handleAddCode = async (row: CsvRow) => {
    const updated = await anesthesiaService.addItem(caseId, {
      surgery_code: row.codigo,
      surgery_name: row.cirugia || row.nombre || '',
      base_units: parseFloat(row.rvu || '0') || 0,
    });
    setCodeItems(updated.items);
  };

  const handleRemoveCode = async (key: string) => {
    const updated = await anesthesiaService.removeItem(caseId, parseInt(key));
    setCodeItems(updated.items);
  };

  // Data
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [insurances, setInsurances] = useState<InsuranceCompany[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [caseData, anesthesiaData, hospitalsData, insurancesData] = await Promise.all([
          surgicalCaseService.getCase(caseId),
          anesthesiaService.get(caseId),
          hospitalService.getHospitals(),
          insuranceService.getInsurances().catch(() => [] as InsuranceCompany[]),
        ]);

        setPatientName(caseData.patient_name || '');
        setPatientId(caseData.patient_id || '');
        setPatientAge(caseData.patient_age != null ? String(caseData.patient_age) : '');
        setPatientGender((caseData.patient_gender as PatientGender) || '');
        setHospitalId(caseData.hospital ? String(caseData.hospital) : '');
        setSurgeryDate(caseData.surgery_date || '');
        setSurgeryTime(caseData.surgery_time || '');
        setSurgeryEndTime(caseData.surgery_end_time || '');
        setDiagnosis(caseData.diagnosis || '');
        setNotes(caseData.notes || '');
        setInsuranceId(caseData.insurance_company ? String(caseData.insurance_company) : '');

        if (anesthesiaData) {
          setUnitValue(anesthesiaData.unit_value != null ? String(anesthesiaData.unit_value) : '');
          setEquipmentEnabled(!!anesthesiaData.equipment_name);
          setEquipmentName(anesthesiaData.equipment_name || '');
          setEquipmentCost(anesthesiaData.equipment_cost != null ? String(anesthesiaData.equipment_cost) : '');
          setCodeItems(anesthesiaData.items);
        }

        setHospitals(hospitalsData);
        setInsurances(insurancesData);
      } catch {
        toast.error('Error', 'No se pudo cargar el caso');
        navigate(`/cases/${caseId}`);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [caseId]);

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

    setSubmitting(true);

    try {
      await Promise.all([
        surgicalCaseService.updateCase(caseId, {
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
          insurance_company: insuranceId ? parseInt(insuranceId) : undefined,
        }),
        anesthesiaService.update(caseId, {
          unit_value: unitValue ? parseFloat(unitValue) : 0,
          equipment_name: equipmentEnabled ? equipmentName.trim() || null : null,
          equipment_cost: equipmentEnabled && equipmentCost ? parseFloat(equipmentCost) : null,
        }),
      ]);

      toast.success('Caso actualizado', 'Los cambios fueron guardados correctamente');
      navigate(`/cases/${caseId}`);
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Por favor intenta de nuevo.';
      toast.error('Error al guardar', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-8 pb-12 pt-4 px-4">
        <div className="pb-6 border-b">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Editar Caso de Anestesia</h1>
          <p className="text-muted-foreground text-lg">Modificá los datos del paciente y tu sesión</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Patient Information */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <User className="h-5 w-5" />
                </div>
                Información del Paciente
              </CardTitle>
              <CardDescription className="pl-12">Datos demográficos del paciente</CardDescription>
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
                  <Label htmlFor="patientAge" className="text-sm font-semibold">Edad</Label>
                  <Input
                    id="patientAge"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 45"
                    className="h-11"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    max="120"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientGender" className="text-sm font-semibold">Género</Label>
                  <Select value={patientGender} onValueChange={(v) => setPatientGender(v as PatientGender)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccionar género" />
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

          {/* Surgery Information */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                Datos de la Cirugía
              </CardTitle>
              <CardDescription className="pl-12">Hospital, fecha y diagnóstico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label htmlFor="hospital" className="text-sm font-semibold">
                    Hospital <span className="text-destructive">*</span>
                  </Label>
                  <Select value={hospitalId} onValueChange={setHospitalId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccionar hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.map((h) => (
                        <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surgeryDate" className="text-sm font-semibold">
                    Fecha <span className="text-destructive">*</span>
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
                  <Label htmlFor="surgeryEndTime" className="text-sm font-semibold">Hora de Fin</Label>
                  <Input
                    id="surgeryEndTime"
                    type="time"
                    value={surgeryEndTime}
                    onChange={(e) => setSurgeryEndTime(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="diagnosis" className="text-sm font-semibold">Diagnóstico</Label>
                  <Input
                    id="diagnosis"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Ej: Fractura de cadera"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes" className="text-sm font-semibold">Notas</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observaciones adicionales..."
                    className="resize-none"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurance" className="text-sm font-semibold">Obra Social / Seguro</Label>
                  <Select value={insuranceId} onValueChange={setInsuranceId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Sin seguro" />
                    </SelectTrigger>
                    <SelectContent>
                      {insurances.map((ins) => (
                        <SelectItem key={ins.id} value={String(ins.id)}>{ins.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anesthesia Setup */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Stethoscope className="h-5 w-5" />
                </div>
                Anestesia
              </CardTitle>
              <CardDescription className="pl-12">Valor de unidad. El tiempo se edita desde el detalle una vez operada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="unitValue" className="text-sm font-semibold">Valor por Unidad</Label>
                <Input
                  id="unitValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitValue}
                  onChange={(e) => setUnitValue(e.target.value)}
                  placeholder="Ej: 1500.00"
                  className="h-11"
                />
              </div>
            </CardContent>
          </Card>

          <AnesthesiaCodesPicker items={pickedItems} onAdd={handleAddCode} onRemove={handleRemoveCode} />

          {/* Equipment */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="flex items-center justify-between text-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Wrench className="h-5 w-5" />
                  </div>
                  Uso de Equipo Personal
                </div>
                <Switch checked={equipmentEnabled} onCheckedChange={setEquipmentEnabled} />
              </CardTitle>
              <CardDescription className="pl-12">Opcional — se suma al total de honorarios de anestesia</CardDescription>
            </CardHeader>
            {equipmentEnabled && (
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="equipmentName" className="text-sm font-semibold">Nombre del Equipo</Label>
                    <Input
                      id="equipmentName"
                      value={equipmentName}
                      onChange={(e) => setEquipmentName(e.target.value)}
                      placeholder="Ej: Electrobisturí"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="equipmentCost" className="text-sm font-semibold">Monto</Label>
                    <Input
                      id="equipmentCost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={equipmentCost}
                      onChange={(e) => setEquipmentCost(e.target.value)}
                      placeholder="Ej: 5000.00"
                      className="h-11"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <div className="flex gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/cases/${caseId}`)}
              disabled={submitting}
              className="flex-1 md:flex-none"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 md:flex-none md:min-w-[200px]">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default EditAnesthesiaCase;
