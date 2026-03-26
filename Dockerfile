# ETAPA 1: Frontend (React)
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Usamos ci para una instalación más limpia y ligera
RUN npm ci || npm install 
COPY frontend/ ./
RUN npm run build

# ETAPA 2: Backend (Django)
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=core.settings.prod

RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn whitenoise

COPY . .
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

# Bypass del DB check para collectstatic
RUN DATABASE_URL=sqlite:///:memory: DJANGO_SECRET_KEY=dummy-key python manage.py collectstatic --noinput

EXPOSE 8080

CMD ["gunicorn", "--bind", ":8080", "--workers", "1", "--threads", "4", "--timeout", "0", "core.wsgi:application"]
