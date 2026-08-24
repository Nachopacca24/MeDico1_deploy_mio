import { Browser } from '@capacitor/browser';

const APP_ORIGIN = 'https://medicoapp.app';

/**
 * target="_blank" links don't open inside the Capacitor WKWebView (no tab to
 * delegate to), so terms/privacy links need Browser.open with an absolute URL.
 * Browser.open falls back to a normal new-tab window.open on the web build.
 */
export async function openLegalDoc(path: '/terms.html' | '/privacy.html' | '/faq.html'): Promise<void> {
  await Browser.open({ url: `${APP_ORIGIN}${path}` });
}
