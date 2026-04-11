// src/services/calendarSyncService.ts - VERSIÓN MEJORADA

import { googleCalendarService, type CalendarEvent } from './googleCalendarService';
import type { SurgicalCase } from '@/types/surgical-case';

class CalendarSyncService {
  /**
   * ✅ MEJORADO: Crear evento con manejo de errores
   */
  async createEventForCase(surgicalCase: SurgicalCase): Promise<string | null> {
    // Verificar si está conectado
    if (!googleCalendarService.isConnected()) {
      console.log('⚠️ Google Calendar no está conectado');
      return null;
    }

    try {
      // Construir fecha/hora de inicio
      const startDateTime = this.buildDateTime(
        surgicalCase.surgery_date,
        surgicalCase.surgery_time || '08:00'
      );

      // Construir fecha/hora de fin
      const endDateTime = surgicalCase.surgery_end_time
        ? this.buildDateTime(surgicalCase.surgery_date, surgicalCase.surgery_end_time)
        : this.buildDateTime(surgicalCase.surgery_date, surgicalCase.surgery_time || '08:00', 2);

      // Construir descripción
      const description = this.buildEventDescription(surgicalCase);

      // Crear evento
      const event: CalendarEvent = {
        summary: `Cirugía: ${surgicalCase.patient_name}`,
        description: description,
        location: surgicalCase.hospital_name || 'Hospital',
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Guatemala',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/Guatemala',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 1440 },
          ],
        },
      };

      const eventId = await googleCalendarService.createEvent(event);
      console.log('✅ Evento creado en Google Calendar:', eventId);
      return eventId;
    } catch (error: any) {
      console.error('❌ Error al crear evento en Google Calendar:', error);

      // Si el error es por token expirado, mostrar mensaje específico
      if (error.message?.includes('expirada')) {
        console.warn('⚠️ Sesión de Google Calendar expirada');
      }

      return null;
    }
  }

  /**
   * ✅ CRÍTICO: Actualizar evento con VERIFICACIÓN de cambios reales
   */
  async updateEventForCase(surgicalCase: SurgicalCase): Promise<boolean> {
    if (!googleCalendarService.isConnected()) {
      console.log('⚠️ Google Calendar no está conectado');
      return false;
    }

    if (!surgicalCase.calendar_event_id) {
      console.log('⚠️ Caso sin calendar_event_id, no se puede actualizar');
      return false;
    }

    try {
      console.log('🔄 Actualizando evento en Google Calendar:', surgicalCase.calendar_event_id);
      console.log('📅 Nueva fecha:', surgicalCase.surgery_date);
      console.log('🕐 Nueva hora inicio:', surgicalCase.surgery_time);
      console.log('🕐 Nueva hora fin:', surgicalCase.surgery_end_time);

      // ✅ IMPORTANTE: Construir fechas CORRECTAMENTE
      const startDateTime = this.buildDateTime(
        surgicalCase.surgery_date,
        surgicalCase.surgery_time || '08:00'
      );

      const endDateTime = surgicalCase.surgery_end_time
        ? this.buildDateTime(surgicalCase.surgery_date, surgicalCase.surgery_end_time)
        : this.buildDateTime(surgicalCase.surgery_date, surgicalCase.surgery_time || '08:00', 2);

      console.log('✅ Fecha/hora construidas:');
      console.log('   Inicio:', startDateTime);
      console.log('   Fin:', endDateTime);

      const description = this.buildEventDescription(surgicalCase);

      const event: CalendarEvent = {
        summary: `Cirugía: ${surgicalCase.patient_name}`,
        description: description,
        location: surgicalCase.hospital_name || 'Hospital',
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Guatemala',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/Guatemala',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 1440 },
          ],
        },
      };

      await googleCalendarService.updateEvent(surgicalCase.calendar_event_id, event);
      console.log('✅ Evento actualizado exitosamente en Google Calendar');
      return true;
    } catch (error: any) {
      console.error('❌ Error al actualizar evento en Google Calendar:', error);

      // Si el error es por token expirado, mostrar mensaje específico
      if (error.message?.includes('expirada')) {
        console.warn('⚠️ Sesión de Google Calendar expirada');
      }

      return false;
    }
  }

  /**
   * Eliminar evento de Google Calendar
   */
  async deleteEventForCase(calendarEventId: string): Promise<boolean> {
    if (!googleCalendarService.isConnected()) {
      console.log('⚠️ Google Calendar no está conectado');
      return false;
    }

    if (!calendarEventId) {
      return true;
    }

    try {
      await googleCalendarService.deleteEvent(calendarEventId);
      console.log('✅ Evento eliminado de Google Calendar');
      return true;
    } catch (error: any) {
      console.error('❌ Error al eliminar evento de Google Calendar:', error);

      if (error.message?.includes('expirada')) {
        console.warn('⚠️ Sesión de Google Calendar expirada');
      }

      return false;
    }
  }

  /**
   * ✅ CRÍTICO: Construcción correcta de fecha/hora en formato ISO
   */
  private buildDateTime(date: string, time: string, addHours: number = 0): string {
    try {
      // Parsear la fecha (formato YYYY-MM-DD)
      const [year, month, day] = date.split('-').map(Number);

      // Parsear la hora (formato HH:MM)
      const [hours, minutes] = time.split(':').map(Number);

      // ✅ Crear fecha en zona horaria local de Guatemala
      const dateTime = new Date(year, month - 1, day, hours + addHours, minutes, 0, 0);

      // ✅ Convertir a ISO string
      const isoString = dateTime.toISOString();

      console.log(`📅 Construyendo fecha/hora: ${date} ${time} (+${addHours}h) -> ${isoString}`);

      return isoString;
    } catch (error) {
      console.error('❌ Error construyendo fecha/hora:', error);
      // Fallback: usar fecha actual
      return new Date().toISOString();
    }
  }

  /**
   * Construir descripción del evento
   */
  private buildEventDescription(surgicalCase: SurgicalCase): string {
    let description = `Paciente: ${surgicalCase.patient_name}\n`;

    if (surgicalCase.patient_age) {
      description += `Edad: ${surgicalCase.patient_age} años\n`;
    }

    if (surgicalCase.diagnosis) {
      description += `Diagnóstico: ${surgicalCase.diagnosis}\n`;
    }

    if (surgicalCase.hospital_name) {
      description += `Hospital: ${surgicalCase.hospital_name}\n`;
    }

    if (surgicalCase.procedure_count) {
      description += `\nProcedimientos: ${surgicalCase.procedure_count}\n`;
    }

    if (surgicalCase.procedures && surgicalCase.procedures.length > 0) {
      description += '\n--- Procedimientos ---\n';
      surgicalCase.procedures.forEach((proc, index) => {
        description += `${index + 1}. ${proc.surgery_name} (${proc.surgery_code})\n`;
      });
    }

    if (surgicalCase.notes) {
      description += `\nNotas: ${surgicalCase.notes}\n`;
    }

    description += `\n---\nCreado con MeDico`;

    return description;
  }
}

export const calendarSyncService = new CalendarSyncService();