// src/pages/verify-email.tsx
// src/pages/verify-email.tsx

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { emailVerificationService } from '@/shared/services/emailVerificationService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';

type VerificationState = 'loading' | 'success' | 'error';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerificationState>('loading');
  const [message, setMessage] = useState('');
  const [userInfo, setUserInfo] = useState<{ email?: string; username?: string }>({});

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setState('error');
        setMessage('Token de verificación no encontrado en la URL');
        return;
      }

      try {
        const response = await emailVerificationService.verifyEmail(token);
        setState('success');
        setMessage(response.message || 'Email verificado exitosamente');
        setUserInfo({
          email: response.email,
          username: response.username,
        });

        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: '¡Email verificado! Ahora puedes iniciar sesión.' 
            } 
          });
        }, 3000);
      } catch (error: any) {
        setState('error');
        setMessage(error.message || 'Error al verificar el email. El token puede haber expirado.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="flex justify-center mb-4">
            {state === 'loading' && (
              <div className="relative">
                <Mail className="h-16 w-16 text-blue-500 animate-pulse" />
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            )}
            {state === 'success' && (
              <div className="relative">
                <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-4">
                  <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
                </div>
              </div>
            )}
            {state === 'error' && (
              <div className="relative">
                <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4">
                  <XCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
                </div>
              </div>
            )}
          </div>

          <CardTitle className="text-2xl font-bold">
            {state === 'loading' && 'Verificando tu email...'}
            {state === 'success' && '¡Email verificado!'}
            {state === 'error' && 'Error de verificación'}
          </CardTitle>
          
          <CardDescription className="text-base">
            {state === 'loading' && 'Por favor espera mientras verificamos tu dirección de email.'}
            {state === 'success' && 'Tu cuenta ha sido verificada exitosamente.'}
            {state === 'error' && 'No pudimos verificar tu email.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Message */}
          <div className={`p-4 rounded-lg ${
            state === 'loading' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' :
            state === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
            'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <p className={`text-sm text-center ${
              state === 'loading' ? 'text-blue-800 dark:text-blue-200' :
              state === 'success' ? 'text-green-800 dark:text-green-200' :
              'text-red-800 dark:text-red-200'
            }`}>
              {message}
            </p>
          </div>

          {/* User Info (solo en success) */}
          {state === 'success' && (userInfo.email || userInfo.username) && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              {userInfo.username && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usuario:</span>
                  <span className="font-medium">{userInfo.username}</span>
                </div>
              )}
              {userInfo.email && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{userInfo.email}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {state === 'success' && (
            <div className="space-y-3">
              <div className="text-center text-sm text-muted-foreground">
                Serás redirigido al login en 3 segundos...
              </div>
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full"
              >
                Ir al Login ahora
              </Button>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full"
                variant="outline"
              >
                Volver al Login
              </Button>
              <Button 
                onClick={() => navigate('/signup')} 
                className="w-full"
              >
                Crear nueva cuenta
              </Button>
            </div>
          )}

          {state === 'loading' && (
            <div className="flex justify-center">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Procesando verificación...</span>
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="text-center text-xs text-muted-foreground">
            MéDico1 © {new Date().getFullYear()}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default VerifyEmailPage;