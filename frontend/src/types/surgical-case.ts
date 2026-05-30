// src/types/surgical-case.ts

export type PatientGender = 'M' | 'F' | 'O';

export type CaseStatus = 
  | 'scheduled' 
  | 'completed' 
  | 'billed' 
  | 'paid' 
  | 'cancelled';

// Tipo para las estadísticas del dashboard
export interface CaseStats {
  total_cases: number;
  total_procedures: number;
  total_value: number;
  cases_by_status: {
    [key: string]: { count: number; total_value: number };
  };
  cases_by_specialty: {
    [key: string]: { count: number; total_value: number; total_rvu?: number };
  };
  recent_cases: SurgicalCase[];
  // extended stats
  cases_this_month: number;
  cases_last_month: number;
  monthly_trend: { month: string; year: number; count: number; rvu: number }[];
  top_procedures: { name: string; count: number; total_rvu: number }[];
  top_procedures_by_rvu: { name: string; count: number; total_rvu: number }[];
  top_hospitals: { name: string; count: number }[];
  top_hospitals_by_rvu: { name: string; total_rvu: number; count: number }[];
  total_rvu: number;
  avg_rvu_per_case: number;
  rvu_this_month: number;
  rvu_last_month: number;
  pipeline_month: { [key: string]: { count: number; total_value: number } };
  pipeline_week:  { [key: string]: { count: number; total_value: number } };
  collaborators_this_month: number;
  active_specialties: number;
  avg_per_week: number;
}

export interface Procedure {
  id?: number;
  surgery_code: string;
  surgery_name: string;
  specialty: string;
  grupo?: string;
  rvu: number;
  hospital_factor?: number;
  calculated_value?: number;
  notes?: string;
  order?: number;
}

export interface SurgicalCase {
  id: number;
  patient_name: string;
  patient_name_for_assistant?: string;
  patient_id?: string;
  patient_age?: number;
  patient_gender?: PatientGender;
  hospital: number;
  hospital_name?: string;
  surgery_date: string;
  surgery_time?: string;
  surgery_end_time?: string;       
  calendar_event_id?: string;       
  diagnosis?: string;
  notes?: string;
  status: CaseStatus;
  status_display?: string;
  
  
  
  // Campos de estado
  is_operated?: boolean;
  is_billed?: boolean;
  is_paid?: boolean;
  invoice_number?: string | null;

  // Campos de médico ayudante
  assistant_doctor?: number | null;
  assistant_doctor_name?: string | null;
  assistant_display_name?: string;
  assistant_accepted?: boolean;
  assistant_notified_at?: string | null;
  
  // Permisos
  can_edit?: boolean;
  is_owner?: boolean;
  
  procedure_count?: number;
  total_rvu?: number;
  total_value?: number;
  primary_specialty?: string;
  procedures?: Procedure[];
  created_at: string;
  updated_at: string;
  created_by?: number;
  created_by_name?: string;
}

export interface CreateCaseData {
  patient_name: string;
  patient_id?: string;
  patient_age?: number;
  patient_gender?: PatientGender;
  hospital: number;
  surgery_date: string;
  surgery_time?: string;
  surgery_end_time?: string;       
  diagnosis?: string;
  notes?: string;
  procedures: Omit<Procedure, 'id'>[];
  
  
  // Campos de estado
  is_operated?: boolean;
  is_billed?: boolean;
  is_paid?: boolean;
  
  // Campos de médico ayudante
  assistant_doctor?: number | null;
  assistant_doctor_name?: string | null;
}

export interface UpdateCaseData extends Partial<CreateCaseData> {
  status?: CaseStatus;
  is_operated?: boolean;
  is_billed?: boolean;
  is_paid?: boolean;
  invoice_number?: string | null;
  calendar_event_id?: string | null;
}

// Tipos para respuestas de invitaciones
export interface AssistedCasesResponse {
  pending_invitations: SurgicalCase[];
  accepted_cases: SurgicalCase[];
  total_pending: number;
  total_accepted: number;
}

export interface InvitationResponse {
  message: string;
  case?: SurgicalCase;
}