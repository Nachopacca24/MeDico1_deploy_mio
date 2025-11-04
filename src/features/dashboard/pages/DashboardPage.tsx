import { AppLayout } from "@/shared/components/layout/AppLayout";
import { DashboardStats } from "@/features/dashboard/components/DashboardStats";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { fine } from "@/shared/lib/fine";
import { Calculator, ListChecks, Star } from "lucide-react";
import { Link } from "react-router-dom";

const DashboardPage = () => {
  const { data: session } = fine.auth.useSession();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <img
            src="/favicon.png"
            alt="MeDico Logo"
            className="h-20 w-30 rounded-full block mx-auto mt-2.5"
            draggable={false}
            contentEditable={false}
          />
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name || "Doctor"}! Manage your medical operation valuations.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Calculate Operation
              </CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Valuation Tool</div>
              <p className="text-xs text-muted-foreground">
                Calculate the value of medical procedures
              </p>
              <Button asChild className="mt-4 w-full">
                <Link to="/calculator">Start Calculation</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Browse Operations
              </CardTitle>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Operation Database</div>
              <p className="text-xs text-muted-foreground">
                View all available medical procedures
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link to="/operations">View Operations</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Favorites
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Saved Operations</div>
              <p className="text-xs text-muted-foreground">
                Quick access to your favorite procedures
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link to="/favorites">View Favorites</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <DashboardStats />
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
