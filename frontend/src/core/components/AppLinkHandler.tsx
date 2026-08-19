// src/core/components/AppLinkHandler.tsx

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

const APP_LINK_HOST = 'medicoapp.app';

// calendar.tsx owns the Google OAuth callback end-to-end (its own getLaunchUrl
// check + appUrlOpen listener + single-use-code guard via oauthProcessingRef).
// If we also navigate() for it here, Calendar mounts/re-processes the same
// (single-use) code a second time via its own logic, which fails as an
// invalid/expired grant and can leave the SPA bouncing between routes.
const EXCLUDED_PREFIXES = ['/calendar'];

// Only the path is meaningful to React Router — strip the scheme/host so we don't
// accidentally navigate off medicoapp.app if some other host ever shows up here.
function extractPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== APP_LINK_HOST) return null;
    const path = parsed.pathname + parsed.search;
    if (path === '/') return null;
    if (EXCLUDED_PREFIXES.some(prefix => parsed.pathname.startsWith(prefix))) return null;
    return path;
  } catch {
    return null;
  }
}

/**
 * Handles Android App Links / iOS Universal Links for medicoapp.app (colleague
 * invite QR/link, and anything else registered in AndroidManifest.xml's
 * intent-filter / apple-app-site-association) by navigating the SPA router to
 * the matching in-app route — instead of the OS falling back to opening it in
 * the browser, which is what happens whenever a URL isn't recognized as a
 * verified App/Universal Link.
 *
 * calendar.tsx already has its own narrower appUrlOpen listener for the Google
 * OAuth callback (scoped to when that page is mounted); this one is global so
 * links work no matter what screen the app is on, or a cold start.
 */
// Capacitor's redelivery of a duplicate appUrlOpen event happens within
// milliseconds of the first one — a few seconds of dedup window is enough to
// absorb that without blocking a genuine later re-tap of the same link (e.g.
// removing a colleague and immediately re-adding them with the same QR).
const DEDUP_WINDOW_MS = 4000;

export function AppLinkHandler() {
  const navigate = useNavigate();
  // See DEDUP_WINDOW_MS above — without this, every redelivery calls navigate()
  // again with the same one-time-use link (e.g. a colleague invite), which
  // yanks the user back to it right after they navigate away — it looked
  // "stuck", the exit button appeared to just not work.
  const lastRef = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const go = (path: string) => {
      const now = Date.now();
      const last = lastRef.current;
      if (last && last.path === path && now - last.at < DEDUP_WINDOW_MS) return;
      lastRef.current = { path, at: now };
      navigate(path);
    };

    // Cold start: the app was launched directly via the link.
    CapApp.getLaunchUrl().then(launch => {
      if (!launch?.url) return;
      const path = extractPath(launch.url);
      if (path) go(path);
    }).catch(() => { /* getLaunchUrl not available on this platform */ });

    // Already running: the link was tapped while the app is foregrounded/backgrounded.
    let listenerHandle: { remove: () => void } | null = null;
    CapApp.addListener('appUrlOpen', ({ url }) => {
      const path = extractPath(url);
      if (path) go(path);
    }).then(handle => { listenerHandle = handle; });

    return () => { listenerHandle?.remove(); };
  }, [navigate]);

  return null;
}
