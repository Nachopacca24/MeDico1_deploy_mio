import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/shared/contexts/AuthContext';
import { authService } from '@/shared/services/authService';
import { Loader2, UserCheck, AlertCircle, Share2, Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { isMobileWeb, storeUrlForDevice } from '@/shared/utils/platform';
import { writeReferralToClipboard } from '@/shared/utils/referralClipboard';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function InvitePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  // Live, not captured once — this page has to keep working if the user scans/taps
  // a *different* colleague's link while still sitting on this screen (e.g. adding
  // several people in a row at a conference). React Router keeps the same
  // InvitePage instance mounted across /invite?ref=A -> /invite?ref=B, it doesn't
  // remount, so a captured-once ref would get stuck showing the first one forever.
  const ref = (searchParams.get('ref') || '').toUpperCase();
  const [status, setStatus] = useState<'loading' | 'done' | 'already' | 'self' | 'error' | 'store'>('loading');
  // Which ref we've already processed (or are processing) — lets us tell "the
  // query string was cleared after a successful add" (ignore) apart from "a new
  // ref showed up" (process it), and stops a redelivered app-link event from
  // re-submitting the same one.
  const processedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ref) {
      // Only bounce to '/' for a bare /invite visit — not right after we clear
      // ?ref= ourselves once a code was successfully handled.
      if (!processedRef.current && !loading) navigate('/');
      return;
    }
    if (ref === processedRef.current) return; // already handled this exact code

    localStorage.setItem('referral_code', ref);
    if (loading) return; // esperar a que AuthContext termine de cargar

    if (!isAuthenticated) {
      // Tapped from a phone's browser, not from inside the app — the OS only lands
      // here (instead of opening the app directly via App/Universal Links) when the
      // app isn't installed. Send them to install it first instead of signing up on
      // mobile web: once installed, re-tapping this same link/QR opens the app
      // directly (App Links are verified) and connects them automatically, no
      // native deep-link plumbing needed. Desktop and in-app native views are
      // unaffected — this only fires for a bare mobile browser.
      if (!Capacitor.isNativePlatform() && isMobileWeb()) {
        setStatus('store');
        return;
      }
      navigate(`/signup?ref=${ref}`);
      return;
    }

    processedRef.current = ref;
    setStatus('loading');

    // Crear amistad directamente (el backend también contempla el caso de que
    // sea tu propio código y devuelve {ok:true, self:true} en vez de un error)
    authService.authenticatedFetch(`${API_URL}/api/auth/accept-invite/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friend_code: ref }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.self) setStatus('self');
        else setStatus(data.ok ? (data.created ? 'done' : 'already') : 'error');
      })
      .catch(() => setStatus('error'))
      .finally(() => {
        // Strip ?ref= once handled — a redelivered app-link event (Capacitor can
        // fire the same one more than once) or any other remount then lands on a
        // plain /invite with nothing left to reprocess, instead of re-submitting
        // the same code and re-running this whole effect again.
        setSearchParams({}, { replace: true });
      });
  }, [loading, isAuthenticated, ref]);

  // Best-effort: copy the code to the clipboard so the app can pick it up
  // silently once installed (see referralClipboard.ts) — then redirect.
  // Always redirects even if the clipboard write fails/is denied.
  const goToStore = () => {
    writeReferralToClipboard(ref).finally(() => {
      window.location.href = storeUrlForDevice();
    });
  };

  // Auto-redirect to the store — the screen below still renders as a fallback
  // (and keeps a manual button) in case the browser blocks a programmatic
  // top-level navigation right on mount.
  useEffect(() => {
    if (status !== 'store') return;
    goToStore();
  }, [status]);

  if (status === 'store') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full bg-card border rounded-2xl p-8 text-center shadow-lg space-y-4">
          <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto">
            <Download className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Descargá la app para conectarte</h1>
          <p className="text-muted-foreground text-sm">
            Te estamos llevando a la tienda para instalar MeDico App. Una vez instalada, volvé a abrir este mismo link o QR y quedarás conectado con tu colega automáticamente.
          </p>
          <Button className="w-full" onClick={goToStore}>
            Ir a la tienda
          </Button>
          <button
            onClick={() => navigate(`/signup?ref=${ref}`)}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Prefiero registrarme desde el navegador
          </button>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full bg-card border rounded-2xl p-8 text-center shadow-lg space-y-4">
        {(status === 'done' || status === 'already') && (
          <>
            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full w-fit mx-auto">
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold">
              {status === 'done' ? '¡Ya son colegas!' : 'Ya eran colegas'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {status === 'done'
                ? 'Quedaron conectados automáticamente.'
                : 'Ya estaban conectados como colegas.'}
            </p>
          </>
        )}
        {status === 'self' && (
          <>
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit mx-auto">
              <Share2 className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold">Este es tu propio link</h1>
            <p className="text-muted-foreground text-sm">
              Compartilo con un colega para conectarse — no podés agregarte a vos mismo.
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full w-fit mx-auto">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold">Link inválido</h1>
            <p className="text-muted-foreground text-sm">El código de invitación no es válido.</p>
          </>
        )}
        <Button className="w-full" onClick={() => navigate('/colleagues')}>
          Ver mis colegas
        </Button>
      </div>
    </div>
  );
}
