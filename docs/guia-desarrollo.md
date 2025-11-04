# Guía de Desarrollo - MeDico1

## 🎯 Convenciones de Código

### Nomenclatura

#### Archivos y Carpetas
```typescript
// ✅ Correcto
features/auth/pages/LoginPage.tsx
shared/components/ui/button.tsx
shared/utils/csv-loader.ts

// ❌ Incorrecto
features/auth/pages/login-page.tsx
shared/components/ui/Button.tsx
shared/utils/csvLoader.ts
```

#### Componentes React
```typescript
// ✅ Correcto - PascalCase
export const LoginPage = () => { ... }
export default DashboardPage;

// ❌ Incorrecto
export const loginPage = () => { ... }
export default dashboardpage;
```

#### Funciones y Variables
```typescript
// ✅ Correcto - camelCase
const calculateValue = (rvu: number) => { ... }
const userData = await fetchUser();

// ❌ Incorrecto
const CalculateValue = (rvu: number) => { ... }
const UserData = await fetchUser();
```

#### Constantes
```typescript
// ✅ Correcto - UPPER_SNAKE_CASE
const API_BASE_URL = "https://api.example.com";
const MAX_RETRY_ATTEMPTS = 3;

// ❌ Incorrecto
const apiBaseUrl = "https://api.example.com";
const maxRetryAttempts = 3;
```

### Estructura de Componentes

#### Orden de Imports
```typescript
// 1. Imports de React y librerías externas
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 2. Imports de shared
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/hooks/use-toast";

// 3. Imports de features
import { useAuth } from "@/features/auth";

// 4. Imports de tipos
import type { User } from "@/shared/types";

// 5. Imports de estilos (si aplica)
import "./styles.css";
```

#### Template de Componente
```typescript
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";

interface MyComponentProps {
  title: string;
  onSubmit: (data: string) => void;
}

export const MyComponent = ({ title, onSubmit }: MyComponentProps) => {
  // 1. Hooks de estado
  const [data, setData] = useState("");

  // 2. Hooks de efectos
  useEffect(() => {
    // ...
  }, []);

  // 3. Funciones de manejo
  const handleSubmit = () => {
    onSubmit(data);
  };

  // 4. Renderizado
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleSubmit}>Submit</Button>
    </div>
  );
};
```

### TypeScript

#### Tipos vs Interfaces
```typescript
// ✅ Usar 'type' para uniones y primitivos
type Status = "pending" | "success" | "error";
type ID = string | number;

// ✅ Usar 'interface' para objetos y componentes
interface User {
  id: string;
  name: string;
  email: string;
}

interface ButtonProps {
  label: string;
  onClick: () => void;
}
```

#### Evitar `any`
```typescript
// ❌ Evitar
const processData = (data: any) => { ... }

// ✅ Mejor
const processData = (data: unknown) => {
  if (typeof data === "string") {
    // ...
  }
}

// ✅ Mejor aún
interface DataType {
  id: string;
  value: number;
}

const processData = (data: DataType) => { ... }
```

## 🏗️ Estructura de Features

### Crear una Nueva Feature

1. **Crear carpeta**
```bash
mkdir -p src/features/nueva-feature/{components,pages,hooks,types,utils}
```

2. **Crear página principal**
```typescript
// src/features/nueva-feature/pages/NuevaFeaturePage.tsx
import { AppLayout } from "@/shared/components/layout/AppLayout";

const NuevaFeaturePage = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Nueva Feature</h1>
        {/* Contenido */}
      </div>
    </AppLayout>
  );
};

export default NuevaFeaturePage;
```

3. **Crear index.ts**
```typescript
// src/features/nueva-feature/index.ts
export { default as NuevaFeaturePage } from './pages/NuevaFeaturePage';
export * from './components';
export * from './hooks';
```

4. **Agregar ruta**
```typescript
// src/core/router/AppRouter.tsx
import { NuevaFeaturePage } from "@/features/nueva-feature";

// En el componente:
<Route 
  path='/nueva-feature' 
  element={<ProtectedRoute Component={NuevaFeaturePage} />} 
/>
```

## 🎨 Estilos y UI

### Tailwind CSS

```typescript
// ✅ Usar clases de Tailwind
<div className="flex items-center justify-between p-4 bg-blue-600 rounded-lg">
  <h2 className="text-2xl font-bold text-white">Título</h2>
</div>

// ✅ Usar className condicional
<div className={cn(
  "p-4 rounded-lg",
  isActive && "bg-blue-600",
  isDisabled && "opacity-50 cursor-not-allowed"
)}>
```

### Componentes UI

```typescript
// ✅ Importar desde shared/components/ui
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

// ✅ Usar variantes
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

## 📡 Manejo de Datos

### React Query

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ✅ Query
const { data, isLoading, error } = useQuery({
  queryKey: ["users"],
  queryFn: async () => {
    const response = await fetch("/api/users");
    return response.json();
  },
});

// ✅ Mutation
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: async (newUser: User) => {
    const response = await fetch("/api/users", {
      method: "POST",
      body: JSON.stringify(newUser),
    });
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  },
});
```

### Fine (BaaS)

```typescript
import { fine } from "@/shared/lib/fine";

// ✅ Consultas
const users = await fine.table("users")
  .select("*")
  .eq("active", true)
  .order("createdAt", { ascending: false });

// ✅ Inserciones
const newUser = await fine.table("users")
  .insert({
    name: "Juan Pérez",
    email: "juan@example.com",
  });

// ✅ Actualizaciones
await fine.table("users")
  .update({ name: "Juan Updated" })
  .eq("id", userId);

// ✅ Eliminaciones
await fine.table("users")
  .delete()
  .eq("id", userId);
```

## 🔐 Autenticación

### Proteger Rutas

```typescript
import { ProtectedRoute } from "@/features/auth";

<Route 
  path='/protected' 
  element={<ProtectedRoute Component={ProtectedPage} />} 
/>
```

### Usar Sesión

```typescript
import { fine } from "@/shared/lib/fine";

const MyComponent = () => {
  const { data: session, isPending } = fine.auth.useSession();

  if (isPending) return <LoadingSpinner />;
  
  if (!session) {
    return <Navigate to="/login" />;
  }

  return <div>Hola, {session.user.name}!</div>;
};
```

## 🧪 Testing (Futuro)

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("renders login form", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("submits form with credentials", async () => {
    render(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    
    // Assertions...
  });
});
```

## 📝 Commits y Branches

### Formato de Commits

Usar [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Features
feat: add user profile page
feat(auth): implement password reset

# Fixes
fix: resolve navigation bug
fix(calculator): correct RVU calculation

# Documentation
docs: update installation guide
docs(api): add endpoint documentation

# Refactoring
refactor: restructure auth module
refactor(ui): simplify button component

# Styling
style: format code with prettier
style(ui): adjust spacing in dashboard

# Testing
test: add unit tests for calculator
test(auth): add integration tests

# Chores
chore: update dependencies
chore(deps): bump react to 18.3.1
```

### Estrategia de Branches

```bash
main              # Producción estable
  ├─ dev          # Integración y desarrollo
      ├─ feature/user-profile
      ├─ feature/export-pdf
      ├─ fix/calculator-bug
      └─ refactor/auth-module
```

### Workflow

```bash
# 1. Crear branch desde dev
git checkout dev
git pull origin dev
git checkout -b feature/nueva-funcionalidad

# 2. Desarrollar y commitear
git add .
git commit -m "feat: add nueva funcionalidad"

# 3. Push y crear PR
git push origin feature/nueva-funcionalidad

# 4. Crear Pull Request en GitHub hacia dev
# 5. Después de review y merge, eliminar branch
git branch -d feature/nueva-funcionalidad
```

## 🚀 Performance

### Optimizaciones

```typescript
// ✅ Lazy loading de páginas
const DashboardPage = lazy(() => import("@/features/dashboard"));

// ✅ Memo para componentes costosos
const ExpensiveComponent = memo(({ data }: Props) => {
  // ...
});

// ✅ useCallback para funciones
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);

// ✅ useMemo para cálculos costosos
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);
```

## 🐛 Debugging

### Console Logs

```typescript
// ❌ Evitar en producción
console.log("User data:", user);

// ✅ Usar durante desarrollo
if (import.meta.env.DEV) {
  console.log("User data:", user);
}
```

### React DevTools

- Instalar [React DevTools](https://react.dev/learn/react-developer-tools)
- Usar para inspeccionar componentes
- Ver props, state y hooks

## 📚 Recursos

- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Vite Docs](https://vitejs.dev/)
