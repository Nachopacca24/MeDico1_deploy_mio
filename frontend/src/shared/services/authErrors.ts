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
  constructor(message: string = 'Network error. Please check your connection.') {
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
export async function parseAuthError(response: Response): Promise<AuthError> {
  let errors: ApiErrorResponse = {};
  let message = 'An error occurred';

  try {
    const data = await response.json();
    
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
    // If parsing fails, use generic message
    message = `Request failed with status ${response.status}`;
  }

  return new AuthError(message, response.status, errors);
}
