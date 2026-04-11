# MéDico1 - Medical Practice Management

## Overview
A full-stack medical practice management application built with:
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Django REST Framework + PostgreSQL
- **Authentication**: JWT (Simple JWT)

## Project Structure
```
├── apps/                  # Django applications
│   ├── advertising/       # Advertising module
│   ├── communication/     # Communication module
│   ├── invoice/           # Invoice module
│   ├── medico/            # Core medical module
│   ├── medio_auth/        # Authentication module
│   └── payment/           # Payment module
├── core/                  # Django project settings
│   └── settings/
│       ├── base.py        # Base settings
│       ├── dev.py         # Development settings
│       └── prod.py        # Production settings
├── src/                   # React frontend source
│   ├── pages/             # Page components
│   ├── services/          # API services
│   └── shared/            # Shared components/utilities
└── public/                # Static assets
```

## Development

### Running the Application
The Dev Server workflow runs both:
- Django backend on port 8000
- Vite frontend on port 5000 (exposed to users)

### Database
- Uses PostgreSQL via Replit's built-in database
- Django migrations auto-applied

### API Proxy
Vite proxies `/api` requests to Django backend at localhost:8000

## Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (auto-configured)
- `DJANGO_SETTINGS_MODULE`: Set to `core.settings.dev` for development

## Key Features
- User authentication with JWT
- Surgical case management
- Hospital management
- Medical billing/invoicing
