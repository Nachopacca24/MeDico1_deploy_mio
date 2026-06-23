// src/admin/pages/UsersPage.tsx

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/hooks/useToast';
import { adminService } from '@/admin/services/adminService';
import {
  Search, Trash2, Briefcase, Calendar, Mail, Phone,
  Loader2, AlertCircle, Shield, Award, Star, StarOff,
  RotateCcw, Clock, Activity, UserCheck, UserX,
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
  last_login: string | null;
  plan: 'free' | 'premium';
  is_permanent_premium: boolean;
  trial_ends_at: string | null;
  ls_renews_at: string | null;
  ls_cancelled: boolean;
  ls_subscription_id: string | null;
  total_cases: number;
  total_favorites: number;
  has_google_calendar: boolean;
  has_colleagues: boolean;
  tutorial_completed: boolean;
  deletion_requested_at: string | null;
}

type TabFilter = 'all' | 'week' | 'premium' | 'free' | 'pending';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 30) return `Hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? 'es' : ''}`;
  if (days > 0) return `Hace ${days} día${days > 1 ? 's' : ''}`;
  if (hours > 0) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  if (mins > 0) return `Hace ${mins} min`;
  return 'Ahora mismo';
}

function isRecentlyActive(lastLogin: string | null): boolean {
  if (!lastLogin) return false;
  return Date.now() - new Date(lastLogin).getTime() < 7 * 24 * 3600000;
}

const UsersPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingPlanId, setUpdatingPlanId] = useState<number | null>(null);
  const [cancellingDeletionId, setCancellingDeletionId] = useState<number | null>(null);
  const [extendingTrialId, setExtendingTrialId] = useState<number | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers();
      // Sort by last_login desc (most recently active first)
      data.sort((a: User, b: User) => {
        if (!a.last_login && !b.last_login) return 0;
        if (!a.last_login) return 1;
        if (!b.last_login) return -1;
        return new Date(b.last_login).getTime() - new Date(a.last_login).getTime();
      });
      setUsers(data);
    } catch {
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
      `¿Estás seguro de eliminar al usuario "${userName}"?\n\nEsto eliminará PERMANENTEMENTE todos sus datos.\n\nEsta acción NO se puede deshacer.`
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
    const confirmed = window.confirm(`¿Cancelar la eliminación de "${userEmail}"? Esto reactivará la cuenta.`);
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

  const handleExtendTrial = async (userId: number, days: number) => {
    setExtendingTrialId(userId);
    try {
      const result = await adminService.extendTrial(userId, days);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: 'premium', trial_ends_at: result.trial_ends_at } : u));
      toast.success('Trial extendido', `Se agregaron ${days} días de trial`);
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo extender el trial');
    } finally {
      setExtendingTrialId(null);
    }
  };

  const tabFiltered = users.filter(u => {
    const isPending = !u.is_active && !u.is_superuser && !u.is_staff;
    switch (activeTab) {
      case 'week': return isRecentlyActive(u.last_login);
      case 'premium': return u.plan === 'premium';
      case 'free': return u.plan === 'free';
      case 'pending': return isPending;
      default: return true;
    }
  });

  const filteredUsers = tabFiltered.filter(user => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.first_name.toLowerCase().includes(q) ||
      user.last_name.toLowerCase().includes(q) ||
      user.specialty?.toLowerCase().includes(q)
    );
  });

  const getPlanBadge = (plan: string) => {
    const isPremium = plan === 'premium' || plan === 'gold';
    return isPremium
      ? <Badge className="bg-yellow-500 text-white gap-1">⭐ Premium</Badge>
      : <Badge className="bg-slate-400 text-white gap-1">🆓 Free</Badge>;
  };

  const tabs: { id: TabFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: users.length },
    { id: 'week', label: 'Activos esta semana', count: users.filter(u => isRecentlyActive(u.last_login)).length },
    { id: 'premium', label: 'Premium', count: users.filter(u => u.plan === 'premium').length },
    { id: 'free', label: 'Free', count: users.filter(u => u.plan === 'free').length },
    { id: 'pending', label: 'Pendientes eliminación', count: users.filter(u => !u.is_active && !u.is_superuser && !u.is_staff).length },
  ];

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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground">
          {filteredUsers.length} de {users.length} usuarios · ordenados por última actividad
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{users.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Activos esta semana</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600">{users.filter(u => isRecentlyActive(u.last_login)).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Premium</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">{users.filter(u => u.plan === 'premium').length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total casos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{users.reduce((s, u) => s + (u.total_cases || 0), 0)}</div></CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-600 flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Pend. eliminación</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{users.filter(u => !u.is_active && !u.is_superuser && !u.is_staff).length}</div></CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-muted'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nombre, email, usuario o especialidad..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
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
              <h3 className="text-xl font-semibold mb-2">Sin resultados</h3>
              <p className="text-muted-foreground">Ajustá los filtros o la búsqueda</p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map(user => {
            const isPendingDeletion = !user.is_active && !user.is_superuser && !user.is_staff;
            const deletionDate = user.deletion_requested_at
              ? new Date(new Date(user.deletion_requested_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-GT')
              : null;
            const recentlyActive = isRecentlyActive(user.last_login);

            return (
              <Card
                key={user.id}
                className={`transition-colors ${isPendingDeletion ? 'border-red-300 bg-red-50/30' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">
                          {user.first_name} {user.last_name}
                        </CardTitle>
                        {user.is_superuser && (
                          <Badge variant="destructive" className="gap-1"><Shield className="h-3 w-3" />Admin</Badge>
                        )}
                        {recentlyActive && (
                          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1">
                            <Activity className="h-3 w-3" /> Activo recientemente
                          </Badge>
                        )}
                        {isPendingDeletion ? (
                          <Badge className="bg-red-600 text-white gap-1">
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

                    {/* Último acceso — destacado */}
                    <div className="text-right shrink-0">
                      <div className={`text-xs font-semibold ${recentlyActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {user.last_login ? timeAgo(user.last_login) : 'Sin accesos'}
                      </div>
                      <div className="text-xs text-muted-foreground">último acceso</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Info básica */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.specialty && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="h-4 w-4 shrink-0" />
                        <span>{user.specialty}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>Registrado {timeAgo(user.date_joined)}</span>
                    </div>
                    {user.last_login && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <UserCheck className="h-4 w-4 shrink-0" />
                        <span>Último acceso: {new Date(user.last_login).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    {!user.last_login && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <UserX className="h-4 w-4 shrink-0" />
                        <span>Nunca ha iniciado sesión</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{user.total_cases || 0}</div>
                      <div className="text-xs text-muted-foreground font-medium">Casos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{user.total_favorites || 0}</div>
                      <div className="text-xs text-muted-foreground font-medium">Favoritos</div>
                    </div>
                    <div className="text-center">
                      <Award className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                      <div className="text-xs text-muted-foreground font-medium">{(user.plan || 'free').toUpperCase()}</div>
                    </div>
                  </div>

                  {/* Feature adoption */}
                  <div className="flex gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${user.tutorial_completed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-muted border-border text-muted-foreground'}`}>
                      <span>{user.tutorial_completed ? '✓' : '○'}</span> Tutorial
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${user.has_google_calendar ? 'bg-green-50 border-green-200 text-green-700' : 'bg-muted border-border text-muted-foreground'}`}>
                      <span>{user.has_google_calendar ? '✓' : '○'}</span> Google Calendar
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${user.has_colleagues ? 'bg-green-50 border-green-200 text-green-700' : 'bg-muted border-border text-muted-foreground'}`}>
                      <span>{user.has_colleagues ? '✓' : '○'}</span> Colegas
                    </span>
                  </div>

                  {/* Suscripción */}
                  {user.plan === 'premium' && !user.is_permanent_premium && (() => {
                    const now = new Date();
                    const fmt = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                    const daysLeft = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - now.getTime()) / 86400000));
                    if (user.trial_ends_at) {
                      const days = daysLeft(user.trial_ends_at);
                      return (
                        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>Trial · vence <strong>{fmt(user.trial_ends_at)}</strong> · <strong>{days} días restantes</strong></span>
                        </div>
                      );
                    }
                    if (user.ls_renews_at) {
                      const days = daysLeft(user.ls_renews_at);
                      const label = user.ls_cancelled ? 'Cancelado · acceso hasta' : 'Se renueva el';
                      const color = user.ls_cancelled
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700';
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
                    {isPendingDeletion && (
                      <Button variant="outline" size="sm" onClick={() => handleCancelDeletion(user.id, user.email)}
                        disabled={cancellingDeletionId === user.id}
                        className="flex-1 border-green-500 text-green-600 hover:bg-green-50">
                        {cancellingDeletionId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCcw className="h-4 w-4 mr-2" />Cancelar eliminación</>}
                      </Button>
                    )}
                    <Button variant={user.plan === 'premium' ? 'outline' : 'default'} size="sm"
                      onClick={() => handleTogglePlan(user.id, user.plan)}
                      disabled={updatingPlanId === user.id || user.is_superuser}
                      className="flex-1">
                      {updatingPlanId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> :
                        user.plan === 'premium'
                          ? <><StarOff className="h-4 w-4 mr-2" />Quitar Premium</>
                          : <><Star className="h-4 w-4 mr-2" />Hacer Premium</>}
                    </Button>
                    {user.plan === 'free' && !user.is_permanent_premium && (
                      <Button variant="outline" size="sm"
                        onClick={() => handleExtendTrial(user.id, 15)}
                        disabled={extendingTrialId === user.id}
                        className="flex-1 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300">
                        {extendingTrialId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Clock className="h-4 w-4 mr-2" />+15 días</>}
                      </Button>
                    )}
                    <Button variant="outline" size="sm"
                      onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                      className="flex-1 hover:bg-destructive hover:text-destructive-foreground"
                      disabled={deletingId === user.id || user.is_superuser}>
                      {deletingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-2" />Eliminar</>}
                    </Button>
                  </div>

                  {isPendingDeletion && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {user.deletion_requested_at
                          ? `Solicitud: ${new Date(user.deletion_requested_at).toLocaleString('es-GT')}`
                          : 'Cuenta desactivada — eliminación solicitada'}
                      </p>
                      {deletionDate && <p className="text-xs mt-0.5 text-red-600">Se eliminará definitivamente el {deletionDate}.</p>}
                    </div>
                  )}
                  {user.is_superuser && (
                    <div className="text-xs text-muted-foreground text-center bg-blue-50 p-2 rounded">
                      🛡️ Los superusuarios no pueden ser eliminados desde el panel
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UsersPage;
