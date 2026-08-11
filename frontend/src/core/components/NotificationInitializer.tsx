// src/core/components/NotificationInitializer.tsx

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/shared/hooks/useToast';
import { notificationService } from '@/services/notificationService';
import { pushNotificationService } from '@/services/pushNotificationService';
import { useAuth } from '@/shared/contexts/AuthContext';

export function NotificationInitializer() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  // Guards against showing this more than once per app session — e.g. if `user`
  // legitimately changes reference more than once (profile update, refreshUser),
  // re-running init() while permission is still denied shouldn't pile up toasts.
  const deniedToastShownRef = useRef(false);

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

  // Handle navigation from push notification taps.
  // pushNotificationService dispatches 'notification_navigate' when a notification
  // is tapped, and also stores the route in sessionStorage as a fallback for the
  // case where this component mounts after the event fires (killed-app launch).
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const route = (e as CustomEvent<{ route: string }>).detail?.route;
      if (route) navigate(route);
    };
    window.addEventListener('notification_navigate', handleNavigate);

    // Killed-app fallback: consume pending route stored before React mounted
    const pending = sessionStorage.getItem('pending_notification_route');
    if (pending) {
      sessionStorage.removeItem('pending_notification_route');
      navigate(pending);
    }

    return () => window.removeEventListener('notification_navigate', handleNavigate);
  }, [navigate]);

  // Initialize FCM only when user is authenticated
  useEffect(() => {
    if (!user) return;
    pushNotificationService.init().then((result) => {
      if (result === 'denied' && !deniedToastShownRef.current) {
        deniedToastShownRef.current = true;
        toast.warning(
          'Activá las notificaciones',
          'Las usamos para avisarte recordatorios de tus cirugías, invitaciones de colegas y actualizaciones — activalas desde Configuración del sistema para no perderte nada.',
        );
      }
    });
  }, [user, toast]);

  return null;
}