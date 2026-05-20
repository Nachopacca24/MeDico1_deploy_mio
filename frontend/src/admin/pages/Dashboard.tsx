// AdminDashboard.tsx

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  Users, Stethoscope, TrendingUp, Calendar, Loader2, AlertCircle,
  Star, Eye, MousePointerClick, Megaphone, Activity
} from 'lucide-react';
import { adminService } from '@/admin/services/adminService';
import type { AdminStats, RecentActivity } from '@/admin/services/adminService';

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, activitiesData] = await Promise.all([
          adminService.getDashboardStats(),
          adminService.getRecentActivity()
        ]);
        setStats(statsData);
        setActivities(activitiesData);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="border-destructive max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error al cargar datos</h2>
            <p className="text-muted-foreground text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return { color: 'bg-blue-500', label: 'Usuario' };
      case 'case': return { color: 'bg-green-500', label: 'Caso' };
      case 'hospital': return { color: 'bg-purple-500', label: 'Hospital' };
      default: return { color: 'bg-gray-500', label: 'Otro' };
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'Justo ahora';
  };

  const maxSpecialtyCount = Math.max(...(stats?.specialtyStats?.map(s => s.count) ?? [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Vista general del sistema</p>
      </div>

      {/* ─── Métricas principales ─── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Médicos</CardTitle>
            <div className="p-2 rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">usuarios registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Casos Totales</CardTitle>
            <div className="p-2 rounded-lg bg-purple-50">
              <Stethoscope className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalCases ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.casesThisMonth ?? 0} este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Premium</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-50">
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.premiumUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.freeUsers ?? 0} en plan Free
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Anuncios Activos</CardTitle>
            <div className="p-2 rounded-lg bg-green-50">
              <Megaphone className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.adStats?.activeAds ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">campañas en curso</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Estadísticas de publicidad ─── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Impresiones totales</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.adStats?.totalImpressions ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Clicks totales</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.adStats?.totalClicks ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">CTR Global</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.adStats?.ctr ?? 0}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ─── Especialidades ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Médicos por especialidad
            </CardTitle>
            <CardDescription>Top {stats?.specialtyStats?.length ?? 0} especialidades</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.specialtyStats?.length ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Sin datos de especialidad</p>
            ) : (
              <div className="space-y-3">
                {stats.specialtyStats.map(({ specialty, count }) => (
                  <div key={specialty} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{specialty}</span>
                      <Badge variant="secondary" className="ml-2 flex-shrink-0">{count}</Badge>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(count / maxSpecialtyCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Top anuncios ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Top anuncios
            </CardTitle>
            <CardDescription>Por impresiones</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.adStats?.topAds?.length ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Sin datos de anuncios</p>
            ) : (
              <div className="space-y-3">
                {stats.adStats.topAds.map((ad) => (
                  <div key={ad.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                    <span className="font-medium truncate flex-1 mr-3">{ad.campaign_name}</span>
                    <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {ad.impressions.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MousePointerClick className="h-3 w-3" />
                        {ad.clicks.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Actividad reciente ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Actividad reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay actividad reciente</p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 8).map((activity) => {
                const style = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 ${style.color} rounded-full flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground truncate">{activity.description}</p>
                      {activity.user_name && (
                        <p className="text-xs text-muted-foreground">{activity.user_name}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
