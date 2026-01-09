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
  Award
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
  plan: 'bronze' | 'silver' | 'gold';
  total_cases: number;
  total_favorites: number;
}

const UsersPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
      gold: { color: 'bg-yellow-500 text-white', label: 'Gold', icon: '👑' },
      silver: { color: 'bg-gray-400 text-white', label: 'Silver', icon: '⭐' },
      bronze: { color: 'bg-amber-700 text-white', label: 'Bronze', icon: '🥉' },
    };
    const { color, label, icon } = config[plan] || config.bronze;
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
          filteredUsers.map(user => (
            <Card key={user.id} className="hover:border-primary transition-colors">
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
                      {!user.is_active && (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
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
                      {(user.plan || 'bronze').toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Plan Info - Solo lectura */}
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Plan Actual:</span>
                    </div>
                    {getPlanBadge(user.plan)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
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
                        Eliminar Usuario
                      </>
                    )}
                  </Button>
                </div>

                {user.is_superuser && (
                  <div className="text-xs text-muted-foreground text-center pt-2 bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                    🛡️ Los superusuarios no pueden ser eliminados desde el panel
                  </div>
                )}
              </CardContent>
            </Card>
          ))
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