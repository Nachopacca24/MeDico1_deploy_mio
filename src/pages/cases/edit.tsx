import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast } from '@/shared/hooks/use-toast';
import { surgicalCaseService } from '@/services/surgicalCaseService';
import { hospitalService, type Hospital } from '@/services/hospitalService';
import { loadCSV } from '@/shared/utils/csvLoader';
import { Loader2, Plus, X, Search, Calendar, User, Building2, Stethoscope, ArrowLeft, AlertCircle } from 'lucide-react';
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

const EditCase = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // Form state
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<PatientGender | ''>('');
  const [hospitalId, setHospitalId] = useState('');
  const [surgeryDate, setSurgeryDate] = useState('');
  const [surgeryTime, setSurgeryTime] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  
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
      toast({
        title: 'Error',
        description: 'Failed to load case data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

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
        toast({
          title: 'Error',
          description: 'Failed to load hospitals or procedures',
          variant: 'destructive'
        });
      }
    };

    loadData();
  }, []);

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
  };

  // Remove procedure from selection
  const handleRemoveProcedure = (index: number) => {
    setSelectedProcedures(selectedProcedures.filter((_, i) => i !== index));
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!patientName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Patient name is required',
        variant: 'destructive'
      });
      return;
    }
    
    if (!hospitalId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a hospital',
        variant: 'destructive'
      });
      return;
    }
    
    if (!surgeryDate) {
      toast({
        title: 'Validation Error',
        description: 'Surgery date is required',
        variant: 'destructive'
      });
      return;
    }
    
    if (selectedProcedures.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one procedure',
        variant: 'destructive'
      });
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

      await surgicalCaseService.updateCase(parseInt(id!), caseData);
      
      toast({
        title: 'Success',
        description: 'Surgical case updated successfully'
      });
      
      navigate(`/cases/${id}`);
    } catch (error) {
      console.error('Error updating case:', error);
      toast({
        title: 'Error',
        description: 'Failed to update surgical case',
        variant: 'destructive'
      });
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
            <p className="text-lg text-muted-foreground">Loading case data...</p>
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
            <h2 className="text-2xl font-semibold mb-2">Error Loading Case</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/cases')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cases
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
            <h1 className="text-3xl font-semibold mb-1 tracking-tight">Edit Surgical Case</h1>
            <p className="text-muted-foreground">Update case information and procedures</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Patient Information
              </CardTitle>
              <CardDescription>Basic patient details and identification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientName">Patient Name *</Label>
                  <Input
                    id="patientName"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientId">Patient ID / DPI</Label>
                  <Input
                    id="patientId"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientAge">Age</Label>
                  <Input
                    id="patientAge"
                    type="number"
                    min="0"
                    max="150"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="Patient age"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientGender">Gender</Label>
                  <Select value={patientGender} onValueChange={(value) => setPatientGender(value as PatientGender)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="O">Other</SelectItem>
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
                Surgery Details
              </CardTitle>
              <CardDescription>Hospital, date, and diagnosis information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="hospital">Hospital *</Label>
                  <Select value={hospitalId} onValueChange={setHospitalId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hospital" />
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
                  <Label htmlFor="surgeryDate">Surgery Date *</Label>
                  <Input
                    id="surgeryDate"
                    type="date"
                    value={surgeryDate}
                    onChange={(e) => setSurgeryDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surgeryTime">Surgery Time</Label>
                  <Input
                    id="surgeryTime"
                    type="time"
                    value={surgeryTime}
                    onChange={(e) => setSurgeryTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="billed">Billed</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Textarea
                    id="diagnosis"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Preoperative diagnosis"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Procedures */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Procedures
              </CardTitle>
              <CardDescription>
                Select and manage procedures for this case
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Procedure Search */}
              <div className="space-y-2">
                <Label>Add Procedure</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowProcedureSearch(true);
                    }}
                    onFocus={() => setShowProcedureSearch(true)}
                    placeholder="Search procedures by name, code, or specialty..."
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
                            Code: {proc.codigo} • {proc.especialidad} • RVU: {proc.rvu}
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
                            Code: {proc.surgery_code} • {proc.specialty} • RVU: {proc.rvu}
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
                        <Label htmlFor={`proc-notes-${index}`}>Procedure Notes (Optional)</Label>
                        <Textarea
                          id={`proc-notes-${index}`}
                          value={proc.notes}
                          onChange={(e) => handleUpdateProcedureNotes(index, e.target.value)}
                          placeholder="Additional notes for this procedure..."
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Stethoscope className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No procedures added yet</p>
                  <p className="text-sm text-muted-foreground">Search and add procedures above</p>
                </div>
              )}

              {/* Totals */}
              {selectedProcedures.length > 0 && hospitalId && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Procedures:</span>
                    <span className="font-semibold">{selectedProcedures.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total RVU:</span>
                    <span className="font-semibold">{totalRvu.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hospital Factor:</span>
                    <span className="font-semibold">
                      {hospitals.find(h => h.id === parseInt(hospitalId))?.rate_multiplier || 1}x
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Total Value:</span>
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
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>Any other relevant information about this case</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="General notes, observations, or special considerations..."
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
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Case'
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default EditCase;
