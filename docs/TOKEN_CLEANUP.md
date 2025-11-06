# Limpieza de Tokens JWT Blacklisteados

## Problema

Con `ROTATE_REFRESH_TOKENS = True` y `BLACKLIST_AFTER_ROTATION = True`, cada vez que un token se refresca, el token viejo se agrega a la blacklist. Después de 7 días (tiempo de expiración del refresh token), estos tokens ya no son útiles pero permanecen en la base de datos.

## Solución

Hemos creado un comando de Django para limpiar tokens expirados automáticamente:

```bash
python manage.py cleanup_blacklisted_tokens
```

## Opciones del Comando

- `--days N`: Eliminar tokens expirados hace más de N días (default: 7)
- `--dry-run`: Mostrar qué se eliminaría sin hacer cambios

## Ejemplos de Uso

```bash
# Limpieza estándar (tokens expirados hace más de 7 días)
python manage.py cleanup_blacklisted_tokens

# Limpieza más agresiva (tokens expirados hace más de 3 días)
python manage.py cleanup_blacklisted_tokens --days 3

# Ver qué se eliminaría sin hacer cambios
python manage.py cleanup_blacklisted_tokens --dry-run
```

## Configuración de Cronjob

### Linux/Mac

Agregar a crontab (`crontab -e`):

```bash
# Ejecutar todos los días a las 2 AM
0 2 * * * cd /ruta/a/proyecto && /ruta/a/venv/bin/python manage.py cleanup_blacklisted_tokens
```

### Windows (Task Scheduler)

1. Abrir "Programador de tareas" (Task Scheduler)
2. Crear tarea básica
3. Configurar:
   - Trigger: Diariamente a las 2 AM
   - Acción: Iniciar programa
   - Programa: `C:\ruta\a\venv\Scripts\python.exe`
   - Argumentos: `manage.py cleanup_blacklisted_tokens`
   - Iniciar en: `C:\ruta\a\proyecto`

### Docker

Agregar a docker-compose.yml:

```yaml
services:
  token-cleanup:
    build: .
    command: sh -c "while true; do python manage.py cleanup_blacklisted_tokens && sleep 86400; done"
    depends_on:
      - db
```

### Celery Beat (Recomendado para producción)

En `celery.py`:

```python
from celery import Celery
from celery.schedules import crontab

app = Celery('medico')

app.conf.beat_schedule = {
    'cleanup-blacklisted-tokens': {
        'task': 'apps.medio_auth.tasks.cleanup_tokens',
        'schedule': crontab(hour=2, minute=0),  # 2 AM diariamente
    },
}
```

En `apps/medio_auth/tasks.py`:

```python
from celery import shared_task
from django.core.management import call_command

@shared_task
def cleanup_tokens():
    call_command('cleanup_blacklisted_tokens')
```

## Monitoreo

Después de ejecutar el comando, verás estadísticas:

```
✅ Se eliminaron 150 tokens blacklisteados expirados

Estadísticas:
  - Tokens blacklisteados restantes: 45
  - Total de tokens outstanding: 200
```

## Frecuencia Recomendada

- **Desarrollo**: Semanal o manual
- **Producción baja actividad**: Diariamente
- **Producción alta actividad**: Diariamente o cada 12 horas

## Impacto en Rendimiento

La limpieza es segura porque:
- Solo elimina tokens que ya expiraron hace días
- No afecta tokens activos o válidos
- La operación es rápida (índices en `expires_at`)
- Puede ejecutarse en horarios de bajo tráfico
