import { 
  Calculator, 
  History, 
  Home, 
  Settings, 
  Star, 
  Stethoscope, 
  Building2,
  Briefcase,
  Users,  
  LogOut,
  CalendarIcon
} from "lucide-react";

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
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authService } from "@/shared/services/authService";

// Organizar items por secciones
const mainItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
];

const workItems = [
  {
    title: "Cases",
    url: "/cases",
    icon: Briefcase,
  },
  {
    title: "Operations",
    url: "/operations",
    icon: Stethoscope,
  },
  {
    title: "Hospitals",
    url: "/hospitals",
    icon: Building2,
  },
  {
    title: "Colleagues",  
    url: "/colleagues",
    icon: Users,
  },
];

const toolsItems = [
  {
    title: "Calendar",
    url: "/calendar",
    icon: CalendarIcon,
  },
  {
    title: "Calculator",
    url: "/calculator",
    icon: Calculator,
  },
  {
    title: "Favorites",
    url: "/favorites",
    icon: Star,
  },
  {
    title: "History",
    url: "/history",
    icon: History,
  },
];

const settingsItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const confirmed = window.confirm('¿Estás seguro que deseas cerrar sesión?');
    if (confirmed) {
      authService.logout();
      navigate('/login');
    }
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
            <span className="text-sm font-semibold truncate text-sidebar-foreground">MeDico</span>
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
              {workItems.map((item) => (
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

        {/* Sección de Herramientas */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">Herramientas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => (
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
      </SidebarContent>

      {/* Footer con Settings y Logout */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {settingsItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <Link to={item.url} className="text-sidebar-foreground hover:bg-sidebar-accent">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}