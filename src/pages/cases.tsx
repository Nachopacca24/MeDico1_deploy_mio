import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { surgicalCaseService } from "@/services/surgicalCaseService";
import type { SurgicalCase } from "@/types/surgical-case";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Plus,
  Calendar,
  Hospital,
  DollarSign,
  FileText,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";

const CasesPage = () => {
  const [cases, setCases] = useState<SurgicalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await surgicalCaseService.getCases();
      setCases(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar casos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, patientName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the case for ${patientName}?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await surgicalCaseService.deleteCase(id);
      setCases(cases.filter(c => c.id !== id));
    } catch (err: any) {
      alert('Error deleting case: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter cases based on search and status
  const filteredCases = useMemo(() => {
    return cases.filter(case_ => {
      const matchesSearch = searchQuery === "" || 
        case_.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        case_.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        case_.hospital_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || case_.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [cases, searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { style: string }> = {
      scheduled: { style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
      completed: { style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
      billed: { style: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
      paid: { style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
      cancelled: { style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    };

    const { style } = config[status] || config.scheduled;

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${style}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="pb-4 border-b">
            <div className="h-9 w-64 bg-muted rounded animate-pulse mb-2"></div>
            <div className="h-5 w-32 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 w-3/4 bg-muted rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-20 bg-muted rounded animate-pulse"></div>
                  <div className="h-10 bg-muted rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Error loading cases</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={fetchCases}>Try Again</Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h1 className="text-3xl font-semibold mb-1 tracking-tight">Surgical Cases</h1>
            <p className="text-muted-foreground">
              {filteredCases.length} of {cases.length} case{cases.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button asChild>
            <Link to="/cases/new">
              <Plus className="w-4 h-4 mr-2" />
              New Case
            </Link>
          </Button>
        </div>

        {/* Search and Filters */}
        {cases.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by patient name, ID, or hospital..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "scheduled" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("scheduled")}
              >
                Scheduled
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("completed")}
              >
                Completed
              </Button>
              <Button
                variant={statusFilter === "paid" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("paid")}
              >
                Paid
              </Button>
            </div>
          </div>
        )}

        {/* Cases Grid */}
        {cases.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Briefcase className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                No cases yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-6 text-center max-w-md">
                Start by creating your first surgical case to track procedures and valuations
              </p>
              <Button asChild size="lg">
                <Link to="/cases/new">
                  <Plus className="w-5 h-5 mr-2" />
                  Create First Case
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : filteredCases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Filter className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No cases found</h3>
              <p className="text-muted-foreground text-center">
                Try adjusting your search or filter criteria
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCases.map((surgicalCase) => (
              <Card key={surgicalCase.id} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg font-semibold">{surgicalCase.patient_name}</CardTitle>
                    {getStatusBadge(surgicalCase.status)}
                  </div>
                  <CardDescription className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 bg-blue-500/10 rounded-lg">
                        <Calendar className="w-4 h-4 text-blue-500" />
                      </div>
                      <span>{new Date(surgicalCase.surgery_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-base">
                      <div className="p-1.5 bg-purple-500/10 rounded-lg">
                        <Hospital className="w-4 h-4 text-purple-500" />
                      </div>
                      <span className="truncate">{surgicalCase.hospital_name}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Procedures</div>
                      <div className="text-lg font-semibold">{surgicalCase.procedure_count || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Total RVU</div>
                      <div className="text-lg font-semibold">{surgicalCase.total_rvu || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Value</div>
                      <div className="text-lg font-semibold">
                        ${(surgicalCase.total_value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  {surgicalCase.primary_specialty && (
                    <div className="text-center py-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        {surgicalCase.primary_specialty}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t">
                    <Button asChild variant="ghost" size="sm" className="flex-1">
                      <Link to={`/cases/${surgicalCase.id}`}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="flex-1">
                      <Link to={`/cases/${surgicalCase.id}/edit`}>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(surgicalCase.id, surgicalCase.patient_name)}
                      className="flex-1 hover:text-destructive"
                      disabled={deletingId === surgicalCase.id}
                    >
                      {deletingId === surgicalCase.id ? (
                        <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CasesPage;
