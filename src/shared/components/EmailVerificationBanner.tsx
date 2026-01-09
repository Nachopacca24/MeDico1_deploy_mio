// src/shared/components/EmailVerificationBanner.tsx

import { useState } from 'react';
import { useAuth } from '@/shared/contexts/AuthContext';
import { emailVerificationService } from '@/shared/services/emailVerificationService';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Mail, Loader2, X } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';

export function EmailVerificationBanner() {
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Solo mostrar si el usuario no ha verificado su email y no ha sido descartado
  if (!user || user.is_email_verified === true || isDismissed) {
    return null;
  }

  const handleResend = async () => {
    if (!accessToken) {
      toast({
        title: 'Error',
        description: 'Debes iniciar sesión para reenviar el email',
        variant: 'destructive',
      });
      return;
    }
    
    setIsResending(true);
    try {
      await emailVerificationService.resendVerificationEmail(accessToken);
      toast({
        title: 'Email enviado',
        description: 'Revisa tu bandeja de entrada y carpeta de spam.',
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo reenviar el email. Intenta más tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <Alert className='relative border-amber-500 bg-amber-50 dark:bg-amber-950 mb-4'>
      <Mail className='h-4 w-4 text-amber-600' />
      <AlertDescription className='flex items-center justify-between pr-8'>
        <span className='text-sm text-amber-900 dark:text-amber-100'>
          <strong>Verifica tu email</strong> para acceder a todas las funciones de MéDico1.
        </span>
        <Button
          size='sm'
          variant='outline'
          onClick={handleResend}
          disabled={isResending}
          className='ml-4 border-amber-600 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900'
        >
          {isResending ? (
            <>
              <Loader2 className='mr-2 h-3 w-3 animate-spin' />
              Enviando...
            </>
          ) : (
            'Reenviar email'
          )}
        </Button>
      </AlertDescription>
      <button
        onClick={handleDismiss}
        className='absolute right-2 top-2 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-amber-400'
        aria-label='Cerrar'
      >
        <X className='h-4 w-4 text-amber-600' />
      </button>
    </Alert>
  );
}