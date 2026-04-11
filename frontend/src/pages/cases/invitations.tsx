// src/pages/cases/invitations.tsx

import { AppLayout } from "@/shared/components/layout/AppLayout";
import { Button } from "@/shared/components/ui/button";
import { InvitationsList } from "@/pages/cases/InvitationsList";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const InvitationsPage = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/cases">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold mb-1 tracking-tight">
              Invitaciones de Casos Quirúrgicos
            </h1>
            <p className="text-muted-foreground">
              Gestiona tus invitaciones como médico ayudante
            </p>
          </div>
        </div>

        {/* Lista de invitaciones */}
        <InvitationsList />
      </div>
    </AppLayout>
  );
};

export default InvitationsPage;