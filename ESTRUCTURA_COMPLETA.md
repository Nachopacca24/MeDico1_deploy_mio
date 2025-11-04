# MéDico1 - Estructura Django + React

## ✅ Reorganización Completada

El proyecto ha sido completamente reorganizado siguiendo una arquitectura híbrida **Django + React**.

---

## 📁 Estructura del Proyecto

```
MeDico1/
├── manage.py                    # Django CLI
├── requirements.txt             # Dependencias Python
├── .env.example                 # Variables de entorno
├── .gitignore                   # Archivos ignorados
│
├── apps/                        # Django Apps Modulares
│   ├── __init__.py
│   ├── medico/                  # App principal - Funcionalidad médica
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── admin.py
│   │   ├── models/
│   │   ├── views/
│   │   ├── serializers/
│   │   ├── urls.py
│   │   └── tests/
│   │
│   ├── medio_auth/              # Autenticación y usuarios
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── admin.py
│   │   ├── models/              # CustomUser model
│   │   ├── views/               # Login, Register, Logout
│   │   ├── serializers/
│   │   ├── urls.py
│   │   └── tests/
│   │
│   ├── communication/           # Mensajes y notificaciones
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── models/              # Message, Notification
│   │   ├── views/
│   │   ├── serializers/
│   │   └── urls.py
│   │
│   ├── invoice/                 # Gestión de facturación
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── models/              # Invoice, InvoiceItem
│   │   ├── views/
│   │   ├── serializers/
│   │   └── urls.py
│   │
│   └── payment/                 # Procesamiento de pagos
│       ├── __init__.py
│       ├── apps.py
│       ├── models/              # Payment, PaymentMethod
│       ├── views/               # process, refund actions
│       ├── serializers/
│       └── urls.py
│
├── core/                        # Configuración Django
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py              # Settings base
│   │   ├── dev.py               # Development
│   │   └── prod.py              # Production
│   ├── urls.py                  # URL routing principal
│   ├── wsgi.py                  # WSGI server
│   └── asgi.py                  # ASGI server
│
├── frontend/                    # React + TypeScript App
│   ├── main.tsx
│   ├── index.css
│   ├── vite-env.d.ts
│   │
│   ├── features/                # Features modulares
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── calculator/
│   │   ├── operations/
│   │   ├── favorites/
│   │   ├── history/
│   │   └── settings/
│   │
│   ├── shared/                  # Código compartido
│   │   ├── components/          # UI components
│   │   │   ├── ui/              # Radix UI components
│   │   │   └── layout/          # Layout components
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── utils/
│   │   ├── types/
│   │   └── constants/
│   │
│   └── core/                    # App core
│       ├── router/
│       └── providers/
│
├── backend/                     # Backend data
│   └── data/
│       └── surgeries/           # CSV organizados por especialidad
│           ├── Cardiovascular/
│           ├── Dermatología/
│           ├── Digestivo/
│           ├── Endocrino/
│           ├── Ginecología/
│           ├── Mama/
│           ├── Neurocirugía/
│           ├── Obstetricia/
│           ├── Oftalmología/
│           ├── Ortopedia/
│           ├── Otorrino/
│           ├── Procesos_variados/
│           └── Urología/
│
├── static/                      # Static files Django
├── media/                       # Media uploads Django
├── staticfiles/                 # Collectstatic output
│
├── docs/                        # Documentación
│   ├── arquitectura.md
│   ├── guia-instalacion.md
│   ├── guia-desarrollo.md
│   └── RESUMEN_REORGANIZACION.md
│
└── scripts/                     # Scripts de utilidad
    ├── setup.sh
    ├── setup.ps1
    └── deploy.sh
```

---

## 🚀 Configuración Rápida

### 1. Backend Django

```powershell
# Crear entorno virtual
python -m venv venv
.\venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Ejecutar migraciones
python manage.py makemigrations
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Iniciar servidor Django
python manage.py runserver 8000
```

### 2. Frontend React

```powershell
# Instalar dependencias
npm install

# Iniciar dev server
npm run dev
```

---

## 🔌 Endpoints API

El backend Django expone los siguientes endpoints:

```
/admin/                          # Django Admin
/api-auth/                       # DRF Authentication

/api/v1/medico/                  # Funcionalidad médica principal
/api/v1/auth/                    # Login, Register, Logout
/api/v1/communication/           # Mensajes y notificaciones
/api/v1/invoice/                 # Facturación
/api/v1/payment/                 # Pagos
```

---

## 🔧 Tecnologías

### Backend
- **Django 5.x** - Framework principal
- **Django REST Framework** - API REST
- **PostgreSQL** - Base de datos
- **django-cors-headers** - CORS para frontend
- **django-filters** - Filtrado avanzado
- **Gunicorn** - Production server

### Frontend
- **React 18.3** + **TypeScript**
- **Vite** - Build tool
- **React Router v6** - Routing
- **Tailwind CSS** - Styling
- **Radix UI** - Componentes
- **TanStack Query** - Data fetching
- **Zustand** - State management

---

## 📝 Configuración de Settings

### Base (`core/settings/base.py`)
- Configuración común
- Apps instaladas
- Middleware
- PostgreSQL database
- REST Framework
- CORS para localhost:5173

### Development (`core/settings/dev.py`)
- DEBUG = True
- CORS permisivo
- Console logging

### Production (`core/settings/prod.py`)
- Seguridad SSL
- Cookies seguras
- HSTS
- CORS restringido

---

## 🎯 Próximos Pasos

1. **Actualizar imports en frontend** (cambio de `src/` a `frontend/`)
2. **Definir modelos** en cada Django app
3. **Crear serializers** para API
4. **Implementar views** y lógica de negocio
5. **Escribir tests** para backend y frontend
6. **Conectar frontend con API Django**
7. **Cargar datos CSV** a la base de datos

---

## 📚 Documentación

Consulta los siguientes documentos en `docs/`:
- `arquitectura.md` - Arquitectura del sistema
- `guia-instalacion.md` - Guía de instalación detallada
- `guia-desarrollo.md` - Convenciones de desarrollo

---

## ⚙️ Variables de Entorno

Crear `.env` basado en `.env.example`:

```env
# Django
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_SETTINGS_MODULE=core.settings.dev

# Database
DB_NAME=medico_db
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432

# Frontend
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 🐛 Debugging

### Backend
```powershell
# Verificar configuración
python manage.py check

# Ver migraciones pendientes
python manage.py showmigrations

# Shell interactivo
python manage.py shell
```

### Frontend
```powershell
# Build para producción
npm run build

# Preview del build
npm run preview
```

---

**Proyecto reorganizado exitosamente con arquitectura Django + React** ✅
