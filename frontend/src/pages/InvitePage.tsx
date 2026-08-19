import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { authService } from '@/shared/services/authService';
import { Loader2, UserCheck, AlertCircle, Share2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function InvitePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  // Captured once — clearing ?ref= below (after processing) must not change this
  // and re-trigger the effect with an empty ref, which would bounce to '/'.
  const ref = useRef((searchParams.get('ref') || '').toUpperCase()).current;
  const [status, setStatus] = useState<'loading' | 'done' | 'already' | 'self' | 'error'>('loading');

  useEffect(() => {
    // Guardar el código inmediatamente, antes de saber si está autenticado
    if (ref) localStorage.setItem('referral_code', ref);

    if (loading) return; // esperar a que AuthContext termine de cargar
    if (!ref) { navigate('/'); return; }

    if (!isAuthenticated) {
      navigate(`/signup?ref=${ref}`);
      return;
    }

    if (user?.friend_code === ref) {
      navigate('/colleagues');
      return;
    }

    // Crear amistad directamente
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
