// AdminDashboard.tsx - CON DATOS REALES

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Users, Stethoscope, TrendingUp, Calendar, Loader2, AlertCircle } from 'lucide-react';
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
        console.error('Error loading dashboard:', err);
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

  const statCards = [
    {
      title: 'Total Usuarios',
      value: stats?.totalUsers || 0,
      icon: Users,
      description: 'Usuarios registrados en el sistema',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Casos Totales',
      value: stats?.totalCases || 0,
      icon: Stethoscope,
      description: `${stats?.casesThisMonth || 0} este mes`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return { color: 'bg-blue-500', label: 'Usuario' };
      case 'case':
        return { color: 'bg-green-500', label: 'Caso' };
      case 'hospital':
        return { color: 'bg-purple-500', label: 'Hospital' };
      default:
        return { color: 'bg-gray-500', label: 'Otro' };
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'Justo ahora';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Administración</h1>
        <p className="text-muted-foreground mt-1">
          Vista general del sistema y estadísticas principales
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
          <CardDescription>
            Últimas acciones en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay actividad reciente
            </p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 5).map((activity) => {
                const activityStyle = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 ${activityStyle.color} rounded-full`} />
                    <div className="flex-1">
                      <p className="text-foreground">{activity.description}</p>
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