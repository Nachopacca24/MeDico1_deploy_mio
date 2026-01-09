// src/services/calendarSyncService.ts

import { googleCalendarService, type CalendarEvent } from './googleCalendarService';
import type { SurgicalCase } from '@/types/surgical-case';

class CalendarSyncService {
  /**
   * Crear evento en Google Calendar para un caso quirúrgico
   * Retorna el eventId si fue exitoso, null si falló
   */
  async createEventForCase(surgicalCase: SurgicalCase): Promise<string | null> {
    // Verificar si está conectado
    if (!googleCalendarService.isConnected()) {
      console.log('Google Calendar no está conectado');
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
        : this.buildDateTime(surgicalCase.surgery_date, surgicalCase.surgery_time || '08:00', 2); // +2 horas por defecto

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
            { method: 'popup', minutes: 60 },    // 1 hora antes
            { method: 'popup', minutes: 1440 },  // 1 día antes
          ],
        },
      };

      const eventId = await googleCalendarService.createEvent(event);
      console.log('✅ Evento creado en Google Calendar:', eventId);
      return eventId;
    } catch (error) {
      console.error('❌ Error al crear evento en Google Calendar:', error);
      return null;
    }
  }

  /**
   * Actualizar evento existente en Google Calendar
   * Si no existe calendar_event_id, NO crea uno nuevo (eso debe hacerse explícitamente)
   */
  async updateEventForCase(surgicalCase: SurgicalCase): Promise<boolean> {
    if (!googleCalendarService.isConnected()) {
      console.log('⚠️ Google Calendar no está conectado');
      return false;
    }

    // ✅ IMPORTANTE: Si no tiene calendar_event_id, NO actualizar (evita crear duplicados)
    if (!surgicalCase.calendar_event_id) {
      console.log('⚠️ Caso sin calendar_event_id, no se puede actualizar. Usa createEventForCase en su lugar.');
      return false;
    }

    try {
      const startDateTime = this.buildDateTime(
        surgicalCase.surgery_date,
        surgicalCase.surgery_time || '08:00'
      );

      const endDateTime = surgicalCase.surgery_end_time
        ? this.buildDateTime(surgicalCase.surgery_date, surgicalCase.surgery_end_time)
        : this.buildDateTime(surgicalCase.surgery_date, surgicalCase.surgery_time || '08:00', 2);

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
      console.log('✅ Evento actualizado en Google Calendar:', surgicalCase.calendar_event_id);
      return true;
    } catch (error) {
      console.error('❌ Error al actualizar evento en Google Calendar:', error);
      return false;
    }
  }

  /**
   * Eliminar evento de Google Calendar
   */
  async deleteEventForCase(calendarEventId: string): Promise<boolean> {
    if (!googleCalendarService.isConnected()) {
      return false;
    }

    if (!calendarEventId) {
      return true; // No hay nada que eliminar
    }

    try {
      await googleCalendarService.deleteEvent(calendarEventId);
      console.log('✅ Evento eliminado de Google Calendar');
      return true;
    } catch (error) {
      console.error('❌ Error al eliminar evento de Google Calendar:', error);
      return false;
    }
  }

  /**
   * Construir fecha/hora en formato ISO
   */
  private buildDateTime(date: string, time: string, addHours: number = 0): string {
    const [hours, minutes] = time.split(':').map(Number);
    const dateTime = new Date(date);
    dateTime.setHours(hours + addHours, minutes, 0, 0);
    return dateTime.toISOString();
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