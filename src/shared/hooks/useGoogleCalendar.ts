// src/shared/hooks/useGoogleCalendar.ts

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
      console.log(`✅ Google Calendar conectado para usuario: ${user.email}`);
    } else {
      setUserEmail(null);
    }
  }, [getCurrentUser]);

  /**
   * 🔒 Verificar conexión al montar el hook
   */
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

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
      console.log(`🔗 Iniciando conexión a Google Calendar para: ${user.email}`);
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
        console.log(`✅ Conectado exitosamente a Google Calendar`);
      }
    } catch (error) {
      console.error('❌ Error al conectar:', error);
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
    console.log(`🔌 Desconectando Google Calendar para: ${user?.email || 'unknown'}`);
    
    try {
      await googleCalendarService.disconnect();
      setIsConnected(false);
      setUserEmail(null);
      toast({
        title: "Desconectado",
        description: "Tu cuenta de Google Calendar ha sido desconectada",
      });
      console.log('✅ Desconectado exitosamente');
    } catch (error) {
      console.error('❌ Error al desconectar:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Hubo un problema al desconectar",
      });
    }
  }, [getCurrentUser, toast]);

  /**
   * Crear evento en Google Calendar
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
      console.log(`✅ Evento creado: ${eventId}`);
      return eventId;
    } catch (error) {
      console.error('❌ Error al crear evento:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear el evento",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, getCurrentUser, toast]);

  /**
   * Actualizar evento en Google Calendar
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
      console.log(`✅ Evento actualizado: ${eventId}`);
      return true;
    } catch (error) {
      console.error('❌ Error al actualizar evento:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el evento",
      });
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
      console.log(`✅ Evento eliminado: ${eventId}`);
      return true;
    } catch (error) {
      console.error('❌ Error al eliminar evento:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el evento",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, getCurrentUser, toast]);

  /**
   * Obtener eventos de Google Calendar
   */
  const getEvents = useCallback(async (startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
    const user = getCurrentUser();
    
    if (!user) {
      console.warn('⚠️ No hay usuario autenticado');
      return [];
    }

    if (!isConnected) {
      console.warn('⚠️ Google Calendar no está conectado');
      return [];
    }

    setIsLoading(true);
    try {
      const events = await googleCalendarService.getEvents(startDate, endDate);
      console.log(`✅ Eventos obtenidos: ${events.length}`);
      return events;
    } catch (error) {
      console.error('❌ Error al obtener eventos:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron obtener los eventos",
      });
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