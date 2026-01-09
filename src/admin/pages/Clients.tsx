// src/admin/pages/Clients.tsx

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { 
  Plus, 
  Search, 
  Filter, 
  Loader2, 
  AlertCircle, 
  Briefcase,
  Calendar,
  DollarSign,
  Eye,
  Pencil,
  Trash2
} from 'lucide-react';
import { clientService, type Client } from '@/admin/services/clientService';
import { ClientFormDialog } from '@/admin/components/ClientFormDialog';

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchClients();
  }, [statusFilter, planFilter]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await clientService.getClients({
        status: statusFilter || undefined,
        plan: planFilter || undefined,
        search: search || undefined,
      });
      setClients(data);
    } catch (err: any) {
      console.error('Error loading clients:', err);
      setError(err.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchClients();
  };

  const handleNewClient = () => {
    setSelectedClient(null);
    setDialogOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setDialogOpen(true);
  };

  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`¿Estás seguro de eliminar a ${client.company_name}?`)) return;
    
    try {
      await clientService.deleteClient(client.id);
      fetchClients();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar cliente');
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando clientes...</p>
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
            <Button onClick={fetchClients} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulario Dialog */}
      <ClientFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={fetchClients}
        client={selectedClient}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los clientes que pagan por publicidad
          </p>
        </div>
        <Button onClick={handleNewClient}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por nombre, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} variant="secondary">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="pending">Pendiente</option>
              <option value="expired">Expirado</option>
            </select>

            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="">Todos los planes</option>
              <option value="gold">Oro</option>
              <option value="silver">Plata</option>
              <option value="bronze">Bronce</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay clientes</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comienza agregando tu primer cliente
            </p>
            <Button onClick={handleNewClient}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{client.company_name}</CardTitle>
                    <CardDescription className="mt-1">
                      {client.contact_name || client.email}
                    </CardDescription>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPlanColor(client.plan)}`}>
                    {client.plan_display}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estado:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(client.status)}`}>
                      {client.status_display}
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {formatDate(client.start_date)} - {formatDate(client.end_date)}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {client.currency} {parseFloat(client.amount_paid).toLocaleString()}
                    </span>
                  </div>

                  {/* Days Remaining */}
                  {client.is_active && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Días restantes: </span>
                      <span className={`font-medium ${client.days_remaining < 30 ? 'text-orange-600' : 'text-green-600'}`}>
                        {client.days_remaining}
                      </span>
                    </div>
                  )}

                  {/* Ad Count */}
                  <div className="text-sm">
                    <span className="text-muted-foreground">Anuncios: </span>
                    <span className="font-medium">{client.ad_count}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditClient(client)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClient(client)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clients;