// Página de invitación: maneja el link ?ref=FRIEND_CODE
// - Si no está logueado: guarda el código y manda al signup
// - Si ya está logueado: envía solicitud de colega directo

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { colleaguesService } from '@/services/colleaguesService';
import { Loader2, UserCheck, UserPlus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const ref = searchParams.get('ref') || '';

  const [status, setStatus] = useState<'loading' | 'confirm' | 'sending' | 'done' | 'error' | 'already'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!ref) { navigate('/'); return; }

    if (!isAuthenticated) {
      // Guardar código y mandar al signup
      localStorage.setItem('referral_code', ref);
      navigate(`/signup?ref=${ref}`);
      return;
    }

    // Ya logueado: si el código es el propio, redirigir
    if (user?.friend_code === ref) {
      navigate('/colleagues');
      return;
    }

    setStatus('confirm');
  }, [isAuthenticated, ref]);

  const handleSendRequest = async () => {
    setStatus('sending');
    try {
      await colleaguesService.sendFriendRequest(ref);
      setStatus('done');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('ya') || msg.includes('exist') || msg.includes('already')) {
        setStatus('already');
      } else {
        setErrorMsg(msg || 'No se pudo enviar la solicitud.');
        setStatus('error');
      }
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full bg-card border rounded-2xl p-8 text-center shadow-lg space-y-6">
        <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto">
          <UserPlus className="h-8 w-8 text-primary" />
        </div>

        {status === 'confirm' && (
          <>
            <div>
              <h1 className="text-xl font-bold mb-2">Invitación de colega</h1>
              <p className="text-muted-foreground text-sm">
                Alguien te invitó a conectarse como colega en MeDico App. ¿Querés enviarle una solicitud?
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/colleagues')}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSendRequest}>
                Conectar
              </Button>
            </div>
          </>
        )}

        {status === 'sending' && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Enviando solicitud...</span>
          </div>
        )}

        {status === 'done' && (
          <>
            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full w-fit mx-auto">
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold mb-2">¡Solicitud enviada!</h1>
              <p className="text-muted-foreground text-sm">
                Cuando acepte, quedarán conectados como colegas.
              </p>
            </div>
            <Button className="w-full" onClick={() => navigate('/colleagues')}>
              Ver mis colegas
            </Button>
          </>
        )}

        {status === 'already' && (
          <>
            <div>
              <h1 className="text-xl font-bold mb-2">Ya son colegas</h1>
              <p className="text-muted-foreground text-sm">
                Ya estás conectado con este médico.
              </p>
            </div>
            <Button className="w-full" onClick={() => navigate('/colleagues')}>
              Ver mis colegas
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div>
              <h1 className="text-xl font-bold mb-2">Algo salió mal</h1>
              <p className="text-muted-foreground text-sm">{errorMsg}</p>
            </div>
            <Button className="w-full" onClick={() => navigate('/colleagues')}>
              Ir a colegas
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
