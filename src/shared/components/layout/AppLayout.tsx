import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fine } from "@/shared/lib/fine";
import { Button } from "@/shared/components/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { 
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
  const { data: session } = fine.auth.useSession();

  const navItems = [
    { name: "Dashboard", path: "/", icon: Home },
    { name: "Operations", path: "/operations", icon: Stethoscope },
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
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-primary text-primary-foreground transition-transform duration-300 ease-in-out flex flex-col",
          isMobile ? (sidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-center px-4 border-b border-primary-foreground/10">
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
                    "flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-primary-foreground text-primary"
                      : "hover:bg-primary-foreground/10"
                  )}
                  onClick={isMobile ? toggleSidebar : undefined}
                >
                  <item.icon className="mr-3 h-6 w-6" />
                  {item.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/logout"
                className="flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-primary-foreground/10"
              >
                <LogOut className="mr-3 h-6 w-6" />
                Logout
              </Link>
            </li>
          </ul>
        </nav>

        {session?.user && (
          <div className="border-t border-primary-foreground/10 p-4 mt-4">
            <div className="flex items-center justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground text-primary text-lg font-bold">
                {session.user.name?.charAt(0) || "U"}
              </div>
              <div className="ml-3 text-left">
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs opacity-70">{session.user.email}</p>
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