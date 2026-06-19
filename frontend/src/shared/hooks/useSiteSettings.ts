import { useEffect, useState } from 'react';
import { siteSettingsService, type SiteSettings } from '@/services/siteSettingsService';

const DEFAULT: SiteSettings = { PREMIUM_PRICE: '7', TRIAL_DAYS: '30' };

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
