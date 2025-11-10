import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import { Button } from "@/shared/components/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { 
  Briefcase,
  Building2,
  Calculator, 
  History, 
  Home, 
  LogOut, 
  Menu, 
  Settings, 
  Star, 
  Stethoscope, 
  X 
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { name: "Dashboard", path: "/", icon: Home },
    { name: "Cases", path: "/cases", icon: Briefcase },
    { name: "Operations", path: "/operations", icon: Stethoscope },
    { name: "Hospitals", path: "/hospitals", icon: Building2 },
    { name: "Calculator", path: "/calculator", icon: Calculator },
    { name: "Favorites", path: "/favorites", icon: Star },
    { name: "History", path: "/history", icon: History },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar for desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-900 text-white transition-transform duration-300 ease-in-out flex flex-col",
          isMobile ? (sidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-center px-4 border-b border-slate-700">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/favicon.png" alt="MeDico Logo" className="h-10 w-10" />
            <span className="text-xl font-bold hidden md:inline">MeDico</span>
          </Link>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="ml-auto">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        <nav className="flex-1 flex flex-col justify-start pt-8">
          <ul className="space-y-2 px-6">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center justify-start rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-primary text-white"
                      : "hover:bg-slate-800"
                  )}
                  onClick={isMobile ? toggleSidebar : undefined}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/logout"
                className="flex items-center justify-start rounded-md px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-slate-800"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Logout
              </Link>
            </li>
          </ul>
        </nav>

        {user && (
          <div className="border-t border-slate-700 p-4 mt-4">
            <div className="flex items-center justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-lg font-bold">
                {user.name?.charAt(0) || user.first_name?.charAt(0) || "U"}
              </div>
              <div className="ml-3 text-left">
                <p className="text-sm font-medium">{user.name || user.full_name}</p>
                <p className="text-xs opacity-70">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className={cn(
        "flex flex-1 flex-col",
        !isMobile && "ml-64"
      )}>
        {/* Mobile header */}
        {isMobile && (
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                <Menu className="h-5 w-5" />
              </Button>
              <span className="ml-3 text-lg font-bold">MeDico</span>
            </div>
          </header>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50" 
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
}