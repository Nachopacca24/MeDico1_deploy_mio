// src/shared/utils/platform.ts

export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=app.medicoapp.medico";
export const APP_STORE_URL = "https://apps.apple.com/gt/app/medico-app/id6796186927";

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

export function isMobileWeb(): boolean {
  return isIOS() || isAndroid();
}

export function storeUrlForDevice(): string {
  return isIOS() ? APP_STORE_URL : PLAY_STORE_URL;
}
