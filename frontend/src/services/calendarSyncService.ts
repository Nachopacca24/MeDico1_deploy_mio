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
  async createEventForCase(surgicalCase: SurgicalCase, stableId?: string): Promise<string | null> {
    if (!await googleCalendarService.getValidToken()) {
      return null;
    }

    let event: CalendarEvent | undefined;
    try {
      const startDateTime = this.buildDateTime(
        surgicalCase.surgery_date,
        surgicalCase.surgery_time
      );

      let endDateTime = this.isValidTime(surgicalCase.surgery_end_time)
        ? this.buildDateTime(surgicalCase.surgery_date, surgicalCase.surgery_end_time)
        : this.buildDateTime(surgicalCase.surgery_date, surgicalCase.surgery_time, 2);

      if (endDateTime <= startDateTime) {
        endDateTime = this.addHoursToLocalDateTime(startDateTime, 2);
      }

      const description = this.buildEventDescription(surgicalCase);

      const colorId = googleCalendarService.getCalendarColorId() || undefined;
      event = {
        summary: `Cirugía: ${surgicalCase.patient_name}`,
        description: description,
        location: surgicalCase.hospital_name || 'Hospital',
        ...(colorId ? { colorId } : {}),
        start: { dateTime: startDateTime, timeZone: 'America/Guatemala' },
        end: { dateTime: endDateTime, timeZone: 'America/Guatemala' },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 1440 },
          ],
        },
      };

      const eventId = await googleCalendarService.createEvent(event, stableId);
      console.log('✅ Evento creado en Google Calendar:', eventId, stableId ? '(stable ID)' : '(auto ID)');
      return eventId;
    } catch (error: any) {
      console.error(
        '❌ Error al crear evento en Google Calendar:', error?.name, error?.message,
        'stableId:', stableId, 'payload:', JSON.stringify(event),
      );
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
    if (!await googleCalendarService.getValidToken()) {
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
        endDateTime = this.addHoursToLocalDateTime(startDateTime, 2);
      }

      const description = this.buildEventDescription(surgicalCase);

      const colorId = googleCalendarService.getCalendarColorId() || undefined;
      const event: CalendarEvent = {
        summary: `Cirugía: ${surgicalCase.patient_name}`,
        description: description,
        location: surgicalCase.hospital_name || 'Hospital',
        ...(colorId ? { colorId } : {}),
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
      console.error('❌ Error al actualizar evento en Google Calendar:', error?.name, error?.message);

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
    if (!await googleCalendarService.getValidToken()) {
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
      console.error('❌ Error al eliminar evento de Google Calendar:', error?.name, error?.message);

      if (error.message?.includes('expirada')) {
        console.warn('⚠️ Sesión de Google Calendar expirada');
      }

      return false;
    }
  }

  // localStorage: { [caseId]: updated_at } — skip syncing cases whose data hasn't changed
  private readonly SYNC_TIMESTAMPS_KEY = 'medico_calendar_sync_timestamps_v1';

  private getSyncTimestamps(): Record<number, string> {
    try {
      const raw = localStorage.getItem(this.SYNC_TIMESTAMPS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  private saveSyncTimestamp(caseId: number, updatedAt: string): void {
    try {
      const map = this.getSyncTimestamps();
      map[caseId] = updatedAt;
      localStorage.setItem(this.SYNC_TIMESTAMPS_KEY, JSON.stringify(map));
    } catch { /* storage full */ }
  }

  private needsSync(surgicalCase: SurgicalCase): boolean {
    if (!surgicalCase.updated_at) return true;
    const map = this.getSyncTimestamps();
    return map[surgicalCase.id] !== surgicalCase.updated_at;
  }

  // localStorage: { [caseId]: eventId } for assisted cases — kept as migration fallback only
  private readonly ASSISTED_SYNCED_KEY = 'medico_assisted_calendar_synced_v2';
  // Module-level lock: prevents concurrent sync calls from creating duplicates
  private syncInProgress = false;

  private getAssistedEventMap(): Record<number, string> {
    try {
      const raw = localStorage.getItem(this.ASSISTED_SYNCED_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  markAssistedSynced(id: number, eventId: string) {
    const map = this.getAssistedEventMap();
    map[id] = eventId;
    try {
      localStorage.setItem(this.ASSISTED_SYNCED_KEY, JSON.stringify(map));
    } catch { /* storage full — ignore */ }
  }

  getAssistedEventId(caseId: number): string | null {
    const map = this.getAssistedEventMap();
    return map[caseId] || null;
  }

  // Persist the assistant's calendar event ID to the DB so it survives page refreshes and devices.
  async saveAssistedEventIdToDb(caseId: number, eventId: string): Promise<void> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/${caseId}/sync-assistant-calendar/`,
        { method: 'POST', body: JSON.stringify({ calendar_event_id: eventId }) }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error(`❌ sync-assistant-calendar falló para caso ${caseId}: HTTP ${response.status}`, body);
      }
    } catch (err) {
      console.error(`❌ sync-assistant-calendar error para caso ${caseId}:`, err);
    }
  }

  // Persist the invited anesthesiologist's calendar event ID to the DB.
  async saveAnesthesiologistEventIdToDb(caseId: number, eventId: string): Promise<void> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/${caseId}/sync-anesthesiologist-calendar/`,
        { method: 'POST', body: JSON.stringify({ calendar_event_id: eventId }) }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error(`❌ sync-anesthesiologist-calendar falló para caso ${caseId}: HTTP ${response.status}`, body);
      }
    } catch (err) {
      console.error(`❌ sync-anesthesiologist-calendar error para caso ${caseId}:`, err);
    }
  }

  /**
   * Sync active cases with Google Calendar.
   * Uses a module-level lock so concurrent calls (auto-sync + manual button) are no-ops.
   *
   * Owner cases: creates/updates event, saves calendar_event_id to backend.
   * Assisted cases: event ID stored in DB (assistant_calendar_event_id) — localStorage is migration fallback only.
   */
  async syncMissingCases(
    cases: SurgicalCase[]
  ): Promise<{ synced: number; failed: number; paused: boolean; notConnected?: boolean; message?: string }> {
    if (this.syncInProgress) {
      return { synced: 0, failed: 0, paused: false };
    }
    this.syncInProgress = true;

    try {
      if (!await googleCalendarService.getValidToken()) {
        return { synced: 0, failed: 0, paused: false, notConnected: true };
      }

      // Deduplicate the cases list by ID before processing
      const seenIds = new Set<number>();
      const uniqueCases = cases.filter(c => {
        if (!c.id || seenIds.has(c.id)) return false;
        seenIds.add(c.id);
        return true;
      });

      const ownedToSync = uniqueCases.filter(
        c => c.is_owner && c.surgery_date && !CLOSED_STATUSES.includes(c.status) && !c.calendar_event_id
      );
      const assistedActive = uniqueCases.filter(
        c => !c.is_owner && c.assistant_accepted === true && c.surgery_date &&
             !CLOSED_STATUSES.includes(c.status)
      );
      // Invited anesthesiologist (accepted, not the case owner — a self-created
      // anesthesia case already syncs via ownedToSync above).
      const anesthesiologistActive = uniqueCases.filter(
        c => !c.is_owner && c.is_anesthesiologist === true && c.surgery_date &&
             !CLOSED_STATUSES.includes(c.status)
      );

      let synced = 0;
      let failed = 0;

      for (const surgicalCase of ownedToSync) {
        if (!await googleCalendarService.getValidToken()) {
          return { synced, failed, paused: true, message: 'Sincronización pausada: reconecta Google Calendar para continuar' };
        }
        try {
          const eventId = await this.createEventForCase(surgicalCase);
          if (!eventId) { failed++; continue; }
          await authService.authenticatedFetch(
            `${API_URL}/api/v1/medico/cases/${surgicalCase.id}/sync-calendar/`,
            { method: 'POST', body: JSON.stringify({ calendar_event_id: eventId }) }
          );
          synced++;
        } catch { failed++; }
      }

      for (const surgicalCase of assistedActive) {
        if (!await googleCalendarService.getValidToken()) {
          return { synced, failed, paused: true, message: 'Sincronización pausada: reconecta Google Calendar para continuar' };
        }

        // Priority: DB field (survives refresh/device) → localStorage (migration) → create new
        let existingEventId = surgicalCase.assistant_calendar_event_id || null;

        if (!existingEventId) {
          const localEventId = this.getAssistedEventId(surgicalCase.id!);
          if (localEventId) {
            existingEventId = localEventId;
            // Migrate localStorage entry to DB (fire-and-forget)
            this.saveAssistedEventIdToDb(surgicalCase.id!, localEventId).catch(() => {});
          }
        }

        const stableId = `medicocase${surgicalCase.id}`;
        try {
          if (existingEventId && existingEventId === stableId) {
            // Already on stableId — skip if data hasn't changed
            if (!this.needsSync(surgicalCase)) continue;
            const caseWithEventId = { ...surgicalCase, calendar_event_id: existingEventId };
            await this.updateEventForCase(caseWithEventId);
            this.saveSyncTimestamp(surgicalCase.id!, surgicalCase.updated_at);
          } else if (existingEventId && existingEventId !== stableId) {
            // Old random-format ID in DB — migrate: create/confirm stableId, delete old event
            const newEventId = await this.createEventForCase(surgicalCase, stableId);
            if (newEventId) {
              const caseWithNewId = { ...surgicalCase, calendar_event_id: newEventId };
              await this.updateEventForCase(caseWithNewId);
              // Delete the old duplicate (best effort — don't fail sync if delete fails)
              this.deleteEventForCase(existingEventId).catch(() => {});
              this.markAssistedSynced(surgicalCase.id!, newEventId);
              await this.saveAssistedEventIdToDb(surgicalCase.id!, newEventId);
              this.saveSyncTimestamp(surgicalCase.id!, surgicalCase.updated_at);
              synced++;
            } else {
              // Could not create stableId event — fall back to updating the old one
              if (!this.needsSync(surgicalCase)) continue;
              const caseWithEventId = { ...surgicalCase, calendar_event_id: existingEventId };
              await this.updateEventForCase(caseWithEventId);
              this.saveSyncTimestamp(surgicalCase.id!, surgicalCase.updated_at);
            }
          } else {
            // No stored event ID — always create regardless of updated_at
            const eventId = await this.createEventForCase(surgicalCase, stableId);
            if (!eventId) { failed++; continue; }
            const caseWithEventId = { ...surgicalCase, calendar_event_id: eventId };
            await this.updateEventForCase(caseWithEventId);
            this.markAssistedSynced(surgicalCase.id!, eventId);
            await this.saveAssistedEventIdToDb(surgicalCase.id!, eventId);
            this.saveSyncTimestamp(surgicalCase.id!, surgicalCase.updated_at);
            synced++;
          }
        } catch { failed++; }
      }

      for (const surgicalCase of anesthesiologistActive) {
        if (!await googleCalendarService.getValidToken()) {
          return { synced, failed, paused: true, message: 'Sincronización pausada: reconecta Google Calendar para continuar' };
        }
        const stableId = `medicoanest${surgicalCase.id}`;
        const existingEventId = surgicalCase.anesthesiologist_calendar_event_id || null;
        try {
          if (existingEventId) {
            // Skip if data hasn't changed since last sync
            if (!this.needsSync(surgicalCase)) continue;
            const caseWithEventId = { ...surgicalCase, calendar_event_id: existingEventId };
            await this.updateEventForCase(caseWithEventId);
            this.saveSyncTimestamp(surgicalCase.id!, surgicalCase.updated_at);
          } else {
            // Always create if no event exists yet
            const eventId = await this.createEventForCase(surgicalCase, stableId);
            if (!eventId) { failed++; continue; }
            const caseWithEventId = { ...surgicalCase, calendar_event_id: eventId };
            await this.updateEventForCase(caseWithEventId);
            await this.saveAnesthesiologistEventIdToDb(surgicalCase.id!, eventId);
            this.saveSyncTimestamp(surgicalCase.id!, surgicalCase.updated_at);
          }
          synced++;
        } catch { failed++; }
      }

      return { synced, failed, paused: false };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Validate that a time string is a proper "HH:MM" value.
   */
  private isValidTime(time: string | null | undefined): time is string {
    if (!time || typeof time !== 'string') return false;
    const match = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return false;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }

  /**
   * Build a local datetime string from a date + time.
   * Returns "YYYY-MM-DDTHH:MM:SS" with NO timezone suffix so that Google Calendar
   * uses the event's timeZone field (America/Guatemala) to interpret it correctly,
   * regardless of the device's local timezone. Falls back to 08:00 if time is invalid.
   */
  private buildDateTime(date: string, time: string | null | undefined, addHours: number = 0): string {
    const [year, month, day] = date.split('-').map(Number);
    const safeTime = this.isValidTime(time) ? time : '08:00';
    const [hours, minutes] = safeTime.split(':').map(Number);
    // new Date() with an out-of-range hour (e.g. 22 + 2 = 24) correctly rolls
    // over to the next day — plain string padding just clamped to "24:15",
    // an invalid RFC3339 hour that Google Calendar rejected as Bad Request.
    return this.formatLocalDateTime(new Date(year, month - 1, day, hours + addHours, minutes, 0));
  }

  /** Add hours to a local datetime string "YYYY-MM-DDTHH:MM:SS", rolling over to the next day/month/year as needed. */
  private addHoursToLocalDateTime(localDt: string, hours: number): string {
    const [datePart, timePart] = localDt.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [h, m] = timePart.split(':').map(Number);
    return this.formatLocalDateTime(new Date(year, month - 1, day, h + hours, m, 0));
  }

  private formatLocalDateTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
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

    const surgeonName = surgicalCase.surgeon_name || surgicalCase.created_by_name;
    if (surgeonName) {
      description += `Cirujano: ${surgeonName}\n`;
    }

    const assistantName = surgicalCase.assistant_display_name || surgicalCase.assistant_doctor_name;
    if (assistantName) {
      description += `Ayudante: ${assistantName}\n`;
    }

    if (surgicalCase.procedures && surgicalCase.procedures.length > 0) {
      description += '\n--- Procedimientos ---\n';
      surgicalCase.procedures.forEach((proc, index) => {
        description += `${index + 1}. ${proc.surgery_name} (${proc.surgery_code})\n`;
      });
    }

    if (surgicalCase.anesthesia_items && surgicalCase.anesthesia_items.length > 0) {
      description += '\n--- Códigos de Anestesia ---\n';
      surgicalCase.anesthesia_items.forEach((item, index) => {
        description += `${index + 1}. ${item.surgery_name} (${item.surgery_code})\n`;
      });
    } else if (!surgicalCase.is_owner && surgicalCase.is_anesthesiologist) {
      description += '\n⚠️ Recordá agregar tus códigos de anestesia en la sección Anestesia de la app.\n';
    }

    if (!surgicalCase.procedures?.length && !surgicalCase.anesthesia_items?.length && surgicalCase.procedure_count) {
      description += `\nProcedimientos: ${surgicalCase.procedure_count}\n`;
    }

    const isInvitedAnest = !surgicalCase.is_owner && surgicalCase.is_anesthesiologist;
    if (isInvitedAnest) {
      if (surgicalCase.notes) {
        description += `\nNotas del cirujano: ${surgicalCase.notes}\n`;
      }
      if (surgicalCase.anesthesia_notes) {
        description += `\nNotas de anestesia: ${surgicalCase.anesthesia_notes}\n`;
      } else {
        description += '\n⚠️ Recordá agregar tus notas de anestesia en la app.\n';
      }
    } else if (surgicalCase.notes) {
      description += `\nNotas: ${surgicalCase.notes}\n`;
    }

    description += `\n---\nCreado con MeDico App`;

    return description;
  }

  /**
   * Scan a list of Google Calendar events and return IDs of duplicate MeDico events.
   * A duplicate is a MeDico-created event (description contains "Creado con MeDico App")
   * whose ID is NOT the canonical calendar_event_id / assistant_calendar_event_id for any case,
   * but whose title and date match a case that does have a canonical event.
   */
  findDuplicateMedicoEvents(cases: SurgicalCase[], gcalEvents: CalendarEvent[]): string[] {
    const canonicalIds = new Set<string>();
    const caseKey = new Map<string, string>();

    for (const c of cases) {
      // Protect the owner's, assistant's, and anesthesiologist's events from deletion
      if (c.calendar_event_id) canonicalIds.add(c.calendar_event_id);
      if (c.assistant_calendar_event_id) canonicalIds.add(c.assistant_calendar_event_id);
      if (c.anesthesiologist_calendar_event_id) canonicalIds.add(c.anesthesiologist_calendar_event_id);

      const id = c.is_owner
        ? c.calendar_event_id
        : (c.is_anesthesiologist ? c.anesthesiologist_calendar_event_id : c.assistant_calendar_event_id);
      if (!id || !c.patient_name || !c.surgery_date) continue;
      caseKey.set(`${c.patient_name}|${c.surgery_date}`, id);
    }

    return gcalEvents
      .filter(e => {
        if (!e.id || canonicalIds.has(e.id)) return false;
        if (!e.description?.includes('Creado con MeDico App')) return false;
        const patientName = e.summary?.startsWith('Cirugía: ')
          ? e.summary.slice('Cirugía: '.length)
          : null;
        if (!patientName) return false;
        const eventDate = e.start.dateTime
          ? e.start.dateTime.slice(0, 10)
          : (e.start.date ?? null);
        if (!eventDate) return false;
        return caseKey.has(`${patientName}|${eventDate}`);
      })
      .map(e => e.id!);
  }
}

export const calendarSyncService = new CalendarSyncService();