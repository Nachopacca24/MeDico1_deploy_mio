// src/core/components/NotificationInitializer.tsx

import { useEffect } from 'react';
import { useToast } from '@/shared/hooks/useToast';
import { notificationService } from '@/services/notificationService';

export function NotificationInitializer() {
  const { toast } = useToast();

  useEffect(() => {
    // Inicializar servicio de notificaciones
    notificationService.initialize();
    
    // Pedir permiso para notificaciones del navegador
    notificationService.requestPermission();
    
    // Escuchar eventos de recordatorio de cirugía
    const handleReminder = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { patientName, hospitalName } = customEvent.detail;
      
      toast.warning(
        '🏥 Recordatorio de Cirugía',
        `Cirugía de ${patientName} en ${hospitalName} en 5 horas`
      );
    };
    
    window.addEventListener('surgery-reminder', handleReminder);
    
    // Cleanup
    return () => {
      window.removeEventListener('surgery-reminder', handleReminder);
      notificationService.destroy();
    };
  }, [toast]);

  return null;
}