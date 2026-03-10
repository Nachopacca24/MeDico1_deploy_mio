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
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
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
      const eventDate = new Date(event.start.dateTime);
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

  const formatTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Esta Semana
              </CardTitle>
              <CardDescription>Conecta tu Google Calendar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground text-center mb-4">
              Conecta tu cuenta para ver tus eventos
            </p>
            <Button onClick={connect} disabled={isLoading} size="sm">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Conectar Calendar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Esta Semana
            </CardTitle>
            <CardDescription>{getMonthYearLabel()}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek} disabled={loadingEvents}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToCurrentWeek} disabled={loadingEvents}>
              Hoy
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNextWeek} disabled={loadingEvents}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loadingEvents ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`
                  flex flex-col items-center p-2 rounded-lg border transition-all
                  ${day.isToday 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-background hover:bg-accent'
                  }
                `}
              >
                <span className="text-xs text-muted-foreground mb-1">
                  {day.dayName}
                </span>
                <span className={`
                  text-lg font-semibold mb-2
                  ${day.isToday ? 'text-primary' : ''}
                `}>
                  {day.dayNumber}
                </span>
                
                {day.events.length > 0 && (
                  <div className="w-full space-y-1">
                    {day.events.slice(0, 2).map((event, i) => (
                      <div
                        key={i}
                        className="text-[10px] truncate bg-primary/20 text-primary px-1 py-0.5 rounded text-center"
                        title={`${event.summary} - ${formatTime(event.start.dateTime)}`}
                      >
                        {formatTime(event.start.dateTime)}
                      </div>
                    ))}
                    {day.events.length > 2 && (
                      <Badge variant="secondary" className="w-full text-[10px] h-4 flex items-center justify-center">
                        +{day.events.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
                
                {day.events.length === 0 && (
                  <div className="text-xs text-muted-foreground">-</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/calendar">
              Ver Calendario Completo
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}