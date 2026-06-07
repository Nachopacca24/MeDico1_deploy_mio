// src/admin/pages/AnnouncementsPage.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/hooks/useToast';
import { announcementService, type Announcement } from '@/services/announcementService';
import { Megaphone, Trash2, Loader2, Plus, Users } from 'lucide-react';

export default function AnnouncementsPage() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', body: '' });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setAnnouncements(await announcementService.adminGetAll());
    } catch {
      toast.error('Error', 'No se pudieron cargar los anuncios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Campos requeridos', 'El título y el mensaje son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      const created = await announcementService.adminCreate(form.title, form.body);
      setAnnouncements(prev => [created, ...prev]);
      setForm({ title: '', body: '' });
      toast.success('Anuncio enviado', 'Todos los usuarios verán el mensaje en el inicio.');
    } catch (e: any) {
      toast.error('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este anuncio? Los usuarios dejarán de verlo.')) return;
    setDeletingId(id);
    try {
      await announcementService.adminDelete(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Eliminado', 'El anuncio fue eliminado.');
    } catch {
      toast.error('Error', 'No se pudo eliminar el anuncio.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (a: Announcement) => {
    await announcementService.adminToggle(a.id, !a.is_active);
    setAnnouncements(prev =>
      prev.map(x => x.id === a.id ? { ...x, is_active: !a.is_active } : x)
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Megaphone className="h-7 w-7" />
          Anuncios
        </h1>
        <p className="text-muted-foreground">
          Enviá mensajes a todos los usuarios. Aparecen en el inicio con un indicador pulsante cuando son nuevos.
        </p>
      </div>

      {/* Formulario de nuevo anuncio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo anuncio
          </CardTitle>
          <CardDescription>
            El botón "Novedades del sistema" brillará para usuarios que no lo hayan visto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Ej: Nueva actualización disponible"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Mensaje</Label>
            <Textarea
              id="body"
              placeholder="Escribí el mensaje completo aquí..."
              rows={4}
              value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              disabled={saving}
              className="resize-none"
            />
          </div>
          <Button onClick={handleCreate} disabled={saving || !form.title || !form.body} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            {saving ? 'Enviando...' : 'Enviar a todos los usuarios'}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de anuncios */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Anuncios existentes ({announcements.length})
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No hay anuncios todavía.
            </CardContent>
          </Card>
        ) : (
          announcements.map(a => (
            <Card key={a.id} className={a.is_active ? '' : 'opacity-50'}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{a.title}</span>
                      <Badge variant={a.is_active ? 'default' : 'secondary'} className="text-xs">
                        {a.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString('es-GT')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {a.body}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(a)}
                    >
                      {a.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      className="hover:bg-destructive hover:text-destructive-foreground"
                    >
                      {deletingId === a.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
