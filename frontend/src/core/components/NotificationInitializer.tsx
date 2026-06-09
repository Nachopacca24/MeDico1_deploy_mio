// src/core/components/NotificationInitializer.tsx

import { useEffect } from 'react';
import { useToast } from '@/shared/hooks/useToast';
import { notificationService } from '@/services/notificationService';
import { pushNotificationService } from '@/services/pushNotificationService';
import { useAuth } from '@/shared/contexts/AuthContext';

export function NotificationInitializer() {
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    notificationService.initialize();
    notificationService.requestPermission();

    const handleReminder = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { patientName, hospitalName } = customEvent.detail;
      toast.warning(
        '🏥 Recordatorio de Cirugía',
        `Cirugía de ${patientName} en ${hospitalName} en 5 horas`
      );
    };

    window.addEventListener('surgery-reminder', handleReminder);
    return () => {
      window.removeEventListener('surgery-reminder', handleReminder);
      notificationService.destroy();
    };
  }, [toast]);

  // Initialize FCM only when user is authenticated
  useEffect(() => {
    if (!user) return;
    pushNotificationService.init();
  }, [user]);

  return null;
}