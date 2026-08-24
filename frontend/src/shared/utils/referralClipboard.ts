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
