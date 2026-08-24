// src/shared/utils/referralClipboard.ts
//
// Best-effort deferred referral tracking: when someone without the app taps
// a colleague's invite link, we can't carry the ?ref= code across the gap
// between "browser redirected to the store" and "native app opened fresh
// from the home screen" — the app's storage is a completely separate
// container from the phone's regular browser, even on the same device.
// The clipboard is the one thing both contexts can read and write.
//
// Never lets a clipboard failure (permission denied, non-secure context,
// unsupported browser) break the actual invite/signup flow it's attached to
// — every call here is try/catch-wrapped and resolves to void/null on error.

const CLIPBOARD_MARKER = 'MEDICO-REF:';

/** Called right before redirecting to the App/Play Store. */
export async function writeReferralToClipboard(code: string): Promise<void> {
  try {
    await navigator.clipboard?.writeText(`${CLIPBOARD_MARKER}${code}`);
  } catch {
    // Clipboard write can be denied or unavailable — the store redirect
    // still has to happen either way, so this failure is silent.
  }
}

/**
 * Called from inside the freshly-installed app, at the exact moment of a
 * real user gesture (tapping "Crear cuenta" or a Google/Apple button) —
 * reading the clipboard without an active user gesture is blocked by most
 * mobile browsers/WebViews, and doing it silently on app cold-start would
 * either fail outright or trigger iOS's "Pasted from Safari" banner for no
 * reason the user can connect to what they're doing.
 */
export async function readReferralFromClipboard(): Promise<string | null> {
  try {
    const text = await navigator.clipboard?.readText();
    if (text?.startsWith(CLIPBOARD_MARKER)) {
      const code = text.slice(CLIPBOARD_MARKER.length).trim().toUpperCase();
      return code || null;
    }
  } catch {
    // Denied, unsupported, or the clipboard just has something else in it
    // (the user copied a verification code, a WiFi password, etc. in the
    // meantime) — this is a best-effort fallback, not a guarantee.
  }
  return null;
}

/**
 * Shared resolution used by both signup.tsx and login.tsx: whatever code is
 * already known (set by InvitePage/signup's own ?ref= handling) wins, no
 * clipboard read needed. Otherwise falls back to the clipboard — call this
 * as the first async step of a real user-gesture handler (see
 * readReferralFromClipboard). Persists whatever it finds back to
 * localStorage so the rest of the app's existing ?ref=/localStorage flow
 * keeps working unchanged.
 *
 * Safe to call from a login handler, not just signup: the backend only ever
 * grants referral credit when the auth attempt actually creates a new
 * account (see GoogleLoginView/AppleLoginView's grant_credit=created) — an
 * existing user logging back in still gets connected as a colleague if a
 * code is present, but never credited. So this can't accidentally award
 * days for a plain login.
 */
export async function resolvePendingReferralCode(): Promise<string | null> {
  const known = localStorage.getItem('referral_code');
  if (known) return known;
  const fromClipboard = await readReferralFromClipboard();
  if (fromClipboard) {
    localStorage.setItem('referral_code', fromClipboard);
  }
  return fromClipboard;
}
