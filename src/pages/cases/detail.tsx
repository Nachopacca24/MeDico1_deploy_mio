import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { surgicalCaseService } from "@/services/surgicalCaseService";
import type { SurgicalCase } from "@/types/surgical-case";
import {
  ArrowLeft,
  Calendar,
  Hospital,
  User,
  FileText,
  Stethoscope,
  DollarSign,
  Edit,
  Trash2,
  Clock,
  IdCard,
  AlertCircle,
} from "lucide-react";

const CaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [surgicalCase, setSurgicalCase] = useState<SurgicalCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCase();
    }
  }, [id]);

  const fetchCase = async () => {
    try {
      setLoading(true);
      const data = await surgicalCaseService.getCase(parseInt(id!));
      setSurgicalCase(data);
    } catch (err: any) {
      setError(err.message || 'Error loading case');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!surgicalCase) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete the case for ${surgicalCase.patient_name}?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    setDeleting(true);
    try {
      await surgicalCaseService.deleteCase(surgicalCase.id);
      navigate('/cases');
    } catch (err: any) {
      alert('Error deleting case: ' + err.message);
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { style: string; label: string }> = {
      scheduled: { style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', label: 'Scheduled' },
      completed: { style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: 'Completed' },
      billed: { style: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', label: 'Billed' },
      paid: { style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', label: 'Paid' },
      cancelled: { style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', label: 'Cancelled' },
    };

    const { style, label } = config[status] || config.scheduled;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${style}`}>
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-muted rounded animate-pulse" />
            <div className="flex-1">
              <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="h-6 w-48 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 w-full bg-muted rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !surgicalCase) {
    return (
      <AppLayout>
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Error loading case</h2>
            <p className="text-muted-foreground mb-6">{error || 'Case not found'}</p>
            <Button onClick={() => navigate('/cases')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cases
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/cases')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-semibold mb-1 tracking-tight">
                {surgicalCase.patient_name}
              </h1>
              <p className="text-muted-foreground">
                Case #{surgicalCase.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(surgicalCase.status)}
            <Button variant="outline" size="sm" asChild>
              <Link to={`/cases/${surgicalCase.id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Full Name</div>
                    <div className="font-medium">{surgicalCase.patient_name}</div>
                  </div>
                  {surgicalCase.patient_id && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <IdCard className="w-4 h-4" />
                        Patient ID
                      </div>
                      <div className="font-medium">{surgicalCase.patient_id}</div>
                    </div>
                  )}
                  {surgicalCase.patient_age && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Age</div>
                      <div className="font-medium">{surgicalCase.patient_age} years</div>
                    </div>
                  )}
                  {surgicalCase.patient_gender && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Gender</div>
                      <div className="font-medium">
                        {surgicalCase.patient_gender === 'M' ? 'Male' : surgicalCase.patient_gender === 'F' ? 'Female' : 'Other'}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Surgery Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5" />
                  Surgery Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Surgery Date
                    </div>
                    <div className="font-medium">
                      {new Date(surgicalCase.surgery_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  {surgicalCase.surgery_time && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Surgery Time
                      </div>
                      <div className="font-medium">{surgicalCase.surgery_time}</div>
                    </div>
                  )}
                  <div className="col-span-2">
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Hospital className="w-4 h-4" />
                      Hospital
                    </div>
                    <div className="font-medium">{surgicalCase.hospital_name}</div>
                  </div>
                </div>

                {surgicalCase.diagnosis && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Diagnosis</div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{surgicalCase.diagnosis}</p>
                    </div>
                  </div>
                )}

                {surgicalCase.notes && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Additional Notes
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{surgicalCase.notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Procedures */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Procedures ({surgicalCase.procedure_count || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {surgicalCase.procedures && surgicalCase.procedures.length > 0 ? (
                  <div className="space-y-3">
                    {surgicalCase.procedures.map((procedure, index) => (
                      <div
                        key={procedure.id || index}
                        className="p-4 border rounded-lg hover:border-primary transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-semibold mb-1">{procedure.surgery_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Code: {procedure.surgery_code} • {procedure.specialty}
                              {procedure.grupo && ` • ${procedure.grupo}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground mb-1">Order</div>
                            <div className="font-semibold">#{procedure.order || index + 1}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">RVU</div>
                            <div className="font-semibold">{procedure.rvu}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Factor</div>
                            <div className="font-semibold">{procedure.hospital_factor}x</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Value</div>
                            <div className="font-semibold text-primary">
                              ${procedure.calculated_value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        {procedure.notes && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs text-muted-foreground mb-1">Notes</div>
                            <p className="text-sm">{procedure.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No procedures recorded
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Procedures</div>
                  <div className="text-2xl font-bold">{surgicalCase.procedure_count || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total RVU</div>
                  <div className="text-2xl font-bold">{surgicalCase.total_rvu || 0}</div>
                </div>
                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground mb-1">Total Value</div>
                  <div className="text-3xl font-bold text-primary">
                    ${(surgicalCase.total_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Case Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {surgicalCase.primary_specialty && (
                  <div>
                    <div className="text-muted-foreground mb-1">Primary Specialty</div>
                    <div className="font-medium">{surgicalCase.primary_specialty}</div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground mb-1">Created</div>
                  <div className="font-medium">
                    {new Date(surgicalCase.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                {surgicalCase.updated_at && (
                  <div>
                    <div className="text-muted-foreground mb-1">Last Updated</div>
                    <div className="font-medium">
                      {new Date(surgicalCase.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CaseDetailPage;
