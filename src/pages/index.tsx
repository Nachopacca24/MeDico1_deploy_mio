import { AppLayout } from "@/shared/components/layout/AppLayout";
import { DashboardStats } from "@/shared/components/ui/DashboardStats";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useAuth } from "@/shared/contexts/AuthContext";
import { Calculator, ListChecks, Star, Briefcase, TrendingUp, DollarSign, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { surgicalCaseService } from "@/services/surgicalCaseService";
import type { CaseStats } from "@/types/surgical-case";

const Index = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await surgicalCaseService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Minimal Hero Section */}
        <div className="pb-6 border-b">
          <h1 className="text-3xl font-semibold mb-1 tracking-tight">
            Welcome back, {user?.name || user?.full_name || "Doctor"}
          </h1>
          <p className="text-muted-foreground">
            Manage your surgical cases and valuations
          </p>
        </div>

        {/* Minimal Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-4 border rounded-lg hover:border-primary transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Cases</span>
            </div>
            <div className="text-3xl font-semibold">
              {loadingStats ? '...' : stats?.total_cases || 0}
            </div>
          </div>

          <div className="p-4 border rounded-lg hover:border-primary transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <ListChecks className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Procedures</span>
            </div>
            <div className="text-3xl font-semibold">
              {loadingStats ? '...' : stats?.total_procedures || 0}
            </div>
          </div>

          <div className="p-4 border rounded-lg hover:border-primary transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Value</span>
            </div>
            <div className="text-3xl font-semibold">
              ${loadingStats ? '...' : (stats?.total_value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="p-4 border rounded-lg hover:border-primary transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <div className="text-3xl font-semibold">
              {loadingStats ? '...' : (stats?.cases_by_status?.scheduled?.count || 0)}
            </div>
          </div>
        </div>

        {/* Minimal Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <Link 
              to="/cases/new"
              className="group p-4 border rounded-lg hover:border-primary hover:bg-accent/50 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <Briefcase className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <h3 className="font-medium">New Case</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Register a surgical case
              </p>
            </Link>
            
            <Link 
              to="/operations"
              className="group p-4 border rounded-lg hover:border-primary hover:bg-accent/50 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <Calculator className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <h3 className="font-medium">Browse Operations</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Explore procedures database
              </p>
            </Link>
            
            <Link 
              to="/favorites"
              className="group p-4 border rounded-lg hover:border-primary hover:bg-accent/50 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <Star className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <h3 className="font-medium">Favorites</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Your saved procedures
              </p>
            </Link>
          </div>
        </div>

        {/* Recent Cases */}
        {stats?.recent_cases && stats.recent_cases.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Cases</h2>
              <Link to="/cases" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {stats.recent_cases.slice(0, 5).map((case_: any) => (
                <Link 
                  key={case_.id}
                  to={`/cases/${case_.id}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:border-primary hover:bg-accent/50 transition-all group"
                >
                  <div className="flex-1">
                    <div className="font-medium group-hover:text-primary transition-colors">
                      {case_.patient_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {case_.procedure_count} procedure{case_.procedure_count !== 1 ? 's' : ''} • 
                      {case_.total_rvu} RVU
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${case_.total_value?.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(case_.surgery_date).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <DashboardStats />
      </div>
    </AppLayout>
  );
};

export default Index;