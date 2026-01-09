// src/shared/components/layout/AppLayout.tsx

import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/layout/Sidebar";
import { Separator } from "@/shared/components/ui/separator";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      
      {/* SidebarInset hace que el contenido se adapte correctamente */}
      <SidebarInset>
        {/* Header con el botón para abrir/cerrar sidebar */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h2 className="text-lg font-semibold">MeDico</h2>
          </div>
        </header>

        {/* Main content con padding bottom para el sticky banner */}
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6 pb-20 md:pb-16">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}