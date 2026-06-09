// src/shared/hooks/useGoogleCalendar.ts

import { useState, useEffect, useCallback } from 'react';
import { googleCalendarService, CalendarEvent } from '@/services/googleCalendarService';
import { useToast } from '@/shared/hooks/use-toast';

export function useGoogleCalendar() {
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true while checking backend
  const { toast } = useToast();

  // Ask the backend whether this user has a stored connection.
  const checkConnection = useCallback(async () => {
    try {
      const status = await googleCalendarService.checkStatus();
      setIsConnected(status.connected);
      setUserEmail(status.connected ? status.email : null);
    } catch {
      setIsConnected(false);
      setUserEmail(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();

    // Re-check when the tab/app comes back to focus — another device may have
    // connected or disconnected in the meantime.
    const onFocus = () => checkConnection();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkConnection();
    });

    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [checkConnection]);

  const connect = useCallback(() => {
    googleCalendarService.connect();
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await googleCalendarService.disconnect();
      setIsConnected(false);
      setUserEmail(null);
      toast({ title: 'Desconectado', description: 'Tu cuenta de Google Calendar ha sido desconectada' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Hubo un problema al desconectar' });
    }
  }, [toast]);

  const getEvents = useCallback(async (startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
    if (!isConnected) return [];
    try {
      return await googleCalendarService.getEvents(startDate, endDate);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('expirada')) {
        setIsConnected(false);
        setUserEmail(null);
        toast({ variant: 'destructive', title: 'Sesión expirada', description: 'Reconecta Google Calendar.' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: msg || 'No se pudieron obtener los eventos' });
      }
      return [];
    }
  }, [isConnected, toast]);

  const createEvent = useCallback(async (event: CalendarEvent): Promise<string | null> => {
    if (!isConnected) return null;
    try {
      const id = await googleCalendarService.createEvent(event);
      toast({ title: 'Evento creado', description: 'El evento se agregó a tu Google Calendar' });
      return id;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('expirada')) {
        setIsConnected(false);
        setUserEmail(null);
        toast({ variant: 'destructive', title: 'Sesión expirada', description: 'Reconecta Google Calendar.' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: msg || 'No se pudo crear el evento' });
      }
      return null;
    }
  }, [isConnected, toast]);

  const updateEvent = useCallback(async (eventId: string, event: CalendarEvent): Promise<boolean> => {
    if (!isConnected) return false;
    try {
      await googleCalendarService.updateEvent(eventId, event);
      toast({ title: 'Evento actualizado', description: 'El evento se actualizó en tu Google Calendar' });
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      toast({ variant: 'destructive', title: 'Error', description: msg || 'No se pudo actualizar el evento' });
      return false;
    }
  }, [isConnected, toast]);

  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    if (!isConnected) return false;
    try {
      await googleCalendarService.deleteEvent(eventId);
      toast({ title: 'Evento eliminado', description: 'El evento se eliminó de tu Google Calendar' });
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      toast({ variant: 'destructive', title: 'Error', description: msg || 'No se pudo eliminar el evento' });
      return false;
    }
  }, [isConnected, toast]);

  return {
    isConnected,
    userEmail,
    isLoading,
    connect,
    disconnect,
    createEvent,
    updateEvent,
    deleteEvent,
    getEvents,
    checkConnection,
  };
}
