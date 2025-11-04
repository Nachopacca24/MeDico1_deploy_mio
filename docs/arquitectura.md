# Arquitectura del Proyecto MeDico1

## 📋 Descripción General

MeDico1 es una aplicación web moderna para la gestión y valoración de operaciones médicas. Permite a los profesionales de la salud calcular valores de procedimientos médicos basados en tarifas hospitalarias, mantener registros históricos y gestionar favoritos.

## 🏗️ Arquitectura General

```
MeDico1/
├── src/                    # Código fuente del frontend
│   ├── features/          # Módulos de funcionalidades
│   ├── shared/            # Recursos compartidos
│   ├── core/              # Núcleo de la aplicación
│   └── index.css          # Estilos globales
│
├── backend/               # Datos y scripts del backend
│   ├── data/             # Datos estructurados (CSV, JSON)
│   ├── migrations/       # Migraciones de base de datos
│   └── scripts/          # Scripts auxiliares
│
├── docs/                  # Documentación del proyecto
├── scripts/               # Scripts de despliegue y setup
└── public/                # Recursos estáticos públicos
```

## 🎯 Arquitectura del Frontend

### **1. Features (Módulos de Funcionalidad)**

Cada feature es un módulo autocontenido con su propia lógica, componentes y páginas:

```
src/features/
├── auth/                  # Autenticación y autorización
│   ├── components/       # Componentes de auth (ProtectedRoute)
│   ├── pages/           # Login, Signup, Logout
│   └── index.ts         # Exportaciones públicas
│
├── dashboard/            # Página principal
│   ├── components/      # DashboardStats
│   ├── pages/          # DashboardPage
│   └── index.ts
│
├── calculator/           # Calculadora de operaciones
│   ├── components/      # CalculatorForm
│   ├── pages/          # CalculatorPage
│   └── index.ts
│
├── operations/           # Catálogo de operaciones
│   ├── pages/          # OperationsPage
│   └── index.ts
│
├── favorites/            # Operaciones favoritas
│   ├── pages/          # FavoritesPage
│   └── index.ts
│
├── history/              # Historial de cálculos
│   ├── pages/          # HistoryPage
│   └── index.ts
│
└── settings/             # Configuración del usuario
    ├── pages/          # SettingsPage
    └── index.ts
```

### **2. Shared (Recursos Compartidos)**

Componentes, utilidades y tipos que se usan en múltiples features:

```
src/shared/
├── components/
│   ├── ui/              # Componentes de UI (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   │
│   └── layout/          # Componentes de layout
│       ├── AppLayout.tsx
│       ├── Sidebar.tsx
│       └── theme-provider.tsx
│
├── hooks/               # Custom hooks
│   ├── use-toast.ts
│   └── use-mobile.tsx
│
├── lib/                 # Librerías y configuraciones
│   ├── fine.ts         # Cliente de autenticación
│   ├── db-types.ts     # Tipos de base de datos
│   └── utils.ts        # Utilidades generales
│
├── utils/              # Funciones utilitarias
│   └── csvLoader.ts    # Cargador de archivos CSV
│
├── types/              # Definiciones de tipos TypeScript
│
└── constants/          # Constantes globales
```

### **3. Core (Núcleo de la Aplicación)**

Configuración central, routing y providers:

```
src/core/
├── config/             # Configuraciones globales
│
├── router/             # Configuración de rutas
│   ├── AppRouter.tsx   # Definición de rutas
│   └── index.ts
│
└── providers/          # Providers de contexto
    ├── QueryProvider.tsx
    ├── TooltipProviderWrapper.tsx
    └── index.ts
```

## 🗄️ Backend (Datos y Scripts)

```
backend/
├── data/
│   └── surgeries/          # Datos de cirugías organizados
│       ├── Cardiovascular/
│       │   ├── Corazón.csv
│       │   └── Vasos_periféricos.csv
│       ├── Digestivo/
│       ├── Ortopedia/
│       └── ...
│
├── migrations/             # Migraciones SQL
│   ├── 20250615023009_initial_schema.sql
│   └── 20250615023010_seed_data.sql
│
└── scripts/               # Scripts de procesamiento
    └── organizar.py       # Script para organizar datos
```

## 🔄 Flujo de Datos

### **Autenticación**
```
Usuario → LoginPage → fine.auth.signIn() → Session Storage → ProtectedRoute
```

### **Cálculo de Operaciones**
```
Usuario → CalculatorPage → CalculatorForm → 
API (fine.table) → Database → Resultado
```

### **Carga de Datos CSV**
```
App Start → csvLoader.ts → Parse CSV → 
Store in Memory → Display in OperationsPage
```

## 🛠️ Stack Tecnológico

### **Frontend**
- **Framework**: React 18.3 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM v6
- **UI Components**: Radix UI + Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Data Fetching**: TanStack Query (React Query)
- **Styling**: Tailwind CSS + CSS Variables

### **Backend/Database**
- **BaaS**: Fine (Backend as a Service)
- **Database**: PostgreSQL (via Fine)
- **Data Format**: CSV files (procedimientos médicos)

### **Autenticación**
- **Provider**: Fine Auth
- **Métodos**: Email/Password
- **Protección**: ProtectedRoute HOC

## 📦 Módulos Principales

### **1. Authentication (`features/auth`)**
- Login con email/password
- Registro de usuarios
- Protección de rutas
- Manejo de sesiones

### **2. Dashboard (`features/dashboard`)**
- Vista principal del usuario
- Estadísticas de uso
- Accesos rápidos a funciones

### **3. Calculator (`features/calculator`)**
- Selección de hospital
- Selección de operación
- Cálculo automático de valores
- Guardado de resultados

### **4. Operations (`features/operations`)**
- Catálogo completo de cirugías
- Organización por especialidades
- Búsqueda y filtrado
- Vista detallada de procedimientos

### **5. Favorites (`features/favorites`)**
- Guardado de operaciones favoritas
- Acceso rápido
- Gestión de favoritos

### **6. History (`features/history`)**
- Registro de cálculos realizados
- Búsqueda en historial
- Recalcular operaciones
- Eliminar registros

### **7. Settings (`features/settings`)**
- Configuración de perfil
- Preferencias de usuario
- Modo oscuro/claro
- Configuración de moneda

## 🔐 Seguridad

- Todas las rutas protegidas requieren autenticación
- Tokens de sesión gestionados por Fine Auth
- Validación de formularios con Zod
- Sanitización de inputs
- HTTPS en producción

## 🚀 Despliegue

El proyecto está preparado para despliegue en:
- **Vercel** (recomendado para frontend)
- **Netlify**
- **AWS Amplify**

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints de Tailwind CSS
- Componentes adaptables
- Touch-friendly interfaces

## 🎨 Sistema de Diseño

- **Colores**: Sistema de tokens CSS
- **Tipografía**: Inter font (system font stack)
- **Espaciado**: Escala de 8px
- **Iconos**: Lucide React

## 🔄 Convenciones de Código

- **Componentes**: PascalCase (`DashboardPage.tsx`)
- **Funciones**: camelCase (`loadCSV()`)
- **Constantes**: UPPER_SNAKE_CASE (`API_URL`)
- **Archivos**: kebab-case para utils (`csv-loader.ts`)
- **Imports**: Absolutos con alias `@/`

## 📊 Performance

- Code splitting por rutas
- Lazy loading de componentes
- Optimización de imágenes
- Memoización de cálculos complejos
- React Query para caching

## 🧪 Testing (Futuro)

```
src/
├── features/
│   └── auth/
│       ├── __tests__/
│       │   └── LoginPage.test.tsx
│       └── ...
```

## 🌐 Internacionalización (i18n)

Preparado para soporte multiidioma:
- Español (principal)
- Inglés (futuro)
