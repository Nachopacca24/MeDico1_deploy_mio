import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2, Activity, UserCheck } from "lucide-react";

const SPECIALTIES = [
  "Cardiovascular",
  "Dermatología",
  "Digestivo",
  "Endocrino",
  "Ginecología",
  "Mama",
  "Maxilofacial",
  "Neurocirugía",
  "Obstetricia",
  "Oftalmología",
  "Ortopedia",
  "Otorrinolaringología",
  "Plástica",
  "Procesos variados",
  "Urología",
];

export default function CompleteProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    username: user?.username || "",
    specialty: user?.specialty || "",
    license_number: user?.license_number || "",
    phone: user?.phone || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.first_name) newErrors.first_name = "Nombre es requerido";
    if (!formData.last_name) newErrors.last_name = "Apellido es requerido";
    if (!formData.username) newErrors.username = "Nombre de usuario es requerido";
    if (!formData.specialty) newErrors.specialty = "Especialidad es requerida";
    if (!formData.license_number) newErrors.license_number = "Número de colegiado es requerido";
    if (!formData.phone) newErrors.phone = "Teléfono es requerido";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await updateUser(formData);
      toast({ title: "¡Perfil completado!", description: "Tu información fue guardada exitosamente." });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo guardar el perfil.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <Card className="w-full max-w-lg border-0 shadow-lg sm:border sm:shadow-sm my-10">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center space-x-2 text-primary mb-2">
            <Activity className="h-6 w-6" />
            <span className="text-2xl font-bold">MeDico App</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-center">
            Completa tu perfil
          </CardTitle>
          <CardDescription className="text-center">
            Necesitamos algunos datos profesionales para activar tu cuenta
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  disabled={saving}
                  aria-invalid={!!errors.first_name}
                />
                {errors.first_name && <p className="text-sm text-destructive">{errors.first_name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  disabled={saving}
                  aria-invalid={!!errors.last_name}
                />
                {errors.last_name && <p className="text-sm text-destructive">{errors.last_name}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Nombre de usuario</Label>
              <Input
                id="username"
                name="username"
                placeholder="doctor123"
                value={formData.username}
                onChange={handleChange}
                disabled={saving}
                aria-invalid={!!errors.username}
              />
              {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidad Médica</Label>
              <Select
                value={formData.specialty}
                onValueChange={(val) => {
                  setFormData(prev => ({ ...prev, specialty: val }));
                  if (errors.specialty) setErrors(prev => { const n = { ...prev }; delete n.specialty; return n; });
                }}
                disabled={saving}
              >
                <SelectTrigger
                  id="specialty"
                  aria-invalid={!!errors.specialty}
                  className={errors.specialty ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Selecciona tu especialidad" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.specialty && <p className="text-sm text-destructive">{errors.specialty}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="license_number">Número de colegiado</Label>
              <Input
                id="license_number"
                name="license_number"
                placeholder="COL-12345"
                value={formData.license_number}
                onChange={handleChange}
                disabled={saving}
                aria-invalid={!!errors.license_number}
              />
              {errors.license_number && <p className="text-sm text-destructive">{errors.license_number}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+502 1234 5678"
                value={formData.phone}
                onChange={handleChange}
                disabled={saving}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Completar perfil
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
