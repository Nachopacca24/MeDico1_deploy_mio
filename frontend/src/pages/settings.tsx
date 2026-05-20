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
import { Calendar, CheckCircle2, XCircle, Loader2, Star, Zap, Eye, MessageSquare } from "lucide-react";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
        title: "Profile updated",
        description: "Your profile information has been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
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
        title: "Preferences saved",
        description: "Your application preferences have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save preferences.",
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
          <h1 className="text-3xl font-semibold mb-1 tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="inline-flex gap-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="plan">Mi Plan</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={settings.name}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={settings.email}
                    onChange={handleChange}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Email address cannot be changed
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
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Application Preferences</CardTitle>
                <CardDescription>
                  Customize your application experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="darkMode">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable dark theme for the application
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
                    <Label htmlFor="notifications">Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about updates
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={settings.notifications}
                    onCheckedChange={(checked) => handleSwitchChange("notifications", checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <Input
                    id="defaultCurrency"
                    name="defaultCurrency"
                    value={settings.defaultCurrency}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Currency code (e.g., GTQ for Guatemalan Quetzal)
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
                      Saving...
                    </>
                  ) : (
                    "Save Preferences"
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
                        {user?.plan === 'premium'
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
              <div className="grid md:grid-cols-2 gap-4">
                {/* Free */}
                <Card className={user?.plan !== 'premium' ? 'border-primary ring-1 ring-primary' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Plan Free</CardTitle>
                    <CardDescription>Para comenzar</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { icon: CheckCircle2, text: 'Gestión de casos quirúrgicos', ok: true },
                      { icon: CheckCircle2, text: 'Colegas y ayudantes', ok: true },
                      { icon: CheckCircle2, text: 'Hospitales y procedimientos', ok: true },
                      { icon: CheckCircle2, text: 'Calculadora médica', ok: true },
                      { icon: Eye, text: 'Anuncios en la app', ok: false },
                      { icon: MessageSquare, text: 'Popups publicitarios', ok: false },
                    ].map(({ icon: Icon, text, ok }) => (
                      <div key={text} className="flex items-center gap-2 text-sm">
                        <Icon className={`h-4 w-4 flex-shrink-0 ${ok ? 'text-green-600' : 'text-orange-400'}`} />
                        <span className={ok ? '' : 'text-muted-foreground'}>{text}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Premium */}
                <Card className={`relative overflow-hidden ${user?.plan === 'premium' ? 'border-yellow-400 ring-1 ring-yellow-400' : ''}`}>
                  {user?.plan === 'premium' && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Activo</span>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                      Premium
                    </CardTitle>
                    <CardDescription>Experiencia sin interrupciones</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      'Gestión de casos quirúrgicos',
                      'Colegas y ayudantes',
                      'Hospitales y procedimientos',
                      'Calculadora médica',
                      'Sin anuncios en la app',
                      'Sin popups publicitarios',
                      'Solo contenido especializado "Para ti"',
                    ].map((text) => (
                      <div key={text} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span>{text}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {user?.plan !== 'premium' && (
                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                          ¿Quieres Premium?
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Contacta a un administrador de MeDico para actualizar tu plan.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
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
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your security preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    placeholder="Enter current password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="Enter new password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                  />
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Session Management</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    You are currently logged in on this device
                  </p>
                  <Button variant="outline" size="sm">
                    Sign out from all devices
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;