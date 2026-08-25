import { useEffect, useState } from 'react';
import { siteSettingsService, type SiteSettings } from '@/services/siteSettingsService';

const DEFAULT: SiteSettings = { PREMIUM_PRICE: '7', ANNUAL_PRICE: '84', TRIAL_DAYS: '30', ANDROID_TESTERS_COUNT: '12', ANDROID_MIN_VERSION: '1.0', IOS_MIN_VERSION: '1.0', FREE_FOR_ALL_PREMIUM: '0' };

let cached: SiteSettings | null = null;

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(cached ?? DEFAULT);

  useEffect(() => {
    if (cached) return;
    siteSettingsService.getPublic().then(s => {
      cached = s;
      setSettings(s);
    }).catch(() => {});
  }, []);

  return settings;
}
