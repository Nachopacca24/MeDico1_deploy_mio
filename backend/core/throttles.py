from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class RegisterRateThrottle(AnonRateThrottle):
    scope = 'register'


class AdTrackingThrottle(AnonRateThrottle):
    scope = 'ad_tracking'


class PasswordResetThrottle(AnonRateThrottle):
    scope = 'password_reset'


class ColleagueSearchThrottle(UserRateThrottle):
    scope = 'colleague_search'


class RefreshTokenThrottle(AnonRateThrottle):
    scope = 'token_refresh'
