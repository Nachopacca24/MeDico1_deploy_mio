export type Schema = {
  specialties: {
    id?: number;
    name: string;
    description?: string | null;
  };
  
  hospitals: {
    id?: number;
    name: string;
    location?: string | null;
    rateMultiplier?: number;
  };
  
  operations: {
    id?: number;
    name: string;
    code?: string | null;
    specialtyId: number;
    basePoints: number;
    description?: string | null;
    complexity?: number;
  };
  
  hospitalOperationRates: {
    id?: number;
    hospitalId: number;
    operationId: number;
    pointValue: number;
    currencyPerPoint: number;
    lastUpdated?: string;
  };
  
  favorites: {
    id?: number;
    userId: string;
    operationId: number;
    createdAt?: string;
  };
  
  calculationHistory: {
    id?: number;
    userId: string;
    operationId: number;
    hospitalId: number;
    calculatedValue: number;
    calculatedAt?: string;
    notes?: string | null;
  };
}