from rest_framework.throttling import AnonRateThrottle, UserRateThrottle, SimpleRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class RegisterRateThrottle(AnonRateThrottle):
    scope = 'register'


class AdTrackingThrottle(AnonRateThrottle):
    scope = 'ad_tracking'


class PasswordResetThrottle(AnonRateThrottle):
    scope = 'password_reset'


class LoginEmailThrottle(SimpleRateThrottle):
    """Throttle per email address to limit brute-force against a single account across IPs."""
    scope = 'login_email'

    def get_cache_key(self, request, view):
        email = (request.data.get('email') or '').lower().strip()
        if not email:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': email}


class PasswordResetEmailThrottle(SimpleRateThrottle):
    """Throttle per email address so shared IPs (hospital networks) don't block other users."""
    scope = 'password_reset_email'

    def get_cache_key(self, request, view):
        email = request.data.get('email', '').lower().strip()
        if not email:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': email}


class ColleagueSearchThrottle(UserRateThrottle):
    scope = 'colleague_search'


class RefreshTokenThrottle(AnonRateThrottle):
    scope = 'token_refresh'


class WebhookThrottle(AnonRateThrottle):
    """The 'webhook' rate in DEFAULT_THROTTLE_RATES had no class using this
    scope, so lemonsqueezy_webhook silently fell back to the much tighter
    default 'anon' rate instead. Not exploitable (HMAC verification already
    rejects forged requests before this ever matters), but the config should
    say what it actually does."""
    scope = 'webhook'
