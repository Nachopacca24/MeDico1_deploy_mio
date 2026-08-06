// src/core/components/AppLinkHandler.tsx

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

const APP_LINK_HOST = 'medicoapp.app';

// Only the path is meaningful to React Router — strip the scheme/host so we don't
// accidentally navigate off medicoapp.app if some other host ever shows up here.
function extractPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== APP_LINK_HOST) return null;
    const path = parsed.pathname + parsed.search;
    return path === '/' ? null : path;
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
export function AppLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Cold start: the app was launched directly via the link.
    CapApp.getLaunchUrl().then(launch => {
      if (!launch?.url) return;
      const path = extractPath(launch.url);
      if (path) navigate(path);
    }).catch(() => { /* getLaunchUrl not available on this platform */ });

    // Already running: the link was tapped while the app is foregrounded/backgrounded.
    let listenerHandle: { remove: () => void } | null = null;
    CapApp.addListener('appUrlOpen', ({ url }) => {
      const path = extractPath(url);
      if (path) navigate(path);
    }).then(handle => { listenerHandle = handle; });

    return () => { listenerHandle?.remove(); };
  }, [navigate]);

  return null;
}
