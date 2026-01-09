import type React from "react";

import { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import { AuthError } from '@/shared/services/authErrors';
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Lista de especialidades médicas basadas en tu sistema
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

export default function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    first_name: "",
    last_name: "",
    specialty: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, isAuthenticated } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSpecialtyChange = (value: string) => {
    setFormData((prev) => ({ ...prev, specialty: value }));
    
    // Clear error when user selects
    if (errors.specialty) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.specialty;
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username) {
      newErrors.username = "Nombre de usuario es requerido";
    }

    if (!formData.email) {
      newErrors.email = "Email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Ingresa un email válido";
    }

    if (!formData.first_name) {
      newErrors.first_name = "Nombre es requerido";
    }

    if (!formData.last_name) {
      newErrors.last_name = "Apellido es requerido";
    }

    if (!formData.specialty) {
      newErrors.specialty = "Especialidad es requerida";
    }

    if (!formData.password) {
      newErrors.password = "Contraseña es requerida";
    } else if (formData.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }

    if (!formData.password2) {
      newErrors.password2 = "Confirma tu contraseña";
    } else if (formData.password !== formData.password2) {
      newErrors.password2 = "Las contraseñas no coinciden";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password2: formData.password2,
        first_name: formData.first_name,
        last_name: formData.last_name,
        specialty: formData.specialty,
      });

      toast({
        title: "¡Cuenta creada!",
        description: "Tu cuenta ha sido creada exitosamente.",
      });
      
      // El navigate lo hace el AuthContext automáticamente
    } catch (error: any) {
      console.error('Error en registro:', error);
      
      let errorMessage = "Ocurrió un error. Por favor intenta de nuevo.";
      
      // Manejar errores estructurados de AuthError
      if (error instanceof AuthError) {
        errorMessage = error.getUserMessage();
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error al crear cuenta",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Si ya está autenticado, redirigir al dashboard
  if (isAuthenticated) {
    return <Navigate to='/' replace />;
  }

  return (
    <div className='container mx-auto flex h-screen items-center justify-center py-10'>
      <Card className='mx-auto w-full max-w-md'>
        <CardHeader>
          <CardTitle className='text-2xl'>Crear cuenta</CardTitle>
          <CardDescription>Ingresa tus datos para crear tu cuenta profesional</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='first_name'>Nombre</Label>
                <Input
                  id='first_name'
                  name='first_name'
                  placeholder='Juan'
                  value={formData.first_name}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!errors.first_name}
                />
                {errors.first_name && <p className='text-sm text-destructive'>{errors.first_name}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='last_name'>Apellido</Label>
                <Input
                  id='last_name'
                  name='last_name'
                  placeholder='Pérez'
                  value={formData.last_name}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!errors.last_name}
                />
                {errors.last_name && <p className='text-sm text-destructive'>{errors.last_name}</p>}
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='username'>Usuario</Label>
              <Input
                id='username'
                name='username'
                placeholder='doctor123'
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
                aria-invalid={!!errors.username}
              />
              {errors.username && <p className='text-sm text-destructive'>{errors.username}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                name='email'
                type='email'
                placeholder='doctor@example.com'
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className='text-sm text-destructive'>{errors.email}</p>}
            </div>

            {/* Campo de Especialidad */}
            <div className='space-y-2'>
              <Label htmlFor='specialty'>Especialidad Médica</Label>
              <Select 
                value={formData.specialty} 
                onValueChange={handleSpecialtyChange}
                disabled={isLoading}
              >
                <SelectTrigger 
                  id='specialty'
                  aria-invalid={!!errors.specialty}
                  className={errors.specialty ? 'border-destructive' : ''}
                >
                  <SelectValue placeholder='Selecciona tu especialidad' />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.specialty && <p className='text-sm text-destructive'>{errors.specialty}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>Contraseña</Label>
              <Input
                id='password'
                name='password'
                type='password'
                placeholder='••••••••'
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className='text-sm text-destructive'>{errors.password}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password2'>Confirmar Contraseña</Label>
              <Input
                id='password2'
                name='password2'
                type='password'
                placeholder='••••••••'
                value={formData.password2}
                onChange={handleChange}
                disabled={isLoading}
                aria-invalid={!!errors.password2}
              />
              {errors.password2 && <p className='text-sm text-destructive'>{errors.password2}</p>}
            </div>
          </CardContent>

          <CardFooter className='flex flex-col space-y-4'>
            <Button type='submit' className='w-full' disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Creando cuenta...
                </>
              ) : (
                "Crear cuenta"
              )}
            </Button>

            <p className='text-center text-sm text-muted-foreground'>
              ¿Ya tienes cuenta?{" "}
              <Link to='/login' className='text-primary underline underline-offset-4 hover:text-primary/90'>
                Inicia sesión
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}