// src/admin/pages/UsersPage.tsx

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/hooks/useToast';
import { adminService } from '@/admin/services/adminService';
import {
  Search,
  Trash2,
  Briefcase,
  Calendar,
  Mail,
  Phone,
  Loader2,
  AlertCircle,
  Shield,
  Award,
  Star,
  StarOff,
  RotateCcw,
  Clock,
} from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  specialty?: string;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  plan: 'free' | 'premium';
  is_permanent_premium: boolean;
  trial_ends_at: string | null;
  ls_renews_at: string | null;
  ls_cancelled: boolean;
  ls_subscription_id: string | null;
  total_cases: number;
  total_favorites: number;
  deletion_requested_at: string | null;
}

const UsersPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingPlanId, setUpdatingPlanId] = useState<number | null>(null);
  const [cancellingDeletionId, setCancellingDeletionId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlan = async (userId: number, currentPlan: string) => {
    const newPlan = currentPlan === 'premium' ? 'free' : 'premium';
    setUpdatingPlanId(userId);
    try {
      await adminService.updateUserPlan(userId, newPlan);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan as 'free' | 'premium' } : u));
      toast.success('Plan actualizado', `Usuario cambiado a ${newPlan === 'premium' ? 'Premium ⭐' : 'Free'}`);
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo cambiar el plan');
    } finally {
      setUpdatingPlanId(null);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar al usuario "${userName}"?\n\n` +
      `Esto eliminará PERMANENTEMENTE:\n` +
      `- Todos sus casos quirúrgicos\n` +
      `- Todos sus favoritos\n` +
      `- Toda su información\n\n` +
      `Esta acción NO se puede deshacer.`
    );

    if (!confirmed) return;

    setDeletingId(userId);
    try {
      await adminService.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      toast.success('Usuario eliminado', `${userName} fue eliminado exitosamente`);
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo eliminar el usuario');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelDeletion = async (userId: number, userEmail: string) => {
    const confirmed = window.confirm(
      `¿Cancelar la eliminación de la cuenta de "${userEmail}"?\n\nEsto reactivará la cuenta y el usuario podrá volver a iniciar sesión.`
    );
    if (!confirmed) return;
    setCancellingDeletionId(userId);
    try {
      await adminService.cancelAccountDeletion(userId);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_active: true, deletion_requested_at: null } : u
      ));
      toast.success('Cuenta reactivada', `La cuenta de ${userEmail} fue reactivada.`);
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo cancelar la eliminación.');
    } finally {
      setCancellingDeletionId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.first_name.toLowerCase().includes(query) ||
      user.last_name.toLowerCase().includes(query) ||
      user.specialty?.toLowerCase().includes(query)
    );
  });

  const getPlanBadge = (plan: string) => {
    const config: Record<string, { color: string; label: string; icon: string }> = {
      premium: { color: 'bg-yellow-500 text-white', label: 'Premium', icon: '⭐' },
      free: { color: 'bg-slate-400 text-white', label: 'Free', icon: '🆓' },
      // legacy values — safe fallback
      gold: { color: 'bg-yellow-500 text-white', label: 'Premium', icon: '⭐' },
      silver: { color: 'bg-slate-400 text-white', label: 'Free', icon: '🆓' },
      bronze: { color: 'bg-slate-400 text-white', label: 'Free', icon: '🆓' },
    };
    const { color, label, icon } = config[plan] || config.free;
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <span>{icon}</span>
        <span>{label}</span>
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground">
            Gestiona los usuarios de la plataforma ({filteredUsers.length} de {users.length})
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuarios Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Administradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.is_superuser).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Casos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.reduce((sum, u) => sum + (u.total_cases || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Eliminaciones Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {users.filter(u => !u.is_active && !u.is_superuser && !u.is_staff).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar por nombre, email, usuario o especialidad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No se encontraron usuarios</h3>
              <p className="text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map(user => {
            // Un usuario con is_active=false y no superusuario está pendiente de eliminación
            const isPendingDeletion = !user.is_active && !user.is_superuser && !user.is_staff;
            const deletionDate = user.deletion_requested_at
              ? new Date(new Date(user.deletion_requested_at).getTime() + 30 * 24 * 60 * 60 * 1000)
                  .toLocaleDateString('es-GT')
              : null;
            return (
            <Card
              key={user.id}
              className={`hover:border-primary transition-colors ${isPendingDeletion ? 'border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10' : ''}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">
                        {user.first_name} {user.last_name}
                      </CardTitle>
                      {user.is_superuser && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {isPendingDeletion ? (
                        <Badge className="bg-red-600 text-white flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {deletionDate ? `Eliminación el ${deletionDate}` : 'Eliminación pendiente'}
                        </Badge>
                      ) : !user.is_active ? (
                        <Badge variant="secondary">Inactivo</Badge>
                      ) : null}
                      {getPlanBadge(user.plan)}
                    </div>
                    <CardDescription>@{user.username}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* User Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {user.specialty && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span>{user.specialty}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Registrado: {new Date(user.date_joined).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Stats - Mejorados */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{user.total_cases || 0}</div>
                    <div className="text-xs text-muted-foreground font-medium">Casos Creados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{user.total_favorites || 0}</div>
                    <div className="text-xs text-muted-foreground font-medium">Favoritos</div>
                  </div>
                  <div className="text-center">
                    <Award className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                    <div className="text-xs text-muted-foreground font-medium">
                      {(user.plan || 'free').toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Subscription status */}
                {user.plan === 'premium' && !user.is_permanent_premium && (() => {
                  const now = new Date();
                  const fmt = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                  const daysLeft = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - now.getTime()) / 86400000));
                  if (user.trial_ends_at) {
                    const days = daysLeft(user.trial_ends_at);
                    return (
                      <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>Trial · vence el <strong>{fmt(user.trial_ends_at)}</strong> · <strong>{days} días restantes</strong></span>
                      </div>
                    );
                  }
                  if (user.ls_renews_at) {
                    const days = daysLeft(user.ls_renews_at);
                    const label = user.ls_cancelled ? 'Cancelado · acceso hasta' : 'Se renueva el';
                    const color = user.ls_cancelled
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                      : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300';
                    return (
                      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${color}`}>
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{label} <strong>{fmt(user.ls_renews_at)}</strong> · <strong>{days} días restantes</strong></span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t flex-wrap">
                  {/* Cancelar eliminación */}
                  {isPendingDeletion && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelDeletion(user.id, user.email)}
                      disabled={cancellingDeletionId === user.id}
                      className="flex-1 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                    >
                      {cancellingDeletionId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Cancelar eliminación
                        </>
                      )}
                    </Button>
                  )}
                  {/* Toggle plan button */}
                  <Button
                    variant={user.plan === 'premium' ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleTogglePlan(user.id, user.plan)}
                    disabled={updatingPlanId === user.id || user.is_superuser}
                    className="flex-1"
                  >
                    {updatingPlanId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : user.plan === 'premium' ? (
                      <>
                        <StarOff className="h-4 w-4 mr-2" />
                        Quitar Premium
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4 mr-2" />
                        Hacer Premium
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                    className="flex-1 hover:bg-destructive hover:text-destructive-foreground"
                    disabled={deletingId === user.id || user.is_superuser}
                    title={user.is_superuser ? 'No se puede eliminar un superusuario' : 'Eliminar usuario'}
                  >
                    {deletingId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </>
                    )}
                  </Button>
                </div>

                {isPendingDeletion && (
                  <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {user.deletion_requested_at
                        ? `Solicitud: ${new Date(user.deletion_requested_at).toLocaleString('es-GT')}`
                        : 'Cuenta desactivada — eliminación solicitada'}
                    </p>
                    <p className="text-xs mt-0.5 text-red-600 dark:text-red-400">
                      {deletionDate
                        ? `Se eliminará definitivamente el ${deletionDate}.`
                        : 'Se eliminará en hasta 30 días desde la solicitud.'}
                    </p>
                  </div>
                )}
                {user.is_superuser && (
                  <div className="text-xs text-muted-foreground text-center pt-2 bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                    🛡️ Los superusuarios no pueden ser eliminados desde el panel
                  </div>
                )}
              </CardContent>
            </Card>
          );
          })
        )}
      </div>

      {/* Info Note */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Información sobre la gestión de usuarios
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-200">
                Esta vista permite consultar información de usuarios. Los planes se asignan automáticamente según el registro.
                Los superusuarios solo se pueden crear con: 
                <code className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-xs">
                  python manage.py createsuperuser
                </code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;