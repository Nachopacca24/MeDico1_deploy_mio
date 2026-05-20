---
name: project-security-audit
description: Security audit of MeDico1 Django backend — what was fixed and what remains
metadata:
  type: project
---

Security audit completed 2026-05-19. Critical issues fixed, high/medium issues pending.

**Why:** User wants to make the app commercial-grade. Needed a full security review before production.

**How to apply:** When touching auth, middleware, or advertising views, check against this list. When user is ready, proceed to High severity fixes.

## Fixed (Critical)

- `ALLOWED_HOSTS = ['*']` → now uses env var with explicit domains in prod.py
- `SECURE_SSL_REDIRECT = False` → added `SECURE_PROXY_SSL_HEADER` for Render proxy
- `SECRET_KEY` insecure hardcoded fallback → raises `ImproperlyConfigured` in production
- Path traversal in `/surgeries/` middleware → fixed with `Path.resolve()` + boundary check
- `shell=True` in Vite subprocess (Windows) → fixed to use list form
- No rate limiting on login/register/ad tracking → added DRF throttle classes
  - Login: 5/min per IP (`core/throttles.py:LoginRateThrottle`)
  - Register: 10/hour per IP (`core/throttles.py:RegisterRateThrottle`)
  - Ad tracking: 60/hour per IP (`core/throttles.py:AdTrackingThrottle`)
- Sentry `send_default_pii=True` → changed to False

## Pending (High severity — next round)

1. Google OAuth: missing `timeout` on `requests.get` to Google userinfo endpoint, no `aud` claim validation
2. Admin endpoints (`/api/admin/*`): may only have `IsAuthenticated`, not `IsAdminUser` — needs check in `core/views.py`
3. `print()` statements with sensitive patient data in `surgical_case.py` — replace with `logger`

## Fixed (Medium)

4. Email verification enforcement → `IsEmailVerified` permission class en `apps/medio_auth/permissions.py`, aplicada a `SurgicalCaseViewSet`
5. Input validation → `parse_date()` en date_from/date_to, límite de 100 chars en search (`surgical_case.py`)
6. `.env.example` actualizado con todas las variables (Cloudinary, Google OAuth, Sentry, CORS, etc.)

## Pendiente (bajo / mejoras futuras)

- `subprocess shell=True` en ViteDevMiddleware (solo afecta dev, fue revertido)
- `ALLOWED_HOSTS = ['*']` en prod.py (fue revertido — configurar via `DJANGO_ALLOWED_HOSTS` env var en Render)
- Friend code usa `random` en vez de `secrets` (bajo impacto, códigos son públicos por diseño)
- Respuestas de tiempo constante para evitar user enumeration en friend code search
