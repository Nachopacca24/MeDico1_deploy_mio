import { googleCalendarService, type CalendarEvent } from './googleCalendarService';
import { authService } from '@/shared/services/authService';
import type { SurgicalCase, CaseStatus } from '@/types/surgical-case';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Statuses that mean the surgery is finished or cancelled — skip calendar sync
const CLOSED_STATUSES: CaseStatus[] = ['completed', 'billed', 'paid', 'cancelled'];

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
      const startDateTime = this.buildDateTime(
        surgicalCase.surgery_date,
        surgicalCase.surgery_time
      );

      let endDateTime = this.isValidTime(surgicalCase.surgery_end_time)
        ? this.buildDateTime(surgicalCase.surgery_date, surgicalCase.surgery_end_time)
        : this.buildDateTime(surgicalCase.surgery_date, surgicalCase.surgery_time, 2);

      // Guard: end must be strictly after start
      if (endDateTime <= startDateTime) {
        endDateTime = new Date(new Date(startDateTime).getTime() + 2 * 60 * 60 * 1000).toISOString();
      }

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

      const startDateTime = this.buildDateTime(
        surgicalCase.surgery_date,
        surgicalCase.surgery_time
      );

      let endDateTime = this.isValidTime(surgicalCase.surgery_end_time)
        ? this.buildDateTime(surgicalCase.surgery_date, surgicalCase.surgery_end_time)
        : this.buildDateTime(surgicalCase.surgery_date, surgicalCase.surgery_time, 2);

      // Guard: end must be strictly after start
      if (endDateTime <= startDateTime) {
        endDateTime = new Date(new Date(startDateTime).getTime() + 2 * 60 * 60 * 1000).toISOString();
      }

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
   * Sync active cases that are missing a Google Calendar event.
   *
   * Filters:
   *   - is_owner === true (the user is the case creator — non-owners can't write calendar_event_id)
   *   - status not in CLOSED_STATUSES
   *   - surgery_date is set
   *   - calendar_event_id is absent
   *
   * Checks the token before every iteration. If it expires mid-sync the loop
   * stops early and returns paused: true so the caller can prompt reconnect.
   */
  async syncMissingCases(
    cases: SurgicalCase[]
  ): Promise<{ synced: number; failed: number; paused: boolean; message?: string }> {
    if (!googleCalendarService.isConnected()) {
      return { synced: 0, failed: 0, paused: false };
    }

    const toSync = cases.filter(
      c =>
        c.is_owner &&
        c.surgery_date &&
        !CLOSED_STATUSES.includes(c.status) &&
        !c.calendar_event_id
    );

    let synced = 0;
    let failed = 0;

    for (const surgicalCase of toSync) {
      // Check token before each case — it may have expired mid-loop
      if (!googleCalendarService.isConnected()) {
        return {
          synced,
          failed,
          paused: true,
          message: 'Sincronización pausada: reconecta Google Calendar para continuar',
        };
      }

      try {
        const eventId = await this.createEventForCase(surgicalCase);
        if (!eventId) {
          failed++;
          continue;
        }
        await authService.authenticatedFetch(
          `${API_URL}/api/v1/medico/cases/${surgicalCase.id}/sync-calendar/`,
          { method: 'POST', body: JSON.stringify({ calendar_event_id: eventId }) }
        );
        synced++;
      } catch {
        failed++;
      }
    }

    return { synced, failed, paused: false };
  }

  /**
   * Validate that a time string is a proper "HH:MM" value.
   */
  private isValidTime(time: string | null | undefined): time is string {
    if (!time || typeof time !== 'string') return false;
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return false;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }

  /**
   * Build an ISO datetime string from a date + time.
   * addHours is applied after parsing. Falls back to 08:00 if time is invalid.
   */
  private buildDateTime(date: string, time: string | null | undefined, addHours: number = 0): string {
    const [year, month, day] = date.split('-').map(Number);
    const safeTime = this.isValidTime(time) ? time : '08:00';
    const [hours, minutes] = safeTime.split(':').map(Number);
    const dateTime = new Date(year, month - 1, day, hours + addHours, minutes, 0, 0);
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