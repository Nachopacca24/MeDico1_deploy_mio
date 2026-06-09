// src/shared/hooks/useGoogleCalendar.ts

import { useState, useEffect, useCallback } from 'react';
import { googleCalendarService, CalendarEvent } from '@/services/googleCalendarService';
import { useToast } from '@/shared/hooks/use-toast';

const CACHE_KEY = 'medico_gcal_status';

function readCache(): { connected: boolean; email: string } {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : { connected: false, email: '' };
  } catch {
    return { connected: false, email: '' };
  }
}

function writeCache(connected: boolean, email: string) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ connected, email }));
}

export function useGoogleCalendar() {
  // Initialise from cache so the UI is correct on first render — no flash
  const cached = readCache();
  const [isConnected, setIsConnected] = useState(cached.connected);
  const [userEmail, setUserEmail] = useState<string | null>(cached.email || null);
  const [isLoading, setIsLoading] = useState(!cached.connected); // skip spinner if cached connected
  const { toast } = useToast();

  // Ask the backend — always runs in background to verify/update the cached state.
  const checkConnection = useCallback(async () => {
    try {
      const status = await googleCalendarService.checkStatus();
      setIsConnected(status.connected);
      setUserEmail(status.connected ? status.email : null);
      writeCache(status.connected, status.connected ? status.email : '');
    } catch {
      // Network error: keep showing cached state rather than flashing "disconnected"
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();

    const onFocus = () => checkConnection();
    const onVisibility = () => { if (document.visibilityState === 'visible') checkConnection(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
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
      writeCache(false, '');
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
