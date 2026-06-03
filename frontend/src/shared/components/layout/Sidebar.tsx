import {
  Newspaper,
  Home,
  Settings,
  Star,
  Stethoscope,
  Building2,
  Briefcase,
  Users,
  LogOut,
  CalendarIcon,
  BarChart2,
  ShieldCheck,
  Calculator,
} from "lucide-react";
import { ForYouAds } from "@/shared/components/ads/ForYouAds";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/shared/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useNovedadesNew } from "@/shared/hooks/useNovedadesNew";
import { useInvitationBadges } from "@/shared/hooks/useInvitationBadges";
import { useState } from "react";

// Organizar items por secciones
const mainItems = [
  {
    title: "Inicio",
    url: "/dashboard",
    icon: Home,
  },
];

const workItems = [
  {
    title: "Mis cirugías",
    url: "/cases",
    icon: Briefcase,
  },
  {
    title: "Estadísticas",
    url: "/stats",
    icon: BarChart2,
  },
  {
    title: "Procedimientos",
    url: "/operations",
    icon: Stethoscope,
  },
  {
    title: "Hospitales",
    url: "/hospitals",
    icon: Building2,
  },
  {
    title: "Seguros",
    url: "/insurances",
    icon: ShieldCheck,
  },
  {
    title: "Colegas",
    url: "/colleagues",
    icon: Users,
  },
];

const toolsItems = [
  {
    title: "Calculadora",
    url: "/calculator",
    icon: Calculator,
  },
  {
    title: "Calendario",
    url: "/calendar",
    icon: CalendarIcon,
  },
  {
    title: "Favoritos",
    url: "/favorites",
    icon: Star,
  },
  {
    title: "Novedades",
    url: "/novedades",
    icon: Newspaper,
  },
];

const settingsItems = [
  {
    title: "Configuración",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { hasNew: novedadesHasNew } = useNovedadesNew();
  const { hasPendingCases, hasPendingColleagues } = useInvitationBadges();
  const [isOpen, setIsOpen] = useState(false);
  const userSpecialty = user?.specialty || '';

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  const isActive = (url: string) => {
    if (url === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar">
      {/* Header con logo/nombre de la app */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold truncate text-sidebar-foreground">MeDico App</span>
            <span className="text-xs truncate text-sidebar-foreground/70">Medical Manager</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Sección Principal */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="text-sidebar-foreground hover:bg-sidebar-accent">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-sidebar-border" />

        {/* Sección de Trabajo */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">Trabajo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workItems.map((item) => {
                const isCases = item.url === '/cases';
                const isColleagues = item.url === '/colleagues';
                const showBadge = (isCases && hasPendingCases) || (isColleagues && hasPendingColleagues);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url} className="text-sidebar-foreground hover:bg-sidebar-accent relative">
                        <div className="relative">
                          <item.icon className={`h-4 w-4 ${showBadge ? 'animate-pulse text-primary' : ''}`} />
                          {showBadge && (
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                            </span>
                          )}
                        </div>
                        <span className={showBadge ? 'font-semibold text-primary' : ''}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-sidebar-border" />

        {/* Sección de Herramientas */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">Herramientas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => {
                const isNovedades = item.url === '/novedades';
                const showBadge = isNovedades && novedadesHasNew;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url} className="text-sidebar-foreground hover:bg-sidebar-accent relative">
                        <div className="relative">
                          <item.icon className={`h-4 w-4 ${showBadge ? 'animate-pulse text-primary' : ''}`} />
                          {showBadge && (
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                            </span>
                          )}
                        </div>
                        <span className={showBadge ? 'font-semibold text-primary' : ''}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Sección Para ti — specialty-targeted ads, all users */}
        {userSpecialty && (
          <>
            <SidebarSeparator className="bg-sidebar-border" />
            <ForYouAds specialty={userSpecialty} />
          </>
        )}
      </SidebarContent>

      {/* Footer con Settings y Logout */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {settingsItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} className="focus-visible:ring-0 focus-visible:outline-none">
                <Link to={item.url} className="text-sidebar-foreground hover:bg-sidebar-accent focus-visible:ring-0 focus-visible:outline-none">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}


          <SidebarMenuItem>
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
              <AlertDialogTrigger asChild>
                <SidebarMenuButton className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive w-full cursor-pointer focus-visible:ring-0 focus-visible:outline-none">
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar sesión</span>
                </SidebarMenuButton>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-md border-0 shadow-lg rounded-2xl p-6">
                <AlertDialogHeader className="space-y-3">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <LogOut className="h-8 w-8 text-destructive" />
                  </div>
                  <AlertDialogTitle className="text-xl text-center font-bold">¿Cerrar sesión?</AlertDialogTitle>
                  <AlertDialogDescription className="text-center text-slate-500 text-base">
                    Estás a punto de salir de MeDico App. Tendrás que volver a ingresar tus credenciales para acceder a tus pacientes y casos médicos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-6 sm:space-x-0">
                  <AlertDialogCancel className="mt-0 w-full sm:w-1/2 rounded-xl h-11 border-slate-200 hover:bg-slate-100 font-medium">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="w-full sm:w-1/2 rounded-xl h-11 bg-destructive hover:bg-destructive/90 text-white font-medium">
                    Sí, cerrar sesión
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}