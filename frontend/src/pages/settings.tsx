// src/pages/settings.tsx

import { useState, useEffect } from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
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
import { Calendar, CheckCircle2, XCircle, Loader2, Star, Zap, Eye, MessageSquare, FileText, Shield, ExternalLink, CreditCard, BarChart2, Heart, Building2, Users, Infinity, Sparkles, ImagePlus, ShieldCheck, Calculator, BookOpen, Trash2, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { authService } from "@/shared/services/authService";
import { useTutorial } from "@/core/contexts/TutorialContext";
import { pushNotificationService } from "@/services/pushNotificationService";

const API_URL = import.meta.env.VITE_API_URL || '';

async function createCheckout(): Promise<string> {
  const response = await authService.authenticatedFetch(`${API_URL}/api/v1/payment/checkout/`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Error al crear checkout');
  const data = await response.json();
  return data.url;
}

async function cancelSubscription(): Promise<void> {
  const response = await authService.authenticatedFetch(`${API_URL}/api/v1/payment/cancel/`, {
    method: 'POST',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Error al cancelar suscripción');
  }
}

const TAB_OPTIONS = [
  { value: 'profile',     label: 'Perfil' },
  { value: 'preferences', label: 'Preferencias' },
  { value: 'plan',        label: 'Mi Plan' },
  { value: 'calendar',    label: 'Calendario' },
  { value: 'security',    label: 'Seguridad' },
  { value: 'tutorial',    label: 'Tutorial' },
  { value: 'legal',       label: 'Legal y Cuenta' },
];

const Settings = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      await cancelSubscription();
      await refreshUser();
      toast({
        title: 'Suscripción cancelada',
        description: 'Tu plan Premium se mantendrá activo hasta el fin del período de facturación.',
      });
      setShowCancelConfirm(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo cancelar. Intenta de nuevo.' });
    } finally {
      setCancelLoading(false);
    }
  };

  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const { restartTutorial, tutorialState } = useTutorial();

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await authService.deleteAccount({ confirmation: deleteInput });
      toast({
        title: 'Solicitud enviada',
        description: 'Tu cuenta fue desactivada. Los datos serán eliminados en 30 días.',
        duration: 6000,
      });
      window.location.href = '/login';
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };
  
  // Google Calendar
  const {
    isConnected,
    userEmail,
    isLoading: calendarLoading,
    connect,
    disconnect
  } = useGoogleCalendar();

  const [surgeryReminderHours, setSurgeryReminderHours] = useState<number>(24);
  const [notifStatus, setNotifStatus] = useState<'active' | 'no-permission' | 'no-token' | 'not-native' | null>(null);

  useEffect(() => {
    pushNotificationService.checkStatus().then(setNotifStatus);
  }, []);

  const [settings, setSettings] = useState({
    first_name: "",
    last_name: "",
    email: "",
    darkMode: false,
    notifications: true,
    defaultCurrency: "GTQ",
    defaultHospitalId: "",
  });

  const [passwords, setPasswords] = useState({
    old_password: "",
    new_password: "",
    new_password2: "",
  });

  useEffect(() => {
    if (user) {
      setSettings(prev => ({
        ...prev,
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
      }));
      setSurgeryReminderHours(user.surgery_reminder_hours ?? 24);
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setSettings(prev => ({ ...prev, [name]: checked }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await authService.updateProfile({
        first_name: settings.first_name,
        last_name: settings.last_name,
      });
      toast({ title: "Perfil actualizado", description: "Tu información de perfil fue guardada." });
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar el perfil.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (!passwords.old_password || !passwords.new_password || !passwords.new_password2) {
      toast({ title: "Error", description: "Completá todos los campos.", variant: "destructive" });
      return;
    }
    if (passwords.new_password !== passwords.new_password2) {
      toast({ title: "Error", description: "Las contraseñas nuevas no coinciden.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await authService.changePassword(passwords);
      toast({ title: "Contraseña actualizada", description: "Tu contraseña fue cambiada correctamente." });
      setPasswords({ old_password: "", new_password: "", new_password2: "" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "No se pudo cambiar la contraseña.";
      toast({ title: "Error", description: msg, variant: "destructive" });
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
      await authService.updateProfile({
        surgery_reminder_hours: surgeryReminderHours,
        theme_preference: settings.darkMode ? 'dark' : 'light',
      });
      toast({ title: "Preferencias guardadas", description: "Tus preferencias fueron actualizadas." });
    } catch {
      toast({ title: "Error", description: "No se pudieron guardar las preferencias.", variant: "destructive" });
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {isMobile ? (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
              {TAB_OPTIONS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setActiveTab(t.value)}
                  {...(t.value === 'plan' ? { 'data-tutorial': 'settings-plan-tab' } : {})}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all border
                    ${activeTab === t.value
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted text-muted-foreground border-transparent hover:border-primary/30'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <TabsList className="inline-flex gap-1">
              {TAB_OPTIONS.map(t => (
                <TabsTrigger key={t.value} value={t.value} {...(t.value === 'plan' ? { 'data-tutorial': 'settings-plan-tab' } : {})}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          )}
          
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Nombre</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={settings.first_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Apellido</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={settings.last_name}
                      onChange={handleChange}
                    />
                  </div>
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

                {notifStatus && notifStatus !== 'not-native' && (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label>Notificaciones push</Label>
                      <p className="text-xs text-muted-foreground">
                        {notifStatus === 'active' && 'Tu dispositivo recibirá notificaciones'}
                        {notifStatus === 'no-permission' && 'Permiso denegado — habilitá las notificaciones en Ajustes del sistema'}
                        {notifStatus === 'no-token' && 'No se pudo registrar el dispositivo — cerrá sesión y volvé a entrar'}
                      </p>
                    </div>
                    {notifStatus === 'active'
                      ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      : <XCircle className="h-5 w-5 text-destructive shrink-0" />
                    }
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="surgeryReminder">Recordatorio de cirugía</Label>
                  <Select
                    value={String(surgeryReminderHours)}
                    onValueChange={(v) => setSurgeryReminderHours(Number(v))}
                  >
                    <SelectTrigger id="surgeryReminder" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hora antes</SelectItem>
                      <SelectItem value="2">2 horas antes</SelectItem>
                      <SelectItem value="6">6 horas antes</SelectItem>
                      <SelectItem value="12">12 horas antes</SelectItem>
                      <SelectItem value="24">24 horas antes (predeterminado)</SelectItem>
                      <SelectItem value="48">48 horas antes</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Recibirás una notificación push antes de cada cirugía programada
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
            <style>{`
              @keyframes float-star {
                0%, 100% { transform: translateY(0px) rotate(-5deg); }
                50%       { transform: translateY(-5px) rotate(5deg); }
              }
              @keyframes shimmer-sweep {
                0%   { transform: translateX(-200%); }
                100% { transform: translateX(200%); }
              }
              @keyframes glow-breathe {
                0%, 100% { box-shadow: 0 0 18px 2px rgba(251,191,36,0.12); }
                50%       { box-shadow: 0 0 36px 6px rgba(251,191,36,0.30); }
              }
              .float-star  { animation: float-star 3s ease-in-out infinite; }
              .premium-glow { animation: glow-breathe 3s ease-in-out infinite; }
              .shimmer-btn { position: relative; overflow: hidden; }
              .shimmer-btn::after {
                content: '';
                position: absolute; inset: 0;
                background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%);
                animation: shimmer-sweep 2.4s ease-in-out infinite;
              }
            `}</style>
            <div className="space-y-4">
              {/* Current plan card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tu Plan Actual</CardTitle>
                      <CardDescription>
                        {(() => {
                        const fmt = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
                        if (user?.is_permanent_premium) return 'Tienes acceso Premium permanente';
                        if (user?.plan === 'premium' && user?.trial_ends_at)
                          return `Período de prueba — vence el ${fmt(user.trial_ends_at)}`;
                        if (user?.plan === 'premium' && user?.ls_cancelled && user?.ls_renews_at)
                          return `Cancelado — acceso hasta el ${fmt(user.ls_renews_at)}`;
                        if (user?.plan === 'premium' && user?.ls_renews_at)
                          return `Suscripción activa · Se renueva el ${fmt(user.ls_renews_at)}`;
                        if (user?.plan === 'premium') return 'Suscripción Premium activa';
                        return 'Estás en el plan gratuito de MeDico App';
                      })()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm ${
                        user?.plan === 'premium'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {user?.plan === 'premium' ? <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" /> : null}
                        {user?.plan === 'premium' ? 'Premium' : 'Free'}
                      </div>
                      {/* Cancel button — only for paying premium users (not permanent/trial) */}
                      {user?.plan === 'premium' && !user?.is_permanent_premium && !user?.trial_ends_at && !user?.ls_cancelled && (
                        !showCancelConfirm ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive text-xs"
                            onClick={() => setShowCancelConfirm(true)}
                          >
                            Cancelar suscripción
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">¿Confirmar cancelación?</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs h-7"
                              disabled={cancelLoading}
                              onClick={handleCancelSubscription}
                            >
                              {cancelLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sí, cancelar'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
                              onClick={() => setShowCancelConfirm(false)}
                            >
                              No
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Over-limit warning: shown when free user tries to create and backend returns 403 */}
              {user?.plan === 'free' && (
                <Alert className="border-slate-700 bg-slate-800/50">
                  <AlertDescription className="text-slate-400 text-sm">
                    Plan gratuito: hasta <strong>5 cirugías activas</strong>, 3 colegas, 5 procedimientos y 2 hospitales favoritos.
                    Si superás el límite al pasar a free, archivá cirugías para volver a crear nuevas.
                  </AlertDescription>
                </Alert>
              )}

              {/* Feature comparison */}
              <div className="grid md:grid-cols-2 gap-4 items-stretch">

                {/* ── Free ─────────────────────────────────────────── */}
                <div className={`rounded-2xl border bg-card flex flex-col overflow-hidden transition-all ${user?.plan !== 'premium' ? 'border-slate-500 ring-1 ring-slate-500/60 shadow-md' : 'border-border'}`}>
                  <div className="p-6 pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Gratis</span>
                      {user?.plan !== 'premium' && (
                        <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-2.5 py-0.5 rounded-full">Plan actual</span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold">Plan Free</h3>
                    <p className="text-sm text-muted-foreground mt-1">Para empezar sin compromisos</p>
                    <div className="flex items-end gap-1 mt-4">
                      <span className="text-5xl font-extrabold tracking-tight">$0</span>
                      <span className="text-muted-foreground text-sm mb-2">/mes</span>
                    </div>
                  </div>
                  <div className="px-6 pb-6 flex-1 flex flex-col">
                    <div className="w-full h-px bg-border mb-5" />
                    <div className="space-y-3.5 flex-1">
                      {[
                        { icon: <Zap className="h-4 w-4 text-blue-400" />,       text: '5 cirugías activas' },
                        { icon: <Heart className="h-4 w-4 text-rose-400" />,     text: '5 procedimientos en favoritos' },
                        { icon: <Building2 className="h-4 w-4 text-slate-400" />,text: '2 hospitales favoritos' },
                        { icon: <Users className="h-4 w-4 text-violet-400" />,   text: 'Hasta 3 colegas + sistema completo' },
                        { icon: <Calendar className="h-4 w-4 text-emerald-400" />,text: 'Google Calendar integrado' },
                        { icon: <Zap className="h-4 w-4 text-slate-400" />,       text: 'Incluye anuncios' },
                        { icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />, text: 'Seguros médicos de Guatemala' },
                        { icon: <Calculator className="h-4 w-4 text-cyan-400" />,    text: 'Calculadora de honorarios' },
                        { icon: <XCircle className="h-4 w-4 text-slate-600" />,  text: 'Sin estadísticas personales', muted: true },
                        { icon: <XCircle className="h-4 w-4 text-slate-600" />,  text: 'Sin exportar PDF', muted: true },
                      ].map(({ icon, text, muted }) => (
                        <div key={text} className="flex items-center gap-3 text-sm">
                          <span className="flex-shrink-0">{icon}</span>
                          <span className={muted ? 'text-muted-foreground/50 line-through' : 'text-foreground/90'}>{text}</span>
                        </div>
                      ))}
                    </div>
                    {user?.plan !== 'premium' && (
                      <Button variant="outline" disabled className="w-full mt-6 cursor-default opacity-50 rounded-xl">
                        Plan actual
                      </Button>
                    )}
                  </div>
                </div>

                {/* ── Premium ──────────────────────────────────────── */}
                <div className={`premium-glow rounded-2xl flex flex-col overflow-hidden ring-1 ring-amber-400/50 bg-card`}>
                  {/* subtle top accent bar */}
                  <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
                  <div className="p-6 pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Star className="float-star h-5 w-5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Premium</span>
                      </div>
                      {user?.plan === 'premium'
                        ? <span className="text-xs font-semibold bg-amber-400/15 text-amber-400 border border-amber-400/30 px-2.5 py-0.5 rounded-full">✓ Activo</span>
                        : <span className="text-xs font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2.5 py-0.5 rounded-full">Recomendado</span>
                      }
                    </div>
                    <h3 className="text-2xl font-bold">MeDico App Premium</h3>
                    <p className="text-sm text-muted-foreground mt-1">Experiencia completa, sin límites</p>
                    <div className="flex items-end gap-1 mt-4">
                      <span className="text-5xl font-extrabold tracking-tight text-amber-400">$9</span>
                      <span className="text-muted-foreground text-sm mb-2">/mes</span>
                    </div>
                  </div>
                  <div className="px-6 pb-6 flex-1 flex flex-col">
                    <div className="w-full h-px bg-amber-400/20 mb-5" />
                    <div className="space-y-3.5 flex-1">
                      {[
                        { icon: <Infinity className="h-4 w-4 text-amber-400" />,   text: 'Cirugías activas ilimitadas' },
                        { icon: <Heart className="h-4 w-4 text-rose-400" />,       text: 'Procedimientos favoritos ilimitados' },
                        { icon: <Building2 className="h-4 w-4 text-amber-300" />,  text: 'Hospitales favoritos ilimitados' },
                        { icon: <Users className="h-4 w-4 text-violet-400" />,     text: 'Colegas ilimitados + colaboración' },
                        { icon: <Calendar className="h-4 w-4 text-emerald-400" />, text: 'Google Calendar integrado' },
                        { icon: <BarChart2 className="h-4 w-4 text-blue-400" />,   text: 'Estadísticas personales avanzadas' },
                        { icon: <Shield className="h-4 w-4 text-emerald-400" />,   text: 'Sin anuncios ni interrupciones' },
                        { icon: <FileText className="h-4 w-4 text-sky-400" />,     text: 'Exportar cirugías como PDF' },
                        { icon: <ImagePlus className="h-4 w-4 text-amber-300" />,  text: 'Subir imágenes a tus cirugías (hasta 5 por cirugía)' },
                        { icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />, text: 'Seguros médicos de Guatemala' },
                        { icon: <Calculator className="h-4 w-4 text-cyan-400" />,    text: 'Calculadora de honorarios' },
                        { icon: <Sparkles className="h-4 w-4 text-amber-400" />,   text: 'Acceso anticipado a nuevas funciones' },
                      ].map(({ icon, text }) => (
                        <div key={text} className="flex items-center gap-3 text-sm">
                          <span className="flex-shrink-0">{icon}</span>
                          <span className="font-medium text-foreground/90">{text}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6">
                      {user?.plan === 'premium' ? (
                        <Button disabled className="w-full rounded-xl bg-amber-400/10 text-amber-400 font-bold border border-amber-400/30 cursor-not-allowed">
                          <Star className="h-4 w-4 mr-2 fill-amber-400" /> Plan Activo
                        </Button>
                      ) : (
                        <Button
                          onClick={handleUpgrade}
                          disabled={checkoutLoading}
                          className="shimmer-btn w-full rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold shadow-lg shadow-amber-400/25 border-0 transition-all duration-200 hover:shadow-amber-400/40 hover:scale-[1.02]"
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
                        El token de acceso se guarda de forma cifrada en nuestros servidores para
                        mantener la conexión activa sin interrupciones.
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
                {!user?.has_usable_password && (
                  <Alert>
                    <AlertDescription>
                      Tu cuenta fue creada con Google. Para agregar una contraseña usá la opción <strong>¿Olvidaste tu contraseña?</strong> en el login.
                    </AlertDescription>
                  </Alert>
                )}
                {user?.has_usable_password && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="old_password">Contraseña Actual</Label>
                      <Input
                        id="old_password"
                        name="old_password"
                        type="password"
                        placeholder="Ingresá tu contraseña actual"
                        value={passwords.old_password}
                        onChange={handlePasswordChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new_password">Nueva Contraseña</Label>
                      <Input
                        id="new_password"
                        name="new_password"
                        type="password"
                        placeholder="Ingresá la nueva contraseña"
                        value={passwords.new_password}
                        onChange={handlePasswordChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new_password2">Confirmar Nueva Contraseña</Label>
                      <Input
                        id="new_password2"
                        name="new_password2"
                        type="password"
                        placeholder="Confirmá la nueva contraseña"
                        value={passwords.new_password2}
                        onChange={handlePasswordChange}
                      />
                    </div>
                  </>
                )}
              </CardContent>
              {user?.has_usable_password && (
                <CardFooter>
                  <Button onClick={handleSavePassword} disabled={saving}>
                    {saving ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Actualizando...</>
                    ) : (
                      "Actualizar Contraseña"
                    )}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </TabsContent>
          {/* Tutorial Tab */}
          <TabsContent value="tutorial">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Tutorial de MeDico App</CardTitle>
                    <CardDescription>
                      {tutorialState.completed
                        ? 'Ya completaste el tutorial. Podés volver a verlo cuando quieras.'
                        : tutorialState.active
                        ? 'El tutorial está activo — seguilo desde la tarjeta flotante en pantalla.'
                        : 'Recorrido guiado por todas las funciones de la app.'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  El tutorial te lleva paso a paso por la Tabla de California, hospitales, seguros, colegas, Google Calendar, registro de cirugías, estadísticas, calculadora y configuración.
                </p>
                <Button onClick={restartTutorial} className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  {tutorialState.completed || tutorialState.active ? 'Reiniciar tutorial' : 'Empezar tutorial'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Legal Tab */}
          <TabsContent value="legal">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Documentos Legales</CardTitle>
                  <CardDescription>
                    Términos de uso y política de privacidad de MeDico App
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
                        <p className="text-xs text-muted-foreground">Condiciones de uso del servicio · Última actualización: Junio 2026</p>
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
                        <p className="text-xs text-muted-foreground">Cómo protegemos y usamos tus datos · Última actualización: Junio 2026</p>
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

              {/* Zona de Peligro */}
              <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-red-600 dark:text-red-400">Zona de Peligro</CardTitle>
                  </div>
                  <CardDescription>
                    Acciones irreversibles sobre tu cuenta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!showDeleteConfirm ? (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Eliminar cuenta</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Elimina permanentemente tu cuenta y todos tus datos: cirugías, hospitales, favoritos e imágenes. Esta acción no se puede deshacer.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="shrink-0"
                        onClick={() => { setShowDeleteConfirm(true); setDeleteInput(''); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar cuenta
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                          ¿Estás seguro? Esta acción es permanente e irreversible.
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-500">
                          Se eliminarán todos tus casos quirúrgicos, imágenes, hospitales, seguros y datos de cuenta. No se puede recuperar nada.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="deleteInput" className="text-sm">
                          Escribí ELIMINAR para confirmar
                        </Label>
                        <Input
                          id="deleteInput"
                          type="text"
                          placeholder="ELIMINAR"
                          value={deleteInput}
                          onChange={e => setDeleteInput(e.target.value)}
                          className="border-red-300 dark:border-red-800 focus-visible:ring-red-500"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="destructive"
                          disabled={deleteLoading || !deleteInput}
                          onClick={handleDeleteAccount}
                          className="flex-1"
                        >
                          {deleteLoading
                            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Eliminando...</>
                            : <><Trash2 className="h-4 w-4 mr-2" /> Confirmar eliminación</>}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                          disabled={deleteLoading}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
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