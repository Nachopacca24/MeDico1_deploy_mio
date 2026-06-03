// src/shared/components/layout/MobileBottomNav.tsx

import { Link, useLocation } from 'react-router-dom';
import { Home, Briefcase, CalendarIcon, Newspaper, Menu } from 'lucide-react';
import { useSidebar } from '@/shared/components/ui/sidebar';
import { useInvitationBadges } from '@/shared/hooks/useInvitationBadges';
import { useNovedadesNew } from '@/shared/hooks/useNovedadesNew';

// Orden: Menú | Cirugías | Panel (centro) | Calendario | Novedades
// El botón Menú va primero a la izquierda porque el sidebar sale de la izquierda

const TABS = [
  { title: 'Cirugías',   url: '/cases',      icon: Briefcase },
  { title: 'Inicio',     url: '/dashboard',  icon: Home },
  { title: 'Calendario', url: '/calendar',   icon: CalendarIcon },
  { title: 'Novedades',  url: '/novedades',  icon: Newspaper },
] as const;

function Badge() {
  return (
    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
    </span>
  );
}

export function MobileBottomNav() {
  const location = useLocation();
  const { toggleSidebar } = useSidebar();
  const { hasPendingCases, hasPendingColleagues } = useInvitationBadges();
  const { hasNew: novedadesHasNew } = useNovedadesNew();

  const isActive = (url: string) => location.pathname.startsWith(url);

  const showBadge = (url: string) => {
    if (url === '/cases')     return hasPendingCases || hasPendingColleagues;
    if (url === '/novedades') return novedadesHasNew;
    return false;
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border"
      style={{ paddingBottom: 'var(--sab, 0px)' }}
    >
      <div className="flex items-stretch justify-around h-14">

        {/* Menú — primer lugar a la izquierda, sidebar sale de la izquierda */}
        <button
          onClick={toggleSidebar}
          className="relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 px-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5 stroke-[1.8px]" />
          <span className="text-[10px] leading-none font-medium">Menú</span>
        </button>

        {/* Tabs centrales */}
        {TABS.map(tab => {
          const active = isActive(tab.url);
          const badge  = showBadge(tab.url);
          return (
            <Link
              key={tab.url}
              to={tab.url}
              className={`
                relative flex flex-col items-center justify-center gap-0.5
                flex-1 min-w-0 px-1 transition-colors
                ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
              <div className="relative">
                <tab.icon className={`h-5 w-5 ${active ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
                {badge && <Badge />}
              </div>
              <span className={`text-[10px] leading-none font-medium truncate ${active ? 'font-semibold' : ''}`}>
                {tab.title}
              </span>
            </Link>
          );
        })}

      </div>
    </nav>
  );
}
