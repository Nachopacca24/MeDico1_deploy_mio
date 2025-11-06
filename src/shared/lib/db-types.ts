/**
 * Tipos de esquema de base de datos para MeDico
 * Coincide con los modelos de Django (snake_case del backend)
 */
export type Schema = {
  specialties: {
    id?: number;
    name: string;
    description?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  
  hospitals: {
    id?: number;
    name: string;
    location?: string | null;
    rate_multiplier?: number;  // Django usa snake_case
    created_at?: string;
    updated_at?: string;
  };
  
  operations: {
    id?: number;
    name: string;
    code?: string | null;
    specialty_id: number;  // Django usa snake_case (ForeignKey con _id)
    base_points: number;  // Django usa snake_case
    description?: string | null;
    complexity?: number;
    created_at?: string;
    updated_at?: string;
  };
  
  hospitalOperationRates: {
    id?: number;
    hospital_id: number;  // Django usa snake_case
    operation_id: number;  // Django usa snake_case
    point_value: number;  // Django usa snake_case
    currency_per_point: number;  // Django usa snake_case
    last_updated?: string;  // Django usa snake_case
  };
  
  favorites: {
    id?: number;
    user_id: number;  // Django usa snake_case. Number porque Django AutoField es integer
    operation_id: number;  // Django usa snake_case
    created_at?: string;  // Django usa snake_case
  };
  
  calculationHistory: {
    id?: number;
    user_id: number;  // Django usa snake_case. Number porque Django AutoField es integer
    operation_id: number;  // Django usa snake_case
    hospital_id: number;  // Django usa snake_case
    calculated_value: number;  // Django usa snake_case
    calculated_at?: string;  // Django usa snake_case
    notes?: string | null;
  };
}