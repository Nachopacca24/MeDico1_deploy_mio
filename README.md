# MéDico1 - Sistema de Gestión Médica# MéDico1 🏥# React + TypeScript + Vite



Sistema web completo para gestión médica con calculadoras de procedimientos quirúrgicos, historial de operaciones y administración de datos médicos.



## 🚀 Stack Tecnológico> Sistema de gestión y valoración de operaciones médicasThis template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.



### Backend

- **Django 5.0.14** - Framework web

- **Django REST Framework 3.16.1** - API REST[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)Currently, two official plugins are available:

- **PostgreSQL** - Base de datos

- **Python 3.12+** - Lenguaje[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://react.dev/)



### Frontend[![Vite](https://img.shields.io/badge/Vite-6.3-646cff)](https://vitejs.dev/)- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh

- **React 18.3.1** - Biblioteca UI

- **TypeScript 5.6.2** - Tipado estático- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

- **Vite 6.3.21** - Build tool

- **Tailwind CSS 3.4.17** - Estilos## 📋 Descripción

- **Radix UI** - Componentes accesibles

- **React Router v6** - Enrutamiento## Expanding the ESLint configuration

- **TanStack Query** - Gestión de estado servidor

- **Zustand** - Gestión de estado clienteMéDico1 es una aplicación web moderna diseñada para profesionales de la salud que permite:



## 📁 Estructura del ProyectoIf you are developing a production application, we recommend updating the configuration to enable type aware lint rules:



```- 🧮 **Calcular valores** de procedimientos médicos basados en tarifas hospitalarias

MeDico1/
├── apps/                       # Aplicaciones Django- 📊 **Explorar catálogo** completo de cirugías organizadas por especialidades-
│   ├── medico/                # App principal
│   ├── medio_auth/            # Autenticación- ⭐ **Guardar favoritos** para acceso rápido a procedimientos frecuentes
│   ├── communication/         # Mensajería
│   ├── invoice/               # Facturación- 📝 **Mantener historial** de cálculos realizados```js
│   └── payment/               # Pagos
├── core/                      # Configuración Django- 🔐 **Gestión segura** de usuarios con autenticación robustaexport default tseslint.config({
│   ├── settings/              # Settings por ambiente
│   │   ├── base.py           # Configuración base- 🎨 **Interfaz moderna** con modo claro/oscuro  languageOptions: {
│   │   ├── dev.py            # Desarrollo
│   │   └── prod.py           # Producción    // other options...
│   ├── urls.py               # Rutas principales
│   ├── views.py              # Vistas core## 🚀 Quick Start    parserOptions: {
│   └── middleware.py         # Middleware (auto-inicia Vite)
├── src/                       # Aplicación React      project: ['./tsconfig.node.json', './tsconfig.app.json'],
│   ├── features/             # Funcionalidades por módulo
│   │   ├── auth/             # Autenticación```bash      tsconfigRootDir: import.meta.dirname,
│   │   ├── dashboard/        # Dashboard
│   │   ├── calculator/       # Calculadora médica# Clonar repositorio    },
│   │   ├── operations/       # Operaciones
│   │   ├── favorites/        # Favoritosgit clone https://github.com/jricica/MeDico1.git  },
│   │   ├── history/          # Historial
│   │   └── settings/         # Configuracióncd MeDico1})
│   ├── shared/               # Código compartido
│   │   ├── components/       # Componentes reutilizables```
│   │   ├── hooks/            # React hooks
│   │   ├── lib/              # Utilidades# Instalar dependencias
│   │   ├── types/            # Tipos TypeScript
│   │   └── constants/        # Constantesnpm install- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
│   ├── core/                 # Core del frontend
│   │   └── router/           # Configuración de rutas- Optionally add `...tseslint.configs.stylisticTypeChecked`
│   └── pages/                # Páginas principales
├── public/                    # Archivos estáticos# Configurar variables de entorno- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:
│   └── App_cirugias_excel/   # CSVs de cirugías
├── venv/                      # Entorno virtual Pythoncp .env.example .env
├── manage.py                  # CLI de Django
├── requirements.txt           # Dependencias Python# Editar .env con tus credenciales```js
└── package.json              # Dependencias Node.js

```// eslint.config.js
```


## 🔧 Instalación# Iniciar servidor de desarrolloimport react from 'eslint-plugin-react'



### Prerrequisitosnpm run dev



- Python 3.12+ export default tseslint.config({

- Node.js 18+

- PostgreSQL 14+  // Set the react version

- Git

La aplicación estará disponible en `http://localhost:5173`  settings: { react: { version: '18.3' } },

### 1. Clonar el repositorio

  plugins: {

```bash

git clone <repository-url>## 📦 Stack Tecnológico    // Add the react plugin

cd MeDico1

```    react,



### 2. Configurar Backend (Django)- **React 18.3** + **TypeScript** - Frontend framework  },



#### Crear y activar entorno virtual- **Vite** - Build tool ultrarrápido  rules: {



```bash- **React Router v6** - Routing    // other rules...

# Windows

python -m venv venv- **Tailwind CSS** - Styling    // Enable its recommended rules

.\venv\Scripts\activate

- **Radix UI** - Componentes accesibles    ...react.configs.recommended.rules,

# Linux/Mac

python3 -m venv venv- **TanStack Query** - Data fetching    ...react.configs['jsx-runtime'].rules,

source venv/bin/activate

```- **Zustand** - State management  },



#### Instalar dependencias- **Fine** - Backend as a Service})



```bash```

pip install -r requirements.txt

```## 📁 Estructura del Proyecto



#### Configurar base de datos```

MeDico1/

1. Crear base de datos PostgreSQL:├── src/

│   ├── features/          # Módulos de funcionalidades

```sql│   ├── shared/            # Recursos compartidos

CREATE DATABASE MeDico;│   ├── core/              # Núcleo de la aplicación

```│   └── main.tsx           # Entry point
├── backend/               # Datos y migraciones

2. Configurar variables de entorno (crear archivo `.env`):├── docs/                  # Documentación

└── scripts/               # Scripts de despliegue

```env```

# Base de datos

DB_NAME=MeDico## 🛠️ Scripts Disponibles

DB_USER=postgres

DB_PASSWORD=tu_password```bash

DB_HOST=localhostnpm run dev        # Servidor de desarrollo

DB_PORT=5432npm run build      # Build de producción

npm run preview    # Preview del build

# Djangonpm run lint       # Ejecutar ESLint

DJANGO_SECRET_KEY=tu-secret-key-aqui```

DJANGO_SETTINGS_MODULE=core.settings.dev

DEBUG=True## 📖 Documentación

```

- **[Arquitectura](./docs/arquitectura.md)** - Estructura del sistema

#### Aplicar migraciones- **[Guía de Instalación](./docs/guia-instalacion.md)** - Setup completo

- **[Guía de Desarrollo](./docs/guia-desarrollo.md)** - Convenciones y mejores prácticas

```bash

python manage.py migrate## 🤝 Contribuir

```

Las contribuciones son bienvenidas! Usa [Conventional Commits](https://www.conventionalcommits.org/):

#### Crear superusuario

- `feat:` Nueva funcionalidad

```bash- `fix:` Corrección de bugs

python manage.py createsuperuser- `docs:` Cambios en documentación

```- `refactor:` Refactorización

- `chore:` Tareas de mantenimiento

### 3. Configurar Frontend (React)

## 👥 Equipo

#### Instalar dependencias

- **Desarrollador Principal**: [@jricica](https://github.com/jricica)
- **Desarrollador Principal**: [@Nachopacca24](https://github.com/Nachopacca24)

```bash

npm install## 📞 Contacto

```

- **GitHub**: [MeDico1](https://github.com/jricica/MeDico1)

## 🚀 Uso- **Issues**: [Reportar un problema](https://github.com/jricica/MeDico1/issues)



### Modo Desarrollo---



**Un solo comando inicia todo:**<div align="center">

```bash</div>

python manage.py runserver
```

Esto automáticamente:
- ✅ Inicia Django en `http://127.0.0.1:8000`
- ✅ Inicia Vite en segundo plano (sin ventanas)
- ✅ Configura hot reload para ambos
- ✅ Hace proxy de las peticiones del frontend

**Acceder a:**
- 🌐 Aplicación: http://127.0.0.1:8000
- 🔧 Admin Django: http://127.0.0.1:8000/admin
- 📡 API: http://127.0.0.1:8000/api/v1/

**Detener servidores:**
- Presiona `CTRL+C` (detiene Django y Vite automáticamente)

### Comandos Adicionales

#### Ver logs de Vite

```bash
# En tiempo real (Windows PowerShell)
Get-Content vite.log -Wait

# Ver archivo
type vite.log
```

#### Ejecutar tests

```bash
# Backend
python manage.py test

# Frontend
npm run test
```

#### Limpiar base de datos

```bash
python manage.py flush
```

## 🔌 API Endpoints

### Autenticación
- `POST /api/v1/auth/login/` - Iniciar sesión
- `POST /api/v1/auth/logout/` - Cerrar sesión
- `POST /api/v1/auth/register/` - Registro

### Médico
- `GET /api/v1/medico/` - Listar recursos médicos
- `POST /api/v1/medico/` - Crear recurso

### Comunicación
- `GET /api/v1/communication/` - Mensajes
- `POST /api/v1/communication/` - Enviar mensaje

### Facturación
- `GET /api/v1/invoice/` - Listar facturas
- `POST /api/v1/invoice/` - Crear factura

### Pagos
- `GET /api/v1/payment/` - Listar pagos
- `POST /api/v1/payment/` - Procesar pago

## 🎨 Características

### Frontend
- ✅ Autenticación de usuarios
- ✅ Dashboard con estadísticas
- ✅ Calculadora de procedimientos médicos
- ✅ Catálogo de operaciones por especialidad
- ✅ Sistema de favoritos
- ✅ Historial de cálculos
- ✅ Configuración de usuario
- ✅ Diseño responsive
- ✅ Modo oscuro/claro
- ✅ Componentes accesibles (ARIA)

### Backend
- ✅ API REST completa
- ✅ Autenticación JWT/Session
- ✅ Panel de administración Django
- ✅ Modelos de datos estructurados
- ✅ Migraciones de base de datos
- ✅ CORS configurado
- ✅ Middleware personalizado

## 📊 Base de Datos

### Modelos Principales

- **User** - Usuarios del sistema
- **Operation** - Catálogo de operaciones
- **Calculation** - Cálculos realizados
- **Favorite** - Operaciones favoritas
- **Invoice** - Facturas
- **Payment** - Pagos

## 🛠️ Desarrollo

### Agregar nueva app Django

```bash
python manage.py startapp nueva_app apps/nueva_app
```

Luego agregar a `INSTALLED_APPS` en `core/settings/base.py`

### Crear migración

```bash
python manage.py makemigrations
python manage.py migrate
```

### Agregar nueva ruta frontend

Editar `src/core/router/AppRouter.tsx`:

```tsx
<Route path="/nueva-ruta" element={<NuevoComponente />} />
```

### Construir para producción

```bash
# Frontend
npm run build

# Backend
python manage.py collectstatic
```

## 🔐 Seguridad

- ✅ Variables de entorno para secretos
- ✅ CSRF protection
- ✅ CORS configurado
- ✅ SQL injection protection (Django ORM)
- ✅ XSS protection
- ✅ Passwords hasheados (bcrypt)

## 📝 Notas Importantes

### Datos CSV
Los archivos CSV con información de cirugías están en `public/App_cirugias_excel/` organizados por especialidad:
- Cardiovascular
- Dermatología
- Digestivo
- Endocrino
- Ginecología
- Mama
- Neurocirugía
- Obstetricia
- Oftalmología
- Ortopedia
- Otorrino
- Urología

### Middleware Personalizado
El proyecto incluye `ViteDevMiddleware` que:
- Inicia Vite automáticamente cuando Django arranca
- Hace proxy de las peticiones a módulos de Vite
- Sirve archivos estáticos durante desarrollo
- Se limpia automáticamente al detener Django

### Configuración por Ambiente
- `dev.py` - Desarrollo (DEBUG=True, CORS permisivo)
- `prod.py` - Producción (DEBUG=False, configuración segura)

## 🐛 Solución de Problemas

### Vite no inicia
```bash
# Verificar logs
cat vite.log

# Iniciar manualmente
npm run dev
```

### Error de conexión a base de datos
```bash
# Verificar PostgreSQL está corriendo
# Windows
Get-Service postgresql*

# Verificar credenciales en .env
```

### Errores de migración
```bash
# Resetear migraciones (cuidado en producción)
python manage.py migrate --fake
python manage.py migrate
```
