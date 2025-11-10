# 🏥 MéDico1 - Sistema de Gestión de Cirugías

> Plataforma web moderna para valoración y gestión de procedimientos quirúrgicos

[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Django](https://img.shields.io/badge/Django-5.0-092e20?logo=django)](https://www.djangoproject.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📋 Descripción

**MéDico1** es una aplicación web full-stack diseñada para profesionales de la salud que permite:



- 🧮 **Calcular valores** de procedimientos médicos basados en RVU y tarifas hospitalarias
- 📊 **Explorar catálogo** de **6,894 cirugías** organizadas por 28 especialidades médicas
- ⭐ **Guardar favoritos** para acceso rápido a procedimientos y hospitales frecuentes
- 🏥 **Gestionar hospitales** con 110 hospitales precargados de Guatemala (públicos, IGSS, privados)
- 📋 **Crear y gestionar casos quirúrgicos** completos con múltiples procedimientos
- 💰 **Calcular valores** automáticamente con RVU × factor hospitalario
- 📝 **Historial de casos** con búsqueda y filtros avanzados
- 🔐 **Gestión segura** de usuarios con autenticación robusta
- 🎨 **Interfaz moderna** y responsive con diseño minimalista
- 📱 **Diseño adaptable** para escritorio, tablet y móvil

---

## 🚀 Stack Tecnológico

### Backend
- **Django 5.0.14** - Framework web Python
- **Django REST Framework 3.16.1** - API REST
- **PostgreSQL** - Base de datos relacional
- **Python 3.12+** - Lenguaje de programación

### Frontend
- **React 18.3.1** - Biblioteca UI
- **TypeScript 5.6.2** - Tipado estático
- **Vite 6.3** - Build tool ultrarrápido
- **Tailwind CSS 3.4** - Framework de estilos
- **Radix UI** - Componentes accesibles (WCAG)
- **React Router v6** - Enrutamiento
- **TanStack Query** - Gestión de estado servidor
- **Zustand** - Gestión de estado cliente
- **Framer Motion** - Animaciones

### Herramientas
- **Papa Parse** - Procesamiento de CSV (6,894 cirugías)
- **React Hook Form + Zod** - Validación de formularios
- **Recharts** - Visualización de datos
- **date-fns** - Manipulación de fechas

---

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Python 3.12 o superior** - [Descargar](https://www.python.org/downloads/)
- **Node.js 18 o superior** - [Descargar](https://nodejs.org/)
- **PostgreSQL 14 o superior** - [Descargar](https://www.postgresql.org/download/)
- **Git** - [Descargar](https://git-scm.com/downloads/)

---

## ⚡ Instalación Rápida

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/jricica/MeDico1.git
cd MeDico1
```

### 2️⃣ Configurar Backend (Django)

#### Crear entorno virtual

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

#### Instalar dependencias Python

```bash
pip install -r requirements.txt
```

#### Configurar base de datos PostgreSQL

1. **Crear base de datos:**

```sql
-- Conectarse a PostgreSQL
psql -U postgres

-- Crear base de datos
CREATE DATABASE MeDico;

-- Crear usuario (opcional)
CREATE USER medico_user WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE MeDico TO medico_user;

-- Salir
\q
```

2. **Configurar variables de entorno:**

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
# (usa tu editor favorito: nano, vim, notepad, VS Code, etc.)
```

**Variables importantes a configurar en `.env`:**

```env
DB_NAME=MeDico
DB_USER=postgres
DB_PASSWORD=tu_password_real
DB_HOST=localhost
DB_PORT=5432

DJANGO_SECRET_KEY=genera-una-key-segura-en-djecrety.ir
DJANGO_SETTINGS_MODULE=core.settings.dev
DEBUG=True
```

#### Aplicar migraciones y cargar datos iniciales

```bash
# Aplicar migraciones
python manage.py migrate

# Cargar hospitales de Guatemala (110 hospitales)
python manage.py create_all_hospitals
```

Este comando carga:
- **40 hospitales públicos** (factor 1.0)
- **14 hospitales IGSS** (factor 1.2)
- **56 hospitales privados** (factores 1.5 - 3.5)

#### Crear superusuario (admin)

```bash
python manage.py createsuperuser
# Ingresa: username, email, password
```

### 3️⃣ Configurar Frontend (React)

#### Instalar dependencias Node.js

```bash
npm install
```

### 4️⃣ Iniciar la aplicación

**Un solo comando inicia todo:**

```bash
python manage.py runserver
```

Esto automáticamente:
- ✅ Inicia Django en `http://127.0.0.1:8000`
- ✅ Inicia Vite dev server en segundo plano
- ✅ Configura hot reload para ambos
- ✅ Hace proxy de las peticiones del frontend

**Acceder a:**
- 🌐 **Aplicación:** http://127.0.0.1:8000
- 🔧 **Admin Django:** http://127.0.0.1:8000/admin
- 📡 **API:** http://127.0.0.1:8000/api/v1/

**Detener servidores:**
- Presiona `CTRL+C` (detiene Django y Vite automáticamente)

---

## 🧪 Probar la Aplicación

### Verificar Base de Datos

Para verificar que todo se instaló correctamente:

```bash
# Ver información de la base de datos y tablas
python manage.py show_db_info
```

Deberías ver:
- ✅ **110 hospitales** cargados
- ✅ Tablas de casos quirúrgicos creadas
- ✅ Sistema de favoritos configurado

### Crear Caso de Prueba

Puedes crear un caso quirúrgico de prueba desde:

1. **Interfaz Web**: http://127.0.0.1:8000/cases/new
   - Llena el formulario con datos del paciente
   - Selecciona hospital
   - Agrega procedimientos desde el catálogo
   - Los valores se calculan automáticamente (RVU × factor hospitalario)

2. **API directamente**:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/medico/cases/ \
  -H "Authorization: Bearer <tu_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_name": "Juan Pérez",
    "patient_age": 45,
    "hospital": 1,
    "surgery_date": "2025-12-01",
    "procedures": [
      {
        "surgery_code": "12345",
        "surgery_name": "Cirugía de prueba",
        "specialty": "Cardiología",
        "rvu": 10.5,
        "hospital_factor": 2.5,
        "calculated_value": 26.25,
        "order": 1
      }
    ]
  }'
```

### Rutas Principales

Una vez iniciada la aplicación, puedes acceder a:

- **Dashboard**: http://127.0.0.1:8000/
- **Operaciones** (Catálogo de 6,894 cirugías): http://127.0.0.1:8000/operations
- **Hospitales**: http://127.0.0.1:8000/hospitals
- **Casos Quirúrgicos**:
  - Lista: http://127.0.0.1:8000/cases
  - Crear: http://127.0.0.1:8000/cases/new
  - Ver: http://127.0.0.1:8000/cases/:id
  - Editar: http://127.0.0.1:8000/cases/:id/edit
- **Favoritos**: http://127.0.0.1:8000/favorites
- **Configuración**: http://127.0.0.1:8000/settings

---

## 📁 Estructura del Proyecto



```
MeDico1/
├── 📦 apps/                        # Aplicaciones Django backend
│   ├── medico/                     # App principal médica
│   ├── medio_auth/                 # Sistema de autenticación
│   ├── communication/              # Mensajería interna
│   ├── invoice/                    # Facturación
│   └── payment/                    # Procesamiento de pagos
│
├── ⚙️ core/                        # Configuración Django
│   ├── settings/
│   │   ├── base.py                 # Configuración base
│   │   ├── dev.py                  # Desarrollo
│   │   └── prod.py                 # Producción
│   ├── urls.py                     # Rutas principales
│   ├── views.py                    # Vistas core
│   └── middleware.py               # Middleware (auto-inicia Vite)
│
├── ⚛️ src/                         # Aplicación React
│   ├── pages/                      # Páginas principales
│   │   ├── index.tsx               # Dashboard
│   │   ├── operations.tsx          # Catálogo de cirugías
│   │   ├── calculator.tsx          # Calculadora médica
│   │   ├── favorites.tsx           # Favoritos
│   │   ├── history.tsx             # Historial
│   │   └── settings.tsx            # Configuración
│   │
│   ├── shared/
│   │   ├── components/             # Componentes reutilizables
│   │   │   ├── ui/                 # Componentes UI base
│   │   │   ├── layout/             # Layouts (Sidebar, AppLayout)
│   │   │   └── auth/               # Componentes de autenticación
│   │   ├── hooks/                  # React hooks personalizados
│   │   ├── utils/                  # Utilidades
│   │   │   └── csvLoader.ts        # Cargador de CSVs (6,894 cirugías)
│   │   ├── lib/                    # Bibliotecas y helpers
│   │   └── types/                  # Tipos TypeScript
│   │
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Estilos globales
│
├── � public/                      # Archivos estáticos
│   └── surgeries/                  # 🩺 6,894 cirugías en 28 CSVs
│       ├── Cardiovascular/
│       ├── Dermatología/
│       ├── Digestivo/
│       ├── Endocrino/
│       ├── Ginecología/
│       ├── Mama/
│       ├── Neurocirugía/
│       ├── Obstetricia/
│       ├── Oftalmología/
│       ├── Ortopedia/
│       ├── Otorrino/
│       ├── Procesos_variados/
│       ├── Urología/
│       └── Sin_clasificación.csv
│
├── 🐍 venv/                        # Entorno virtual Python
├── 📄 manage.py                    # CLI de Django
├── 📋 requirements.txt             # Dependencias Python
├── 📦 package.json                 # Dependencias Node.js
├── ⚙️ vite.config.ts               # Configuración de Vite
├── 🎨 tailwind.config.js           # Configuración de Tailwind
└── 📝 .env.example                 # Ejemplo de variables de entorno
```

---

## 🛠️ Comandos Útiles

### Backend (Django)

```bash
# Iniciar servidor (Django + Vite automático)
python manage.py runserver

# Cargar hospitales iniciales
python manage.py create_all_hospitals

# Ver información de la base de datos
python manage.py show_db_info

# Crear migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Acceder a shell de Django
python manage.py shell

# Ejecutar tests
python manage.py test

# Ver logs de Vite
Get-Content vite.log -Wait   # Windows PowerShell
tail -f vite.log             # Linux/Mac
```

### Frontend (React)

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (solo frontend)
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview

# Ejecutar linter
npm run lint

# Ejecutar tests
npm run test
```

---

## ✨ Características Principales

### 🎯 Frontend
- ✅ **Dashboard interactivo** con estadísticas en tiempo real
- ✅ **Catálogo de 6,894 cirugías** organizadas en 28 especialidades
- ✅ **Gestión de hospitales** con 110 hospitales precargados de Guatemala
- ✅ **Sistema de casos quirúrgicos** completo (crear, ver, editar, eliminar)
- ✅ **Calculadora médica** con cálculo automático de RVU × factor hospitalario
- ✅ **Sistema de favoritos** para procedimientos y hospitales
- ✅ **Búsqueda y filtros** avanzados por especialidad, hospital, estado, fecha
- ✅ **Autenticación segura** con JWT
- ✅ **Diseño responsive** (móvil, tablet, escritorio)
- ✅ **Interfaz minimalista** con colores neutros (blanco/gris oscuro)
- ✅ **Componentes accesibles** (WCAG 2.1)
- ✅ **Animaciones fluidas** con transiciones suaves

### ⚙️ Backend
- ✅ **API REST completa** con Django REST Framework
- ✅ **Base de datos PostgreSQL** optimizada con índices
- ✅ **Modelos de datos**:
  - `SurgicalCase`: Casos quirúrgicos con información del paciente
  - `CaseProcedure`: Procedimientos individuales con cálculos automáticos
  - `Hospital`: 110 hospitales con multiplicadores de tarifa
  - `FavoriteHospital`: Sistema de favoritos por usuario
- ✅ **Paginación automática** en listados (20 items por página)
- ✅ **Autenticación JWT** con tokens de acceso y refresh
- ✅ **Panel de administración** Django personalizado
- ✅ **CORS configurado** para desarrollo y producción
- ✅ **Middleware personalizado** (auto-inicio de Vite)
- ✅ **Migraciones versionadas** con datos iniciales

---

## 📊 Catálogo de Cirugías

El sistema incluye **6,894 procedimientos quirúrgicos** distribuidos en:

| Especialidad | Subcategorías | Cirugías |
|--------------|---------------|----------|
| 🫀 Cardiovascular | 3 | 888 |
| 🩹 Dermatología | 1 | 42 |
| 🍽️ Digestivo | 4 | 912 |
| 🦴 Endocrino | 1 | 23 |
| 👶 Ginecología | 1 | 143 |
| 🎗️ Mama | 1 | 42 |
| 🧠 Neurocirugía | 3 | 874 |
| 🤰 Obstetricia | 1 | 41 |
| 👁️ Oftalmología | 1 | 262 |
| 🦿 Ortopedia | 5 | 1,725 |
| 👂 Otorrino | 1 | 93 |
| 🔪 Procesos Variados | 4 | 116 |
| 💧 Urología | 1 | 269 |
| 📋 Sin Clasificación | 1 | 1,464 |

---

## 🔌 API Endpoints

### Autenticación
```
POST   /api/v1/auth/login/      # Iniciar sesión
POST   /api/v1/auth/logout/     # Cerrar sesión
POST   /api/v1/auth/register/   # Registrar usuario
GET    /api/v1/auth/user/       # Obtener usuario actual
```

### Casos Quirúrgicos
```
GET    /api/v1/medico/cases/                 # Listar casos del usuario
POST   /api/v1/medico/cases/                 # Crear nuevo caso
GET    /api/v1/medico/cases/:id/             # Ver detalle de caso
PATCH  /api/v1/medico/cases/:id/             # Actualizar caso
DELETE /api/v1/medico/cases/:id/             # Eliminar caso
GET    /api/v1/medico/cases/stats/           # Obtener estadísticas
```

### Hospitales
```
GET    /api/v1/medico/hospitals/                    # Listar hospitales
GET    /api/v1/medico/hospitals/:id/                # Detalle de hospital
GET    /api/v1/medico/hospitals/?hospital_type=X    # Filtrar por tipo
GET    /api/v1/medico/hospitals/?search=nombre      # Buscar por nombre
```

### Favoritos de Hospitales
```
GET    /api/v1/medico/favorite-hospitals/           # Listar favoritos del usuario
POST   /api/v1/medico/favorite-hospitals/           # Agregar hospital a favoritos
DELETE /api/v1/medico/favorite-hospitals/:id/       # Eliminar de favoritos
```

### Cirugías (Catálogo)
```
GET    /api/v1/surgeries/                    # Listar todas
GET    /api/v1/surgeries/?specialty=X        # Filtrar por especialidad
GET    /api/v1/surgeries/:id/                # Detalle
POST   /api/v1/surgeries/calculate/          # Calcular valor
```

---

## 🔐 Seguridad

El proyecto implementa múltiples capas de seguridad:

- 🔒 **Autenticación JWT** con tokens de acceso y refresh
- 🛡️ **CSRF Protection** habilitado
- 🌐 **CORS configurado** con whitelist de orígenes
- 💉 **SQL Injection protection** (Django ORM)
- 🔓 **XSS Protection** (sanitización de inputs)
- 🔑 **Passwords hasheados** con bcrypt
- 📝 **Validación de datos** con Zod en frontend
- 🚫 **Rate limiting** en endpoints críticos
- 🔐 **Variables de entorno** para secretos
- 📋 **Logs de auditoría** de acciones importantes

---

## 🐛 Solución de Problemas

### ❌ Error: `ModuleNotFoundError: No module named 'django'`
**Solución:** Activa el entorno virtual
```bash
# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# Luego instala dependencias
pip install -r requirements.txt
```

### ❌ Error: `FATAL: database "MeDico" does not exist`
**Solución:** Crea la base de datos en PostgreSQL
```bash
psql -U postgres
CREATE DATABASE MeDico;
\q
```

### ❌ Error: `django.core.exceptions.ImproperlyConfigured: Set the DJANGO_SECRET_KEY environment variable`
**Solución:** Configura tu archivo `.env`
```bash
cp .env.example .env
# Edita .env y genera una secret key en https://djecrety.ir/
```

### ❌ Error: `Vite no inicia automáticamente`
**Solución:** Verifica logs y permisos
```bash
# Ver logs
type vite.log  # Windows
cat vite.log   # Linux/Mac

# Iniciar Vite manualmente
npm run dev
```

### ❌ Error: `npm ERR! network`
**Solución:** Limpia caché de npm
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### ❌ Error: `Port 8000 already in use`
**Solución:** Mata el proceso en ese puerto
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <pid> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### ❌ Error: `No hospitals loaded / Hospital table empty`
**Solución:** Carga los hospitales iniciales
```bash
python manage.py create_all_hospitals
# Esto carga 110 hospitales de Guatemala
```

### ❌ Error: `calculated_value: Asegúrese de que no haya más de 15 dígitos en total`
**Solución:** Aplica las migraciones más recientes
```bash
python manage.py migrate
# La migración 0004 actualiza el campo calculated_value a 15 dígitos
```

### ❌ Error: `CORS policy blocked`
**Solución:** Verifica CORS en settings
```python
# core/settings/dev.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

---

## 🚀 Despliegue a Producción

### Preparar frontend

```bash
npm run build
```

### Preparar backend

```bash
# Cambiar a settings de producción
export DJANGO_SETTINGS_MODULE=core.settings.prod

# Collectar archivos estáticos
python manage.py collectstatic --no-input

# Aplicar migraciones
python manage.py migrate
```

### Variables de entorno en producción

```env
DEBUG=False
DJANGO_SETTINGS_MODULE=core.settings.prod
ALLOWED_HOSTS=tu-dominio.com
CORS_ALLOWED_ORIGINS=https://tu-dominio.com
# ... otras variables
```

---


### Ejemplos de commits:
```bash
git commit -m "feat/feature: agregar filtro por RVU en calculadora"
git commit -m "fix: corregir error en carga de CSV de Ortopedia"
git commit -m "docs: actualizar README con instrucciones de deploy"
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo [LICENSE](LICENSE) para más detalles.

---

## 👥 Equipo

- **Developer**: [@jricica](https://github.com/jricica)
- **Developer**: [@Nachopacca24](https://github.com/Nachopacca24)

---

## 📞 Contacto y Soporte

- 🐛 **Reportar bugs**: [Issues en GitHub](https://github.com/jricica/MeDico1/issues)
- 💡 **Sugerencias**: [Discussions en GitHub](https://github.com/jricica/MeDico1/discussions)
- 📧 **Email**:
---

## 📚 Recursos Adicionales

- [Documentación de Django](https://docs.djangoproject.com/)
- [Documentación de React](https://react.dev/)
- [Documentación de TypeScript](https://www.typescriptlang.org/docs/)
- [Documentación de Vite](https://vitejs.dev/)
- [Documentación de Tailwind CSS](https://tailwindcss.com/docs)

---

