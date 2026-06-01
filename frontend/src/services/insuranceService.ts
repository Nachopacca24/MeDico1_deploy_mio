import { authService } from '@/shared/services/authService';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/medico/insurances`;

export interface InsuranceCompany {
  id: number;
  name: string;
}

class InsuranceService {
  async getInsurances(): Promise<InsuranceCompany[]> {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as any).results)) return (data as any).results;
      return [];
    } catch (error) {
      console.error('Error fetching insurances:', error);
      throw error;
    }
  }
}

export const insuranceService = new InsuranceService();
