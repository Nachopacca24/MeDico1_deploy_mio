import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Gift } from 'lucide-react';
import { Button } from './button';
import { authService } from '@/shared/services/authService';

const API_URL = import.meta.env.VITE_API_URL || '';

interface InviteCardProps {
  friendCode: string;
}

interface ReferralStats {
  count: number;
  progress: number;
  threshold: number;
  rewards_given: number;
  reward_days: number;
}

export function InviteCard({ friendCode }: InviteCardProps) {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const inviteUrl = `https://medicoapp.app/invite?ref=${friendCode}`;

  useEffect(() => {
    authService.authenticatedFetch(`${API_URL}/api/auth/referral-stats/`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Promo banner */}
      {stats && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-primary">Promoción: invitá médicos y ganá días gratis</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Por cada 5 médicos que se registren con tu link, te sumamos <strong>10 días Premium</strong> gratis.
            {stats.rewards_given > 0 && ` Ya ganaste ${stats.rewards_given * 10} días.`}
          </p>
          {/* Barra de progreso */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stats.progress} de {stats.threshold} médicos</span>
              <span>{stats.threshold - stats.progress} para el próximo premio</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(stats.progress / stats.threshold) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Link */}
      <div className="bg-card border rounded-lg p-5">
        <h3 className="font-semibold text-base mb-1">Invitar por link</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Compartí este link — quien lo abra quedará conectado con vos automáticamente.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteUrl}
            className="flex-1 text-sm bg-muted border border-border rounded-md px-3 py-2 text-muted-foreground min-w-0"
          />
          <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0 gap-1.5">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </div>

      {/* QR */}
      <div className="bg-card border rounded-lg p-5">
        <h3 className="font-semibold text-base mb-1">Código QR</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Mostrá este QR para que escaneen con la cámara y queden conectados.
        </p>
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-xl border inline-block">
            <QRCodeSVG value={inviteUrl} size={180} includeMargin={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
