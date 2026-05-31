// src/pages/settings.tsx

import { useState, useEffect } from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { useToast } from "@/shared/hooks/use-toast";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useGoogleCalendar } from "@/shared/hooks/useGoogleCalendar";
import { Calendar, CheckCircle2, XCircle, Loader2, Star, Zap, Eye, MessageSquare, FileText, Shield, ExternalLink, CreditCard, BarChart2, Heart, Building2, Users, Infinity, Sparkles } from "lucide-react";
import { authService } from "@/shared/services/authService";

const API_URL = import.meta.env.VITE_API_URL || '';

async function createCheckout(): Promise<string> {
  const response = await authService.authenticatedFetch(`${API_URL}/api/v1/payment/checkout/`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Error al crear checkout');
  const data = await response.json();
  return data.url;
}

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const url = await createCheckout();
      window.open(url, '_blank');
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo abrir el checkout. Intenta de nuevo.' });
    } finally {
      setCheckoutLoading(false);
    }
  };
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Google Calendar
  const {
    isConnected,
    userEmail,
    isLoading: calendarLoading,
    connect,
    disconnect
  } = useGoogleCalendar();

  const [settings, setSettings] = useState({
    name: "",
    email: "",
    darkMode: false,
    notifications: true,
    defaultCurrency: "GTQ",
    defaultHospitalId: "",
  });

  useEffect(() => {
    if (user) {
      setSettings(prev => ({
        ...prev,
        name: user.name || user.full_name || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setSettings(prev => ({ ...prev, [name]: checked }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      toast({
        title: "Perfil actualizado",
        description: "Tu información de perfil fue guardada.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const htmlElement = document.documentElement;
      if (settings.darkMode) {
        htmlElement.classList.add("dark");
      } else {
        htmlElement.classList.remove("dark");
      }
      
      toast({
        title: "Preferencias guardadas",
        description: "Tus preferencias fueron actualizadas.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar las preferencias.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="pb-4 border-b">
          <h1 className="text-3xl font-semibold mb-1 tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">
            Administra tu cuenta y preferencias
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="inline-flex gap-1">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="preferences">Preferencias</TabsTrigger>
            <TabsTrigger value="plan">Mi Plan</TabsTrigger>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
            <TabsTrigger value="legal">Legal</TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Información de Perfil</CardTitle>
                <CardDescription>
                  Actualiza tu información personal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    name="name"
                    value={settings.name}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={settings.email}
                    onChange={handleChange}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    El correo electrónico no puede modificarse
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Cambios"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Preferencias de la Aplicación</CardTitle>
                <CardDescription>
                  Personaliza tu experiencia
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="darkMode">Modo Oscuro</Label>
                    <p className="text-sm text-muted-foreground">
                      Activa el tema oscuro
                    </p>
                  </div>
                  <Switch
                    id="darkMode"
                    checked={settings.darkMode}
                    onCheckedChange={(checked) => handleSwitchChange("darkMode", checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">Notificaciones</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibir notificaciones sobre actualizaciones
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={settings.notifications}
                    onCheckedChange={(checked) => handleSwitchChange("notifications", checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">Moneda Predeterminada</Label>
                  <Input
                    id="defaultCurrency"
                    name="defaultCurrency"
                    value={settings.defaultCurrency}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Código de moneda (ej: GTQ para Quetzal guatemalteco)
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleSavePreferences}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Preferencias"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Plan Tab */}
          <TabsContent value="plan">
            <div className="space-y-4">
              {/* Current plan card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tu Plan Actual</CardTitle>
                      <CardDescription>
                        {user?.is_permanent_premium
                          ? 'Tienes acceso Premium permanente'
                          : user?.plan === 'premium' && user?.trial_ends_at
                          ? `Período de prueba — vence el ${new Date(user.trial_ends_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`
                          : user?.plan === 'premium'
                          ? 'Estás disfrutando de MeDico Premium'
                          : 'Estás en el plan gratuito de MeDico'}
                      </CardDescription>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm ${
                      user?.plan === 'premium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {user?.plan === 'premium' ? <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" /> : null}
                      {user?.plan === 'premium' ? 'Premium' : 'Free'}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Feature comparison */}
              <div className="grid md:grid-cols-2 gap-4 items-stretch">

                {/* Free */}
                <div className={`rounded-xl border flex flex-col overflow-hidden transition-all ${user?.plan !== 'premium' ? 'border-primary ring-2 ring-primary shadow-md' : 'border-border'}`}>
                  <div className="p-6 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gratis</span>
                      {user?.plan !== 'premium' && (
                        <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Tu plan actual</span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold mt-1">Plan Free</h3>
                    <p className="text-sm text-muted-foreground mt-1">Para empezar sin compromisos</p>
                    <div className="flex items-end gap-1 mt-4">
                      <span className="text-4xl font-extrabold tracking-tight">$0</span>
                      <span className="text-muted-foreground text-sm mb-1">/mes</span>
                    </div>
                  </div>
                  <div className="px-6 pb-6 flex-1 flex flex-col">
                    <div className="space-y-3 flex-1">
                      {[
                        { icon: <Zap className="h-4 w-4 text-blue-500" />,      text: '5 cirugías activas' },
                        { icon: <Heart className="h-4 w-4 text-rose-400" />,    text: '5 procedimientos en favoritos' },
                        { icon: <Building2 className="h-4 w-4 text-slate-400" />, text: '2 hospitales favoritos' },
                        { icon: <Users className="h-4 w-4 text-violet-400" />,  text: 'Hasta 3 colegas + sistema completo' },
                        { icon: <Calendar className="h-4 w-4 text-green-500" />, text: 'Integración con Google Calendar' },
                        { icon: <XCircle className="h-4 w-4 text-muted-foreground/40" />, text: 'Con anuncios', muted: true },
                        { icon: <XCircle className="h-4 w-4 text-muted-foreground/40" />, text: 'Sin estadísticas personales', muted: true },
                      ].map(({ icon, text, muted }) => (
                        <div key={text} className="flex items-center gap-3 text-sm">
                          <span className="flex-shrink-0">{icon}</span>
                          <span className={muted ? 'text-muted-foreground line-through' : ''}>{text}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" disabled className="w-full mt-6 cursor-default opacity-60">
                      Plan actual
                    </Button>
                  </div>
                </div>

                {/* Premium */}
                <div className={`rounded-xl flex flex-col overflow-hidden relative transition-all shadow-lg ${user?.plan === 'premium' ? 'ring-2 ring-yellow-400 shadow-yellow-500/20' : 'ring-2 ring-yellow-400/60 shadow-yellow-500/10'}`}>
                  {/* gradient header */}
                  <div className="bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-400 p-6 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-yellow-900" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-yellow-900">Recomendado</span>
                      </div>
                      {user?.plan === 'premium' && (
                        <span className="text-xs font-bold bg-white/30 text-yellow-900 px-2 py-0.5 rounded-full">✓ Activo</span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-yellow-950 mt-1">Premium</h3>
                    <p className="text-sm text-yellow-900/80 mt-1">Experiencia completa, sin límites</p>
                    <div className="flex items-end gap-1 mt-4">
                      <span className="text-5xl font-extrabold tracking-tight text-yellow-950">$9</span>
                      <span className="text-yellow-900/70 text-sm mb-2">/mes</span>
                    </div>
                  </div>
                  {/* features */}
                  <div className="bg-card px-6 pb-6 pt-5 flex-1 flex flex-col border border-yellow-400/40 border-t-0 rounded-b-xl">
                    <div className="space-y-3 flex-1">
                      {[
                        { icon: <Infinity className="h-4 w-4 text-yellow-500" />,   text: 'Cirugías activas ilimitadas' },
                        { icon: <Heart className="h-4 w-4 text-rose-400" />,        text: 'Procedimientos favoritos ilimitados' },
                        { icon: <Building2 className="h-4 w-4 text-amber-500" />,   text: 'Hospitales favoritos ilimitados' },
                        { icon: <Users className="h-4 w-4 text-violet-400" />,      text: 'Colegas ilimitados + colaboración' },
                        { icon: <Calendar className="h-4 w-4 text-green-500" />,    text: 'Google Calendar integrado' },
                        { icon: <BarChart2 className="h-4 w-4 text-blue-400" />,    text: 'Estadísticas personales avanzadas' },
                        { icon: <Shield className="h-4 w-4 text-emerald-500" />,    text: 'Sin anuncios ni interrupciones' },
                        { icon: <Sparkles className="h-4 w-4 text-yellow-500" />,   text: 'Acceso anticipado a nuevas funciones' },
                      ].map(({ icon, text }) => (
                        <div key={text} className="flex items-center gap-3 text-sm">
                          <span className="flex-shrink-0">{icon}</span>
                          <span className="font-medium">{text}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6">
                      {user?.plan === 'premium' ? (
                        <Button disabled className="w-full bg-slate-700 text-yellow-400 font-bold border border-yellow-500/40 cursor-not-allowed opacity-80">
                          <Star className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400" /> Plan Activo
                        </Button>
                      ) : (
                        <Button
                          onClick={handleUpgrade}
                          disabled={checkoutLoading}
                          className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-yellow-950 font-bold shadow-lg shadow-yellow-500/30 border-0"
                        >
                          {checkoutLoading
                            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cargando...</>
                            : <><CreditCard className="h-4 w-4 mr-2" /> Suscribirme — $9/mes</>
                          }
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </TabsContent>

          {/* Google Calendar Tab */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Google Calendar</CardTitle>
                      <CardDescription>
                        Sincroniza tus casos quirúrgicos con Google Calendar
                      </CardDescription>
                    </div>
                  </div>
                  {isConnected ? (
                    <Badge className="gap-1" variant="default">
                      <CheckCircle2 className="h-3 w-3" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge className="gap-1" variant="secondary">
                      <XCircle className="h-3 w-3" />
                      Desconectado
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isConnected ? (
                  <>
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        Tu cuenta <strong>{userEmail}</strong> está conectada. Los nuevos casos se
                        agregarán automáticamente a tu calendario de Google.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-muted-foreground">
                        Cuando crees o modifiques un caso quirúrgico, se sincronizará automáticamente
                        con tu Google Calendar. Los recordatorios se configuran para:
                      </p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                        <li>1 hora antes de la cirugía</li>
                        <li>1 día antes de la cirugía</li>
                      </ul>
                    </div>

                    <Button
                      variant="destructive"
                      onClick={disconnect}
                      disabled={calendarLoading}
                    >
                      Desconectar Google Calendar
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm">
                        Conecta tu cuenta de Google para sincronizar automáticamente tus casos
                        quirúrgicos con Google Calendar.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        No guardamos tus credenciales. La conexión es directa entre tu navegador
                        y Google.
                      </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <p className="text-sm font-medium">Beneficios de conectar:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Sincronización automática de casos quirúrgicos</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Recordatorios en tu dispositivo móvil</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Integración con otros dispositivos y servicios</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>No se guardan credenciales en nuestra base de datos</span>
                        </li>
                      </ul>
                    </div>

                    <Button
                      onClick={connect}
                      disabled={calendarLoading}
                      className="w-full sm:w-auto gap-2"
                    >
                      {calendarLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <Calendar className="h-4 w-4" />
                          Conectar con Google Calendar
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Seguridad</CardTitle>
                <CardDescription>
                  Administra tu contraseña y sesión
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña Actual</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    placeholder="Ingresa tu contraseña actual"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="Ingresa la nueva contraseña"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirma la nueva contraseña"
                  />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Gestión de Sesión</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Estás conectado en este dispositivo
                  </p>
                  <Button variant="outline" size="sm">
                    Cerrar sesión en todos los dispositivos
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Actualizar Contraseña"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          {/* Legal Tab */}
          <TabsContent value="legal">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Documentos Legales</CardTitle>
                  <CardDescription>
                    Términos de uso y política de privacidad de MéDico App
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <a
                    href="/terms.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Términos de Uso</p>
                        <p className="text-xs text-muted-foreground">Condiciones de uso del servicio · Última actualización: Mayo 2026</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>

                  <a
                    href="/privacy.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Política de Privacidad</p>
                        <p className="text-xs text-muted-foreground">Cómo protegemos y usamos tus datos · Última actualización: Mayo 2026</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sobre el Cifrado de tus Datos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Los datos sensibles de tus pacientes (nombre, ID, diagnóstico, notas) están cifrados en el servidor con <strong className="text-foreground">Fernet (AES-128-CBC + HMAC-SHA256)</strong>. Los datos viajan siempre por HTTPS y se almacenan cifrados en la base de datos.
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Para consultas sobre privacidad: <a href="mailto:contacto@medicoapp.app" className="text-primary underline underline-offset-2 hover:text-primary/80 dark:text-primary dark:hover:text-primary/70 transition-colors">contacto@medicoapp.app</a>
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;