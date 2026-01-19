// src/admin/components/AdvertisementFormDialog.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { X, Loader2, Save, Upload, Eye, TrendingUp } from 'lucide-react';
import { advertisementService, type Advertisement } from '@/admin/services/advertisementService';
import { clientService, type Client } from '@/admin/services/clientService';

interface AdvertisementFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  advertisement?: Advertisement | null;
  mode: 'create' | 'edit' | 'view';
}

export function AdvertisementFormDialog({ 
  open, 
  onClose, 
  onSuccess, 
  advertisement, 
  mode 
}: AdvertisementFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    client: '',
    campaign_name: '',
    title: '',
    description: '',
    image: null as File | null,
    image_alt_text: '',
    redirect_url: '',
    open_in_new_tab: true,
    placement: 'home_banner',
    priority: 0,
    start_date: '',
    end_date: '',
    status: 'draft',
  });

  const isReadOnly = mode === 'view';

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await clientService.getActiveClients();
        setClients(data);
      } catch (err) {
        console.error('Error loading clients:', err);
      }
    };
    if (open && !isReadOnly) {
      fetchClients();
    }
  }, [open, isReadOnly]);

  useEffect(() => {
    if (open) {
      if (advertisement) {
        setFormData({
          client: advertisement.client?.toString() || '',
          campaign_name: advertisement.campaign_name || '',
          title: advertisement.title || '',
          description: advertisement.description || '',
          image: null,
          image_alt_text: advertisement.image_alt_text || '',
          redirect_url: advertisement.redirect_url || '',
          open_in_new_tab: advertisement.open_in_new_tab ?? true,
          placement: advertisement.placement || 'home_banner',
          priority: advertisement.priority || 0,
          start_date: advertisement.start_date || '',
          end_date: advertisement.end_date || '',
          status: advertisement.status || 'draft',
        });
        setImagePreview(advertisement.image_url || null);
        setError(null);
      } else if (mode === 'create') {
        const today = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];
        
        setFormData({
          client: '',
          campaign_name: '',
          title: '',
          description: '',
          image: null,
          image_alt_text: '',
          redirect_url: '',
          open_in_new_tab: true,
          placement: 'home_banner',
          priority: 0,
          start_date: today,
          end_date: endDateStr,
          status: 'draft',
        });
        setImagePreview(null);
        setError(null);
      }
    }
  }, [advertisement, open, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isReadOnly) return;
    
    setError(null);

    if (mode === 'create' && !formData.image) {
      setError('Debes seleccionar una imagen');
      return;
    }

    setLoading(true);

    try {
      const submitData: any = {
        client: parseInt(formData.client),
        campaign_name: formData.campaign_name,
        title: formData.title,
        description: formData.description,
        image_alt_text: formData.image_alt_text,
        redirect_url: formData.redirect_url,
        open_in_new_tab: formData.open_in_new_tab,
        placement: formData.placement,
        priority: formData.priority,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
      };

      console.log('🚀 Preparando datos para envío:', submitData);

      if (formData.image) {
        submitData.image = formData.image;
      }

      if (mode === 'edit' && advertisement) {
        console.log('📝 Actualizando publicidad ID:', advertisement.id);
        await advertisementService.updateAdvertisement(advertisement.id, submitData);
      } else if (mode === 'create') {
        if (!formData.image) throw new Error('Imagen requerida');
        submitData.image = formData.image;
        console.log('✨ Creando nueva publicidad');
        await advertisementService.createAdvertisement(submitData);
      }
      
      console.log('✅ Éxito');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('❌ Error saving advertisement:', err);
      // Extraer mensaje detallado si es un error del servidor
      let errorMessage = 'Error al guardar el anuncio';
      if (err.message) {
        try {
          // Intentar parsear el error si viene como JSON string del service
          const parsed = JSON.parse(err.message);
          errorMessage = Object.entries(parsed)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join(' | ');
        } catch {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen');
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        setError('La imagen no debe superar 20MB');
        return;
      }

      setFormData(prev => ({ ...prev, image: file }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusDisplay = (status: string) => {
    const statuses: Record<string, string> = {
      active: 'Activo',
      paused: 'Pausado',
      completed: 'Finalizado',
      draft: 'Borrador'
    };
    return statuses[status] || status;
  };

  const getPlacementDisplay = (placement: string) => {
    const placements: Record<string, string> = {
      home_banner: 'Banner Principal',
      sidebar: 'Barra Lateral',
      footer: 'Footer',
      popup: 'Popup',
      between_content: 'Entre Contenido'
    };
    return placements[placement] || placement;
  };

  if (!open) return null;

  if (isReadOnly && advertisement) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
        <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detalles del Anuncio</CardTitle>
                  <CardDescription>
                    Información completa del anuncio publicitario
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {advertisement.image_url && (
                <div className="w-full bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={advertisement.image_url} 
                    alt={advertisement.image_alt_text || advertisement.campaign_name}
                    className="w-full h-auto object-contain max-h-96"
                  />
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Información Básica</h3>
                
                <div className="grid gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Cliente</label>
                    <p className="font-medium">{advertisement.client_name || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-muted-foreground">Nombre de la Campaña</label>
                    <p className="font-medium">{advertisement.campaign_name || 'N/A'}</p>
                  </div>

                  {advertisement.title && (
                    <div>
                      <label className="text-sm text-muted-foreground">Título</label>
                      <p className="font-medium">{advertisement.title}</p>
                    </div>
                  )}

                  {advertisement.description && (
                    <div>
                      <label className="text-sm text-muted-foreground">Descripción</label>
                      <p className="font-medium whitespace-pre-wrap">{advertisement.description}</p>
                    </div>
                  )}

                  {advertisement.image_alt_text && (
                    <div>
                      <label className="text-sm text-muted-foreground">Texto Alternativo</label>
                      <p className="font-medium">{advertisement.image_alt_text}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Configuración</h3>
                
                <div className="grid gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground">URL de Redirección</label>
                    {advertisement.redirect_url ? (
                      <a 
                        href={advertisement.redirect_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline block break-all"
                      >
                        {advertisement.redirect_url}
                      </a>
                    ) : (
                      <p className="font-medium">N/A</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Abrir en nueva pestaña</label>
                    <p className="font-medium">{advertisement.open_in_new_tab ? 'Sí' : 'No'}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Ubicación</label>
                      <p className="font-medium">{getPlacementDisplay(advertisement.placement)}</p>
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Prioridad</label>
                      <p className="font-medium">{advertisement.priority}</p>
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Estado</label>
                      <p className="font-medium">{getStatusDisplay(advertisement.status)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Periodo de Visualización</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Fecha de Inicio</label>
                    <p className="font-medium">{formatDate(advertisement.start_date)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Fecha de Fin</label>
                    <p className="font-medium">{formatDate(advertisement.end_date)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Métricas</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <label className="text-sm text-muted-foreground">Impresiones</label>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {(advertisement.impressions || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <label className="text-sm text-muted-foreground">Clicks</label>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {(advertisement.clicks || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <label className="text-sm text-muted-foreground">CTR</label>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                      {(advertisement.ctr || 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              {(advertisement.created_by_name || advertisement.created_at || advertisement.updated_at) && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg border-b pb-2">Información del Sistema</h3>
                  
                  <div className="grid gap-3 text-sm">
                    {advertisement.created_by_name && (
                      <div>
                        <label className="text-muted-foreground">Creado por</label>
                        <p className="font-medium">{advertisement.created_by_name}</p>
                      </div>
                    )}
                    {advertisement.created_at && (
                      <div>
                        <label className="text-muted-foreground">Fecha de creación</label>
                        <p className="font-medium">
                          {new Date(advertisement.created_at).toLocaleString('es-GT')}
                        </p>
                      </div>
                    )}
                    {advertisement.updated_at && (
                      <div>
                        <label className="text-muted-foreground">Última actualización</label>
                        <p className="font-medium">
                          {new Date(advertisement.updated_at).toLocaleString('es-GT')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {mode === 'create' ? 'Nuevo Anuncio' : 'Editar Anuncio'}
                </CardTitle>
                <CardDescription>
                  {mode === 'create' 
                    ? 'Crea un nuevo anuncio publicitario' 
                    : 'Actualiza la información del anuncio'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Información Básica</h3>
                
                <div>
                  <label className="text-sm font-medium">Cliente *</label>
                  <select
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Selecciona un cliente</option>
                    {Array.isArray(clients) && clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.company_name} ({client.plan_display})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Nombre de la Campaña *</label>
                  <Input
                    name="campaign_name"
                    value={formData.campaign_name}
                    onChange={handleChange}
                    placeholder="Ej: Campaña Verano 2025"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Título (opcional)</label>
                  <Input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Título visible del anuncio"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Descripción (opcional)</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Descripción del anuncio..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Imagen/GIF</h3>
                
                <div>
                  <label className="text-sm font-medium">
                    Imagen del Anuncio {mode === 'create' && '* (Requerido)'}
                    {mode === 'edit' && ' (opcional - solo si quieres cambiarla)'}
                  </label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label 
                      htmlFor="image-upload"
                      className="flex items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-lg cursor-pointer hover:border-primary transition-colors"
                    >
                      {imagePreview ? (
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-center">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Click para subir imagen o GIF
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Máximo 20MB
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Texto Alternativo</label>
                  <Input
                    name="image_alt_text"
                    value={formData.image_alt_text}
                    onChange={handleChange}
                    placeholder="Descripción de la imagen para accesibilidad"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Configuración</h3>
                
                <div>
                  <label className="text-sm font-medium">URL de Redirección *</label>
                  <Input
                    name="redirect_url"
                    type="url"
                    value={formData.redirect_url}
                    onChange={handleChange}
                    placeholder="https://ejemplo.com"
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="open_in_new_tab"
                    checked={formData.open_in_new_tab}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <label className="text-sm">Abrir en nueva pestaña</label>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium">Ubicación *</label>
                    <select
                      name="placement"
                      value={formData.placement}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="home_banner">Banner Principal</option>
                      <option value="sidebar">Barra Lateral</option>
                      <option value="footer">Footer</option>
                      <option value="popup">Popup</option>
                      <option value="between_content">Entre Contenido</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Prioridad</label>
                    <Input
                      name="priority"
                      type="number"
                      value={formData.priority}
                      onChange={handleChange}
                      placeholder="0-100"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Mayor = más prioridad
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Estado *</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="draft">Borrador</option>
                      <option value="active">Activo</option>
                      <option value="paused">Pausado</option>
                      <option value="completed">Finalizado</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Periodo de Visualización</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Fecha de Inicio *</label>
                    <Input
                      name="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fecha de Fin *</label>
                    <Input
                      name="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {mode === 'create' ? 'Crear Anuncio' : 'Actualizar'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}