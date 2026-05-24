// src/shared/hooks/useGoogleCalendar.ts - VERSIÓN MEJORADA

import { useState, useEffect, useCallback } from 'react';
import { googleCalendarService, CalendarEvent } from '@/services/googleCalendarService';
import { useToast } from '@/shared/hooks/use-toast';

export function useGoogleCalendar() {
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  /**
   * 🔒 Obtener usuario actual del localStorage
   */
  const getCurrentUser = useCallback(() => {
    const userStr = localStorage.getItem('medico_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }, []);

  /**
   * 🔒 Verificar conexión inicial y cuando cambia el usuario
   */
  const checkConnection = useCallback(() => {
    const user = getCurrentUser();

    if (!user) {
      setIsConnected(false);
      setUserEmail(null);
      return;
    }

    const connected = googleCalendarService.isConnected();
    setIsConnected(connected);

    if (connected) {
      const email = googleCalendarService.getUserEmail();
      setUserEmail(email);
    } else {
      setUserEmail(null);
    }
  }, [getCurrentUser]);

  /**
   * 🔒 Verificar conexión al montar el hook y cada 60 segundos
   */
  useEffect(() => {
    checkConnection();

    // ✅ Verificar conexión periódicamente
    const interval = setInterval(() => {
      const wasConnected = isConnected;
      checkConnection();
      const nowConnected = googleCalendarService.isConnected();

      // Si se desconectó, notificar al usuario
      if (wasConnected && !nowConnected) {
          toast({
          variant: "destructive",
          title: "Google Calendar desconectado",
          description: "Tu sesión de Google Calendar expiró. Por favor, reconéctate.",
          duration: 5000,
        });
      }
    }, 60000); // Cada 60 segundos

    return () => clearInterval(interval);
  }, [checkConnection, isConnected, toast]);

  /**
   * 🔒 Conectar a Google Calendar
   */
  const connect = useCallback(async () => {
    const user = getCurrentUser();

    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión primero",
      });
      return;
    }

    setIsLoading(true);
    try {
      await googleCalendarService.connect();

      // Verificar conexión exitosa
      const connected = googleCalendarService.isConnected();
      setIsConnected(connected);

      if (connected) {
        const email = googleCalendarService.getUserEmail();
        setUserEmail(email);
        toast({
          title: "¡Conectado!",
          description: `Google Calendar conectado exitosamente`,
        });
      }
    } catch (error) {
            toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo iniciar la conexión con Google Calendar",
      });
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentUser, toast]);

  /**
   * 🔒 Desconectar de Google Calendar
   */
  const disconnect = useCallback(async () => {
    const user = getCurrentUser();
    try {
      await googleCalendarService.disconnect();
      setIsConnected(false);
      setUserEmail(null);
      toast({
        title: "Desconectado",
        description: "Tu cuenta de Google Calendar ha sido desconectada",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Hubo un problema al desconectar",
      });
    }
  }, [getCurrentUser, toast]);

  /**
   * ✅ MEJORADO: Crear evento con manejo de errores de token expirado
   */
  const createEvent = useCallback(async (event: CalendarEvent): Promise<string | null> => {
    const user = getCurrentUser();

    if (!user) {
      toast({
        variant: "destructive",
        title: "No autenticado",
        description: "Debes iniciar sesión primero",
      });
      return null;
    }

    if (!isConnected) {
      toast({
        variant: "destructive",
        title: "No conectado",
        description: "Debes conectar tu cuenta de Google Calendar primero",
      });
      return null;
    }

    setIsLoading(true);
    try {
      const eventId = await googleCalendarService.createEvent(event);
      toast({
        title: "Evento creado",
        description: "El evento ha sido agregado a tu Google Calendar",
      });
      return eventId;
    } catch (error: any) {

      // ✅ Detectar token expirado
      if (error.message?.includes('expirada')) {
        setIsConnected(false);
        setUserEmail(null);
        toast({
          variant: "destructive",
          title: "Sesión expirada",
          description: "Tu sesión de Google Calendar expiró. Por favor, reconéctate.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "No se pudo crear el evento",
        });
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, getCurrentUser, toast]);

  /**
   * ✅ MEJORADO: Actualizar evento con manejo de errores
   */
  const updateEvent = useCallback(async (eventId: string, event: CalendarEvent): Promise<boolean> => {
    const user = getCurrentUser();

    if (!user) {
      toast({
        variant: "destructive",
        title: "No autenticado",
        description: "Debes iniciar sesión primero",
      });
      return false;
    }

    if (!isConnected) {
      toast({
        variant: "destructive",
        title: "No conectado",
        description: "Debes conectar tu cuenta de Google Calendar primero",
      });
      return false;
    }

    setIsLoading(true);
    try {
      await googleCalendarService.updateEvent(eventId, event);
      toast({
        title: "Evento actualizado",
        description: "El evento ha sido actualizado en tu Google Calendar",
      });
      return true;
    } catch (error: any) {

      // ✅ Detectar token expirado
      if (error.message?.includes('expirada')) {
        setIsConnected(false);
        setUserEmail(null);
        toast({
          variant: "destructive",
          title: "Sesión expirada",
          description: "Tu sesión de Google Calendar expiró. Por favor, reconéctate.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "No se pudo actualizar el evento",
        });
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, getCurrentUser, toast]);

  /**
   * Eliminar evento de Google Calendar
   */
  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    const user = getCurrentUser();

    if (!user) {
      return false;
    }

    if (!isConnected) {
      return false;
    }

    setIsLoading(true);
    try {
      await googleCalendarService.deleteEvent(eventId);
      toast({
        title: "Evento eliminado",
        description: "El evento ha sido eliminado de tu Google Calendar",
      });
      return true;
    } catch (error: any) {

      // ✅ Detectar token expirado
      if (error.message?.includes('expirada')) {
        setIsConnected(false);
        setUserEmail(null);
        toast({
          variant: "destructive",
          title: "Sesión expirada",
          description: "Tu sesión de Google Calendar expiró. Por favor, reconéctate.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "No se pudo eliminar el evento",
        });
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, getCurrentUser, toast]);

  /**
   * ✅ MEJORADO: Obtener eventos con manejo de errores
   */
  const getEvents = useCallback(async (startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
    const user = getCurrentUser();

    if (!user) {
      return [];
    }

    if (!isConnected) {
      return [];
    }

    setIsLoading(true);
    try {
      return await googleCalendarService.getEvents(startDate, endDate);
    } catch (error: any) {

      // ✅ Detectar token expirado
      if (error.message?.includes('expirada')) {
        setIsConnected(false);
        setUserEmail(null);
        toast({
          variant: "destructive",
          title: "Sesión expirada",
          description: "Tu sesión de Google Calendar expiró. Por favor, reconéctate.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "No se pudieron obtener los eventos",
        });
      }

      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, getCurrentUser, toast]);

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
    checkConnection
  };
}