import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { siteSettingsService } from '@/services/siteSettingsService';
import { PLAY_STORE_URL, APP_STORE_URL } from '@/shared/utils/platform';

function compareVersions(installed: string, minimum: string): boolean {
  const toArr = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0);
  const a = toArr(installed);
  const b = toArr(minimum);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) < (b[i] ?? 0)) return true;  // installed < minimum
    if ((a[i] ?? 0) > (b[i] ?? 0)) return false;
  }
  return false;
}

export function UpdateChecker() {
  const [showDialog, setShowDialog] = useState(false);
  const platform = Capacitor.getPlatform();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || (platform !== 'android' && platform !== 'ios')) return;

    (async () => {
      try {
        const [info, settings] = await Promise.all([
          App.getInfo(),
          siteSettingsService.getPublic(),
        ]);
        const minVersion = platform === 'ios' ? settings.IOS_MIN_VERSION : settings.ANDROID_MIN_VERSION;
        if (compareVersions(info.version, minVersion)) {
          setShowDialog(true);
        }
      } catch {
        // silently ignore — no update check on failure
      }
    })();
  }, [platform]);

  const handleUpdate = async () => {
    await Browser.open({ url: platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL });
  };

  if (!showDialog) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="text-4xl mb-3">🔄</div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">
          Nueva versión disponible
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          Hay una actualización de MeDico App lista para instalar. Actualizá para seguir disfrutando de todas las funciones.
        </p>
        <button
          onClick={handleUpdate}
          className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-xl transition-colors mb-3"
        >
          Actualizar ahora
        </button>
        <button
          onClick={() => setShowDialog(false)}
          className="w-full text-slate-400 text-sm py-2 hover:text-slate-600 transition-colors"
        >
          Recordarme después
        </button>
      </div>
    </div>
  );
}
