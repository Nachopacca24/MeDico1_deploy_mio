import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * window.open('_blank'/'_self') doesn't work reliably inside the Capacitor
 * WebView — same issue as openLegalDoc. On native we always open ads in the
 * in-app browser regardless of the advertiser's "open in new tab" choice,
 * since navigating our own WebView away ("_self") would break the app.
 */
export async function openAdLink(redirectUrl: string, openInNewTab: boolean): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: redirectUrl });
  } else {
    window.open(redirectUrl, openInNewTab ? '_blank' : '_self');
  }
}
