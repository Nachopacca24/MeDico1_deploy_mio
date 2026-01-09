// src/shared/services/emailVerificationService.ts

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface VerificationResponse {
  message: string;
  email?: string;
  username?: string;
}

export interface VerificationStatus {
  is_email_verified: boolean;
  email: string;
  username: string;
  can_resend: boolean;
}

class EmailVerificationService {
  /**
   * Envía un email de verificación a una dirección específica
   * Útil para registro o reenvío público
   */
  async sendVerificationEmail(email: string): Promise<VerificationResponse> {
    const response = await fetch(`${API_URL}/api/auth/send-verification/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al enviar email de verificación');
    }

    return await response.json();
  }

  /**
   * Verifica el email usando el token recibido
   */
  async verifyEmail(token: string): Promise<VerificationResponse> {
    const response = await fetch(`${API_URL}/api/auth/verify-email/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Token inválido o expirado');
    }

    return await response.json();
  }

  /**
   * Reenvía el email de verificación al usuario autenticado
   * Requiere token JWT
   */
  async resendVerificationEmail(accessToken: string): Promise<VerificationResponse> {
    const response = await fetch(`${API_URL}/api/auth/resend-verification/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al reenviar email');
    }

    return await response.json();
  }

  /**
   * Verifica el estado de verificación del usuario autenticado
   * Requiere token JWT
   */
  async checkVerificationStatus(accessToken: string): Promise<VerificationStatus> {
    const response = await fetch(`${API_URL}/api/auth/verification-status/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al verificar estado');
    }

    return await response.json();
  }
}

export const emailVerificationService = new EmailVerificationService();