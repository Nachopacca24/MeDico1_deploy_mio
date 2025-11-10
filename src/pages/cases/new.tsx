import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Loader2, Plus, X, Search, Calendar, User, Building2, Stethoscope, Star } from 'lucide-react';
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

const NewCase = () => {
  const navigate = useNavigate();
  
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
  
  // Procedure selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProcedures, setSelectedProcedures] = useState<SelectedProcedure[]>([]);
  const [showProcedureSearch, setShowProcedureSearch] = useState(false);
  
  // Data state
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [allProcedures, setAllProcedures] = useState<ProcedureData[]>([]);
  const [loading, setLoading] = useState(true);
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
        
        for (const [specialty, subcategories] of Object.entries(folderStructure)) {
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
            } catch (err) {
              console.error(`Error loading CSV ${csvPath}:`, err);
            }
          }
        }
        
        setAllProcedures(procedures);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load hospitals and procedures',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter procedures based on search
  const filteredProcedures = useMemo(() => {
    if (!searchQuery) return [];
    
    const query = searchQuery.toLowerCase();
    return allProcedures
      .filter(proc => 
        proc.cirugia.toLowerCase().includes(query) ||
        proc.codigo.toLowerCase().includes(query) ||
        proc.especialidad.toLowerCase().includes(query)
      )
      .slice(0, 50); // Limit to 50 results
  }, [searchQuery, allProcedures]);

  // Calculate totals
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
  };

  const handleRemoveProcedure = (index: number) => {
    setSelectedProcedures(selectedProcedures.filter((_, i) => i !== index));
  };

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

      const response = await surgicalCaseService.createCase(caseData);
      
      toast({
        title: 'Success',
        description: 'Surgical case created successfully'
      });
      
      // Redirect to dashboard (cases list)
      navigate('/cases');
    } catch (error) {
      console.error('Error creating case:', error);
      toast({
        title: 'Error',
        description: 'Failed to create surgical case',
        variant: 'destructive'
      });
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
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        <div className="pb-4 border-b">
          <h1 className="text-3xl font-semibold mb-1 tracking-tight">New Surgical Case</h1>
          <p className="text-muted-foreground">Create a new surgical case record</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
              <CardDescription>Enter patient details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientName">
                    Patient Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="patientName"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter patient name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="patientId">Patient ID</Label>
                  <Input
                    id="patientId"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Enter patient ID"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="patientAge">Age</Label>
                  <Input
                    id="patientAge"
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="Enter age"
                    min="0"
                    max="150"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="patientGender">Gender</Label>
                  <Select value={patientGender} onValueChange={(value) => setPatientGender(value as PatientGender)}>
                    <SelectTrigger id="patientGender">
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
              
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis</Label>
                <Input
                  id="diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Enter diagnosis"
                />
              </div>
            </CardContent>
          </Card>

          {/* Surgery Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Surgery Details
              </CardTitle>
              <CardDescription>Schedule and location information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hospital">
                    Hospital <span className="text-destructive">*</span>
                  </Label>
                  <Select value={hospitalId} onValueChange={setHospitalId} required>
                    <SelectTrigger id="hospital">
                      <SelectValue placeholder="Select hospital" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {hospitals.map((hospital) => (
                        <SelectItem key={hospital.id} value={hospital.id.toString()}>
                          <div className="flex items-center gap-2">
                            {hospital.is_favorite && (
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            )}
                            <Building2 className="h-4 w-4" />
                            <span className="flex-1">{hospital.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {hospital.rate_multiplier}x
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="surgeryDate">
                    Surgery Date <span className="text-destructive">*</span>
                  </Label>
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
              </div>
            </CardContent>
          </Card>

          {/* Procedures */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Procedures
              </CardTitle>
              <CardDescription>
                Add surgical procedures to this case
                {selectedProcedures.length > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    ({selectedProcedures.length} selected)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowProcedureSearch(e.target.value.length > 0);
                  }}
                  placeholder="Search procedures by name, code, or specialty..."
                  className="pl-10"
                />
                
                {/* Search Results Dropdown */}
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

              {/* Selected Procedures */}
              {selectedProcedures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No procedures added yet</p>
                  <p className="text-sm">Search and add procedures above</p>
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
                        <Label htmlFor={`notes-${index}`}>Procedure Notes (optional)</Label>
                        <Textarea
                          id={`notes-${index}`}
                          value={proc.notes}
                          onChange={(e) => {
                            const updated = [...selectedProcedures];
                            updated[index].notes = e.target.value;
                            setSelectedProcedures(updated);
                          }}
                          placeholder="Add notes for this procedure..."
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              {selectedProcedures.length > 0 && hospitalId && (
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total RVU:</span>
                    <span className="font-medium">{totalRvu.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Estimated Value:</span>
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
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>Any additional information about this case</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter additional notes..."
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
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Case...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Case
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
