/**
 * Custom error classes for authentication
 */

export interface ApiErrorResponse {
  [key: string]: string | string[];
}

export class AuthError extends Error {
  public statusCode: number;
  public errors: ApiErrorResponse;

  constructor(message: string, statusCode: number, errors: ApiErrorResponse = {}) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.errors = errors;
    
    // Maintain proper stack trace for where error was thrown (only available on V8)
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, AuthError);
    }
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    // If there are field-specific errors, return the first one
    const firstError = Object.values(this.errors)[0];
    if (firstError) {
      return Array.isArray(firstError) ? firstError[0] : firstError;
    }
    
    return this.message;
  }

  /**
   * Get all error messages as a flat array
   */
  getAllMessages(): string[] {
    const messages: string[] = [];
    
    for (const value of Object.values(this.errors)) {
      if (Array.isArray(value)) {
        messages.push(...value);
      } else {
        messages.push(value);
      }
    }
    
    return messages.length > 0 ? messages : [this.message];
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'No se pudo conectar. Verificá tu conexión a internet e intentá de nuevo.') {
    super(message);
    this.name = 'NetworkError';
    
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, NetworkError);
    }
  }
}

export class TokenRefreshError extends Error {
  constructor(message: string = 'Unable to refresh authentication token') {
    super(message);
    this.name = 'TokenRefreshError';
    
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, TokenRefreshError);
    }
  }
}

/**
 * Parse error response from API and create appropriate error
 */
// Generic, user-facing fallback — never show a raw response body (HTML error
// pages from a proxy/gateway timeout, a backend traceback, etc.) to the user.
// Those details are only useful to a developer, so they go to console.error.
function genericMessageFor(status: number): string {
  if (status >= 500) return 'El servidor no está disponible en este momento. Intentá de nuevo en unos minutos.';
  if (status === 0) return 'No se pudo conectar. Verificá tu conexión a internet.';
  return 'Ocurrió un error inesperado. Intentá de nuevo.';
}

export async function parseAuthError(response: Response): Promise<AuthError> {
  let errors: ApiErrorResponse = {};
  let message = genericMessageFor(response.status);

  try {
    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.error(
        '[parseAuthError] Non-JSON response',
        { status: response.status, url: response.url, body: text.slice(0, 500) || '(empty body)' },
      );
      return new AuthError(message, response.status, errors);
    }

    if (typeof data === 'object') {
      errors = data;

      // Extract message from common error formats
      if (data.detail) {
        message = data.detail;
      } else if (data.message) {
        message = data.message;
      } else if (data.error) {
        message = data.error;
      } else {
        // Get first error message
        const firstError = Object.values(data)[0];
        if (firstError) {
          message = Array.isArray(firstError) ? firstError[0] : String(firstError);
        }
      }
    }
  } catch (e) {
    console.error('[parseAuthError] Failed to read response body', e);
  }

  return new AuthError(message, response.status, errors);
}
