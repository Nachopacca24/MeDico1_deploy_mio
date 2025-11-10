/**
 * Types for Surgical Cases and Procedures
 */

export type CaseStatus = 'scheduled' | 'completed' | 'billed' | 'paid' | 'cancelled';

export type PatientGender = 'M' | 'F' | 'O';

export interface CaseProcedure {
  id?: number;
  surgery_code: string;
  surgery_name: string;
  specialty: string;
  grupo?: string;
  rvu: number;
  hospital_factor: number;
  calculated_value: number;
  notes?: string;
  order: number;
  created_at?: string;
  updated_at?: string;
}

export interface SurgicalCase {
  id: number;
  patient_name: string;
  patient_id?: string;
  patient_age?: number;
  patient_gender?: PatientGender;
  hospital: number;
  hospital_name?: string;
  hospital_rate_multiplier?: number;
  surgery_date: string;
  surgery_time?: string;
  status: CaseStatus;
  status_display?: string;
  notes?: string;
  diagnosis?: string;
  procedures?: CaseProcedure[];
  total_rvu?: number;
  total_value?: number;
  procedure_count?: number;
  primary_specialty?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface SurgicalCaseCreate {
  patient_name: string;
  patient_id?: string;
  patient_age?: number;
  patient_gender?: PatientGender;
  hospital: number;
  surgery_date: string;
  surgery_time?: string;
  status?: CaseStatus;
  notes?: string;
  diagnosis?: string;
  procedures?: Omit<CaseProcedure, 'id' | 'created_at' | 'updated_at'>[];
}

export interface SurgicalCaseUpdate extends Partial<SurgicalCaseCreate> {
  id: number;
}

export interface CaseStats {
  total_cases: number;
  total_procedures: number;
  total_value: number;
  cases_by_status: {
    [key: string]: {
      count: number;
      label: string;
    };
  };
  cases_by_specialty: {
    [specialty: string]: number;
  };
  recent_cases: SurgicalCase[];
}

export interface CaseFilters {
  status?: CaseStatus;
  hospital?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
}
