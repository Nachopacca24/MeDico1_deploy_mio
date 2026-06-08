// src/pages/calendar.tsx - VERSIÓN FINAL CORREGIDA

import { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { BetweenContentAd } from "@/shared/components/ads/BetweenContentAd";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useGoogleCalendar } from "@/shared/hooks/useGoogleCalendar";
import { googleCalendarService, type CalendarEvent } from "@/services/googleCalendarService";
import { calendarSyncService } from "@/services/calendarSyncService";
import { surgicalCaseService } from "@/services/surgicalCaseService";
import { useToast } from "@/shared/hooks/useToast";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Plus,
  RefreshCw,
  Trash2
} from "lucide-react";

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

const CalendarPage = () => {
  const { toast } = useToast();
  const {
    isConnected,
    userEmail,
    isLoading,
    connect,
    checkConnection,
    getEvents
  } = useGoogleCalendar();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const detailsPanelRef = useRef<HTMLDivElement>(null);
  const hasSyncedRef = useRef(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    description: ''
  });

  useEffect(() => {
    // Web: OAuth code arrives in ?code= on page load
    const handleCallback = async () => {
      try {
        const result = await googleCalendarService.handleOAuthCallback();
        if (result === 'connected') {
          await checkConnection();
          toast.success('¡Conectado!', 'Google Calendar conectado exitosamente');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'No se pudo completar la conexión';
        toast.error('Error', msg);
      }
    };
    handleCallback();

    // Android/iOS: OAuth code arrives via App Links (appUrlOpen event)
    // Chrome Custom Tabs redirects to medicoapp.app/calendar?code=xxx,
    // Android App Links intercepts it and fires this event.
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | null = null;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', async ({ url }) => {
        if (!url.includes('/calendar')) return;
        try {
          const result = await googleCalendarService.handleOAuthCallback(url);
          if (result === 'connected') {
            await checkConnection();
            toast.success('¡Conectado!', 'Google Calendar conectado exitosamente');
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error de conexión';
          toast.error('Error', msg);
        }
      }).then(handle => {
        removeListener = () => handle.remove();
      });
    });

    return () => { removeListener?.(); };
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadMonthEvents();
    }
  }, [currentDate, isConnected]);

  // Auto-sync once when the calendar first becomes connected
  useEffect(() => {
    if (!isConnected || hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    runSync(false);
  }, [isConnected]);

  useEffect(() => {
    generateCalendarDays();
  }, [currentDate, events]);

  const runSync = async (showResultAlways: boolean) => {
    setSyncing(true);
    try {
      const cases = await surgicalCaseService.getCases();
      const result = await calendarSyncService.syncMissingCases(cases);

      if (result.paused) {
        toast.warning(
          'Sincronización pausada',
          result.message ?? 'Reconecta Google Calendar para continuar'
        );
        return;
      }

      if (result.synced > 0) {
        const n = result.synced;
        toast.success(
          'Sincronización completada',
          `${n} caso${n !== 1 ? 's' : ''} activo${n !== 1 ? 's' : ''} sincronizado${n !== 1 ? 's' : ''} con Google Calendar`
        );
      } else if (showResultAlways) {
        if (result.failed > 0) {
          toast.error('Sincronización', `No se pudo sincronizar ${result.failed} caso${result.failed !== 1 ? 's' : ''}`);
        } else {
          toast.success('Sincronización', 'Todos los casos ya están sincronizados');
        }
      }
    } catch {
      if (showResultAlways) {
        toast.error('Error', 'No se pudieron sincronizar los casos');
      }
    } finally {
      setSyncing(false);
    }
  };

  const loadMonthEvents = async () => {
    setLoadingEvents(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0, 0);
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1, 23, 59, 59, 999);
      const fetchedEvents = await getEvents(startOfMonth, nextMonth);
      setEvents(fetchedEvents);
    } catch {
      toast.error('Error', 'No se pudieron cargar los eventos');
    } finally {
      setLoadingEvents(false);
    }
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: CalendarDay[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: getEventsForDate(date)
      });
    }

    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        events: getEventsForDate(date)
      });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: getEventsForDate(date)
      });
    }

    setCalendarDays(days);
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      // Si es un evento de todo el día (solo tiene .date), evitamos problemas de zona horaria
      if (event.start.date && !event.start.dateTime) {
        // El formato es YYYY-MM-DD
        const [year, month, day] = event.start.date.split('-').map(Number);
        // month - 1 porque en JS los meses son 0-11
        const eventDate = new Date(year, month - 1, day);
        return eventDate.toDateString() === date.toDateString();
      }

      const eventStart = event.start.dateTime;
      if (!eventStart) return false;
      const eventDate = new Date(eventStart);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDay(day);
    setTimeout(() => {
      detailsPanelRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.startTime || !newEvent.endTime) {
      toast.error('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    setCreating(true);
    try {
      const startDateTime = new Date(`${newEvent.date}T${newEvent.startTime}`).toISOString();
      const endDateTime = new Date(`${newEvent.date}T${newEvent.endTime}`).toISOString();

      const event: CalendarEvent = {
        summary: newEvent.title,
        description: newEvent.description || undefined,
        location: newEvent.location || undefined,
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
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      await googleCalendarService.createEvent(event);
      toast.success('¡Evento creado!', 'El evento se agregó a tu calendario');

      setNewEvent({
        title: '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        description: ''
      });
      setShowCreateDialog(false);
      await loadMonthEvents();
    } catch {
      toast.error('Error', 'No se pudo crear el evento');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    const confirmed = confirm(`¿Eliminar el evento "${eventTitle}"?`);
    if (!confirmed) return;

    try {
      await googleCalendarService.deleteEvent(eventId);
      toast.success('Evento eliminado', 'El evento se eliminó correctamente');
      await loadMonthEvents();
    } catch {
      toast.error('Error', 'No se pudo eliminar el evento');
    }
  };

  const formatTime = (event: CalendarEvent, type: 'start' | 'end') => {
    const timeInfo = type === 'start' ? event.start : event.end;
    if (timeInfo.date && !timeInfo.dateTime) {
      return type === 'start' ? 'Todo el día' : '';
    }
    if (!timeInfo.dateTime) return '';
    
    const date = new Date(timeInfo.dateTime);
    return date.toLocaleTimeString('es-GT', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (event: CalendarEvent) => {
    if (event.start.date && !event.start.dateTime) {
      return '24h';
    }
    if (!event.start.dateTime || !event.end.dateTime) return '';

    const startDate = new Date(event.start.dateTime);
    const endDate = new Date(event.end.dateTime);
    const diff = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!isConnected) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="pb-4 border-b">
            <h1 className="text-3xl font-semibold mb-1 tracking-tight">Calendario</h1>
            <p className="text-muted-foreground">
              Visualiza tus eventos de Google Calendar
            </p>
          </div>

          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <CalendarIcon className="w-16 h-16 text-primary" />
              </div>
              {isLoading ? (
                <>
                  <h3 className="text-2xl font-semibold mb-2">Verificando conexión...</h3>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-semibold mb-2">
                    Conecta tu Google Calendar
                  </h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    Para ver tus eventos aquí, primero necesitas conectar tu cuenta de Google Calendar
                  </p>
                  <Button onClick={connect} size="lg">
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    Conectar Google Calendar
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-1 tracking-tight">Calendario</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Conectado como <strong>{userEmail}</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => runSync(true)} disabled={syncing || loadingEvents}>
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar casos'}
              </Button>
              <Button variant="outline" onClick={loadMonthEvents} disabled={loadingEvents}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingEvents ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Evento
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Hoy
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToNextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingEvents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {DAYS.map(day => (
                      <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => handleDayClick(day)}
                        className={`
                          relative min-h-[80px] p-2 rounded-lg border text-left transition-all
                          ${day.isCurrentMonth 
                            ? 'bg-background hover:bg-accent' 
                            : 'bg-muted/30 text-muted-foreground'
                          }
                          ${day.isToday 
                            ? 'border-primary border-2 ring-2 ring-primary/20' 
                            : 'border-border'
                          }
                          ${selectedDay?.date.toDateString() === day.date.toDateString()
                            ? 'ring-2 ring-primary'
                            : ''
                          }
                        `}
                      >
                        <span className={`
                          text-sm font-medium
                          ${day.isToday ? 'text-primary font-bold' : ''}
                        `}>
                          {day.date.getDate()}
                        </span>

                        {day.events.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {day.events.slice(0, 2).map((event, i) => (
                              <div 
                                key={i}
                                className="text-xs truncate bg-primary/10 text-primary px-1 rounded"
                              >
                                <span className="font-bold mr-1">{formatTime(event, 'start')}</span>
                                {event.summary}
                              </div>
                            ))}
                            {day.events.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{day.events.length - 2} más
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1" ref={detailsPanelRef}>
            <CardHeader>
              <CardTitle>
                {selectedDay 
                  ? `${selectedDay.date.getDate()} de ${MONTHS[selectedDay.date.getMonth()]}`
                  : 'Selecciona un día'
                }
              </CardTitle>
              <CardDescription>
                {selectedDay?.events.length || 0} evento{selectedDay?.events.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedDay ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Selecciona un día para ver los eventos</p>
                </div>
              ) : selectedDay.events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay eventos este día</p>
                </div>
              ) : (
                selectedDay.events.map((event, index) => (
                  <Card key={index} className="border-l-4 border-l-primary">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold flex-1">{event.summary}</h4>
                        {event.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive"
                            onClick={() => handleDeleteEvent(event.id!, event.summary)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {event.start.date && !event.start.dateTime ? (
                          <span>Todo el día</span>
                        ) : (
                          <>
                            <span>{formatTime(event, 'start')}</span>
                            <span>-</span>
                            <span>{formatTime(event, 'end')}</span>
                          </>
                        )}
                        <Badge variant="outline" className="ml-auto">
                          {formatDuration(event)}
                        </Badge>
                      </div>

                      {event.location && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{event.location}</span>
                        </div>
                      )}

                      {event.description && (
                        <div className="text-sm text-muted-foreground pt-2 border-t">
                          {event.description}
                        </div>
                      )}

                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                          <Users className="w-4 h-4" />
                          <span>{event.attendees.length} asistente{event.attendees.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Evento</DialogTitle>
            <DialogDescription>
              Agrega un evento a tu Google Calendar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Ej: Reunión con el equipo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Hora Inicio *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Hora Fin *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                placeholder="Ej: Sala de reuniones"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Detalles adicionales..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEvent} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Evento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BetweenContentAd className="mt-2" />
    </AppLayout>
  );
};

export default CalendarPage;