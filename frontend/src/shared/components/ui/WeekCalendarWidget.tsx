// src/shared/components/ui/WeekCalendarWidget.tsx

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useGoogleCalendar } from "@/shared/hooks/useGoogleCalendar";
import { Link } from "react-router-dom";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  Loader2,
  AlertCircle
} from "lucide-react";
import type { CalendarEvent } from "@/services/googleCalendarService";

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface WeekDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  events: CalendarEvent[];
}

export function WeekCalendarWidget() {
  const { isConnected, connect, getEvents, isLoading } = useGoogleCalendar();
  
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Calcular el inicio de la semana (Domingo)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  useEffect(() => {
    const weekStart = getWeekStart(new Date());
    setCurrentWeekStart(weekStart);
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadWeekEvents();
    }
  }, [currentWeekStart, isConnected]);

  useEffect(() => {
    generateWeekDays();
  }, [currentWeekStart, events]);

  const loadWeekEvents = async () => {
    setLoadingEvents(true);
    try {
      const weekStart = new Date(currentWeekStart);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 7); // Una semana completa
      weekEnd.setHours(23, 59, 59, 999);
      
      const fetchedEvents = await getEvents(weekStart, weekEnd);
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Error loading week events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const generateWeekDays = () => {
    const days: WeekDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      
      days.push({
        date,
        dayName: DAYS[date.getDay()],
        dayNumber: date.getDate(),
        isToday: date.toDateString() === today.toDateString(),
        events: getEventsForDate(date)
      });
    }

    setWeekDays(days);
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      if (event.start.date && !event.start.dateTime) {
        const [year, month, day] = event.start.date.split('-').map(Number);
        const eventDate = new Date(year, month - 1, day);
        return eventDate.toDateString() === date.toDateString();
      }

      const eventStart = event.start.dateTime;
      if (!eventStart) return false;
      const eventDate = new Date(eventStart);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  const formatTime = (event: CalendarEvent) => {
    if (event.start.date && !event.start.dateTime) {
      return 'Día completo';
    }
    if (!event.start.dateTime) return '';

    const date = new Date(event.start.dateTime);
    return date.toLocaleTimeString('es-GT', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getMonthYearLabel = () => {
    const start = new Date(currentWeekStart);
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    
    const startMonth = start.toLocaleDateString('es-ES', { month: 'short' });
    const endMonth = end.toLocaleDateString('es-ES', { month: 'short' });
    const year = start.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)} ${year}`;
    }
    return `${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)} - ${endMonth.charAt(0).toUpperCase() + endMonth.slice(1)} ${year}`;
  };

  if (!isConnected) {
    return (
      <Card className="border-none shadow-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                </div>
                Tu Agenda
              </CardTitle>
              <CardDescription className="text-slate-500 font-medium">Sincroniza con Google Calendar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                <CalendarIcon className="h-10 w-10 text-primary opacity-80" />
              </div>
            </div>
            <h4 className="text-lg font-semibold mb-2">Eventos no disponibles</h4>
            <p className="text-sm text-slate-500 max-w-xs mb-6 leading-relaxed">
              Conecta tu calendario para visualizar tus citas y procedimientos programados aquí.
            </p>
            <Button 
              onClick={connect} 
              disabled={isLoading} 
              size="lg"
              className="px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all rounded-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Conectar Ahora
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              Esta Semana
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium pl-11">
              {getMonthYearLabel()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek} disabled={loadingEvents} className="h-8 w-8 hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToCurrentWeek} disabled={loadingEvents} className="h-8 px-3 text-xs font-semibold hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all">
              Hoy
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNextWeek} disabled={loadingEvents} className="h-8 w-8 hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loadingEvents ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-60 mb-2" />
            <p className="text-xs text-muted-foreground animate-pulse">Sincronizando eventos...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`
                  flex flex-col items-center p-2 sm:p-3 rounded-2xl border transition-all duration-300
                  ${day.isToday 
                    ? 'bg-primary/5 border-primary/30 ring-4 ring-primary/5 shadow-inner scale-[1.02]' 
                    : 'bg-slate-50/50 dark:bg-slate-800/30 border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md'
                  }
                `}
              >
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2 ${day.isToday ? 'text-primary' : 'text-slate-400'}`}>
                  {day.dayName}
                </span>
                <span className={`
                  text-lg sm:text-xl font-black mb-3
                  ${day.isToday ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}
                `}>
                  {day.dayNumber}
                </span>
                
                {day.events.length > 0 ? (
                  <div className="w-full space-y-1.5 mt-auto">
                    {day.events.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className="group/event relative overflow-hidden"
                        title={`${event.summary} - ${formatTime(event)}`}
                      >
                        <div className={`
                          text-[10px] truncate px-1.5 py-1 rounded-lg border flex items-center justify-center font-bold tracking-tight
                          ${day.isToday 
                            ? 'bg-primary text-white border-primary shadow-sm' 
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-slate-600 group-hover/event:border-primary/50 group-hover/event:text-primary'
                          }
                          transition-all duration-200
                        `}>
                          <div className="flex flex-col w-full overflow-hidden">
                            <span className="text-[9px] opacity-80 leading-tight">{formatTime(event)}</span>
                            <span className="truncate font-bold leading-tight">{event.summary}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {day.events.length > 3 && (
                      <div className="flex justify-center">
                        <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] hover:bg-primary hover:text-white border-none transition-colors h-4 cursor-pointer">
                          +{day.events.length - 3}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-auto py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button asChild variant="ghost" className="w-full group hover:bg-primary/5 text-primary font-bold transition-all rounded-xl">
            <Link to="/calendar" className="flex items-center justify-center">
              Gestionar Calendario Completo
              <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}