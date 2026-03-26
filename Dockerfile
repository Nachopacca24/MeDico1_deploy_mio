# ETAPA 1: Construir el Frontend (React + Vite)
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Instalar dependencias del frontend
COPY frontend/package*.json ./
RUN npm install

# Copiar el código del frontend y compilar
COPY frontend/ ./
RUN npm run build


# ETAPA 2: Configurar el Backend (Django) y la imagen final
FROM python:3.12-slim
WORKDIR /app

# Variables de entorno para Python y Django
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=core.settings.prod

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
# Aseguramos que gunicorn y whitenoise estén instalados
RUN pip install --no-cache-dir gunicorn whitenoise

# Copiar todo el código del proyecto a la imagen
COPY . .

# Traer el frontend compilado de la Etapa 1
# Esto coloca los archivos en /app/frontend/dist para que Django los encuentre
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Cambiar a la carpeta del backend para ejecutar comandos de Django
WORKDIR /app/backend

# Recopilar archivos estáticos (Gunicorn los servirá vía WhiteNoise)
# Usamos una clave dummy solo para este paso de compilación
RUN DJANGO_SECRET_KEY=collectstatic-dummy-key python manage.py collectstatic --noinput

# Cloud Run usa el puerto 8080 por defecto
EXPOSE 8080

# Comando definitivo para arrancar el servidor
# Como estamos en /app/backend, 'core.wsgi' es el módulo correcto
CMD ["gunicorn", "--bind", ":8080", "--workers", "1", "--threads", "8", "--timeout", "0", "core.wsgi:application"]
