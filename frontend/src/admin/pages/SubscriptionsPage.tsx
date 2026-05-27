// src/admin/pages/SubscriptionsPage.tsx

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/hooks/useToast';
import { adminService } from '@/admin/services/adminService';
import {
  Search,
  Trash2,
  Loader2,
  AlertCircle,
  Shield,
  Crown,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Star,
  CalendarClock,
  BadgeCheck,
} from 'lucide-react';

interface SubscriptionUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: number;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  plan: 'free' | 'premium';
  trial_ends_at: string | null;
  trial_active: boolean;
  is_permanent_premium: boolean;
  specialty?: string;
}

type FilterTab = 'all' | 'trial' | 'premium' | 'free' | 'admins';

const SubscriptionsPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<SubscriptionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers();
      setUsers(data);
    } catch {
      toast.error('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermanentPremium = async (user: SubscriptionUser) => {
    const newValue = !user.is_permanent_premium;
    setUpdatingId(user.id);
    try {
      await adminService.setPermanentPremium(user.id, newValue);
      setUsers(prev =>
        prev.map(u =>
          u.id === user.id
            ? { ...u, is_permanent_premium: newValue, plan: newValue ? 'premium' : u.plan }
            : u
        )
      );
      toast.success(
        newValue ? 'Premium Permanente activado' : 'Premium Permanente removido',
        newValue
          ? `${user.full_name || user.username} tiene acceso premium permanente`
          : `${user.full_name || user.username} vuelve a su plan anterior`
      );
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo actualizar');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (user: SubscriptionUser) => {
    const isAdmin = user.is_staff || user.role === 0;
    const confirmed = window.confirm(
      `¿Eliminar ${isAdmin ? 'al administrador' : 'al usuario'} "${user.full_name || user.username}"?\n\n` +
      `Esto eliminará PERMANENTEMENTE toda su información y casos.\n\nEsta acción NO se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    try {
      await adminService.deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      toast.success('Eliminado', `${user.full_name || user.username} fue eliminado`);
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const getTrialStatus = (user: SubscriptionUser) => {
    if (user.is_permanent_premium) return 'permanent';
    if (!user.trial_ends_at) return 'no-trial';
    const now = new Date();
    const trialEnd = new Date(user.trial_ends_at);
    if (trialEnd > now) return 'active-trial';
    return 'expired-trial';
  };

  const getDaysLeft = (trialEndsAt: string) => {
    const now = new Date();
    const end = new Date(trialEndsAt);
    const diffMs = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const filtered = users.filter(user => {
    const status = getTrialStatus(user);
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'trial' && status === 'active-trial') ||
      (activeTab === 'premium' && (status === 'permanent' || user.plan === 'premium')) ||
      (activeTab === 'free' && user.plan === 'free' && status === 'no-trial') ||
      (activeTab === 'admins' && (user.is_staff || user.role === 0));

    if (!matchesTab) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      (user.full_name || '').toLowerCase().includes(q)
    );
  });

  const stats = {
    total: users.length,
    activeTrial: users.filter(u => getTrialStatus(u) === 'active-trial').length,
    permanent: users.filter(u => u.is_permanent_premium).length,
    expiredTrial: users.filter(u => getTrialStatus(u) === 'expired-trial').length,
    admins: users.filter(u => u.is_staff || u.role === 0).length,
  };

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: stats.total },
    { id: 'trial', label: 'En Prueba', count: stats.activeTrial },
    { id: 'premium', label: 'Premium', count: stats.permanent },
    { id: 'free', label: 'Free', count: users.filter(u => u.plan === 'free' && getTrialStatus(u) === 'no-trial').length },
    { id: 'admins', label: 'Admins', count: stats.admins },
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
        <h1 className="text-3xl font-semibold tracking-tight">Suscripciones y Pruebas</h1>
        <p className="text-muted-foreground">
          Controla pruebas gratuitas, premium permanente y administradores
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-blue-600 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> En Prueba
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeTrial}</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-yellow-600 flex items-center gap-1">
              <Crown className="h-3.5 w-3.5" /> Premium Permanente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.permanent}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-red-500 flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" /> Prueba Vencida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.expiredTrial}</div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-purple-600 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" /> Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Search */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-background'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nombre, email o usuario..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No se encontraron usuarios</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(user => {
            const trialStatus = getTrialStatus(user);
            const isAdmin = user.is_staff || user.role === 0;
            const canDelete = !user.is_superuser;

            return (
              <Card
                key={user.id}
                className={`transition-colors ${
                  user.is_permanent_premium
                    ? 'border-yellow-300 dark:border-yellow-700'
                    : trialStatus === 'active-trial'
                    ? 'border-blue-300 dark:border-blue-700'
                    : trialStatus === 'expired-trial'
                    ? 'border-red-200 dark:border-red-800'
                    : 'hover:border-primary'
                }`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">
                          {user.full_name || user.username}
                        </span>
                        {user.is_superuser && (
                          <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                            <Shield className="h-3 w-3" /> Super Admin
                          </Badge>
                        )}
                        {isAdmin && !user.is_superuser && (
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs">
                            Admin
                          </Badge>
                        )}
                        {user.is_permanent_premium && (
                          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 flex items-center gap-1 text-xs">
                            <Crown className="h-3 w-3" /> Permanente
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Registro: {new Date(user.date_joined).toLocaleDateString('es-ES')}
                        {user.specialty && ` · ${user.specialty}`}
                      </p>
                    </div>

                    {/* Trial / Plan Status */}
                    <div className="flex flex-col items-start sm:items-end gap-1 text-sm min-w-[160px]">
                      {trialStatus === 'permanent' && (
                        <span className="flex items-center gap-1 text-yellow-600 font-medium">
                          <Crown className="h-4 w-4" /> Premium Permanente
                        </span>
                      )}
                      {trialStatus === 'active-trial' && user.trial_ends_at && (
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                          <Clock className="h-4 w-4" />
                          {getDaysLeft(user.trial_ends_at)}d restantes
                        </span>
                      )}
                      {trialStatus === 'active-trial' && user.trial_ends_at && (
                        <span className="text-xs text-muted-foreground">
                          Vence: {new Date(user.trial_ends_at).toLocaleDateString('es-ES')}
                        </span>
                      )}
                      {trialStatus === 'expired-trial' && user.trial_ends_at && (
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <XCircle className="h-4 w-4" /> Prueba vencida
                        </span>
                      )}
                      {trialStatus === 'expired-trial' && user.trial_ends_at && (
                        <span className="text-xs text-muted-foreground">
                          Venció: {new Date(user.trial_ends_at).toLocaleDateString('es-ES')}
                        </span>
                      )}
                      {trialStatus === 'no-trial' && user.plan === 'premium' && (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle2 className="h-4 w-4" /> Premium
                        </span>
                      )}
                      {trialStatus === 'no-trial' && user.plan === 'free' && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <BadgeCheck className="h-4 w-4" /> Free
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={user.is_permanent_premium ? 'outline' : 'default'}
                        onClick={() => handleTogglePermanentPremium(user)}
                        disabled={updatingId === user.id || user.is_superuser}
                        className={user.is_permanent_premium
                          ? 'border-yellow-300 text-yellow-600 hover:bg-yellow-50'
                          : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        }
                        title={user.is_superuser ? 'Los superusuarios siempre tienen acceso completo' : ''}
                      >
                        {updatingId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-1" />
                            {user.is_permanent_premium ? 'Quitar' : 'Permanente'}
                          </>
                        )}
                      </Button>

                      {canDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteUser(user)}
                          disabled={deletingId === user.id}
                          className="hover:bg-destructive hover:text-destructive-foreground border-destructive/30 text-destructive"
                        >
                          {deletingId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-4">
          <div className="flex gap-3 text-sm">
            <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-blue-700 dark:text-blue-200">
              Los superusuarios no pueden ser eliminados desde el panel. Para eliminar un superusuario
              usa la consola de Django admin o el CLI de Railway.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionsPage;
