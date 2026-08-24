import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Gift, Sparkles } from 'lucide-react';
import { Button } from './button';

export interface ReferralStats {
  count: number;
  progress: number;
  threshold: number;
  rewards_given: number;
  reward_days: number;
}

interface InviteCardProps {
  friendCode: string;
  stats?: ReferralStats | null;
  isFreeForAllPromo?: boolean;
  // Read straight from the user's credit_days column — not derived from
  // stats.rewards_given * stats.reward_days — so this always reflects the
  // actual banked balance even if the threshold/reward-days config ever
  // changes after some of it was already earned. It's also what gets
  // zeroed out server-side once the promo ends and the days get applied.
  creditDays?: number;
}

export function InviteCard({ friendCode, stats, isFreeForAllPromo, creditDays }: InviteCardProps) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `https://medicoapp.app/invite?ref=${friendCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Promo banner */}
      {stats && (
        <div className="relative overflow-hidden rounded-lg p-4 bg-amber-400">
          {/* Efecto de brillo animado */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-4 w-4 text-amber-900 shrink-0" />
            <span className="text-sm font-bold text-amber-900">Promoción: invitá médicos y ganá días gratis</span>
          </div>
          <p className="text-xs text-amber-900 mb-3">
            Por cada {stats.threshold} médicos que se registren con tu link, te sumamos <strong>{stats.reward_days} días Premium</strong> gratis — repetible e ilimitado. Seguí invitando y seguís ganando días.
          </p>
          {/* Contador de días acumulados — crece de a stats.reward_days por vez */}
          {!!creditDays && creditDays > 0 && (
            <div className="flex items-center gap-2 mb-3 bg-amber-900/10 rounded-md px-3 py-2">
              <Sparkles className="h-4 w-4 text-amber-900 shrink-0" />
              <span className="text-sm font-bold text-amber-900">
                Ya tenés {creditDays} días Premium acumulados
              </span>
            </div>
          )}
          {/* Barra de progreso */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-amber-900/80">
              <span>{stats.progress} de {stats.threshold} médicos</span>
              <span>{stats.threshold - stats.progress} para el próximo premio</span>
            </div>
            <div className="h-2 bg-amber-200/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-900 rounded-full transition-all duration-700"
                style={{ width: `${(stats.progress / stats.threshold) * 100}%` }}
              />
            </div>
          </div>
          {isFreeForAllPromo && (
            <p className="text-xs text-amber-900/80 mt-2 border-t border-amber-900/20 pt-2">
              Los días que ganés ahora se acumulan. Cuando la promo gratuita termine, tu crédito se aplica automáticamente y seguís con Premium sin interrupciones.
            </p>
          )}
          <p className="text-xs text-amber-900/80 mt-2 border-t border-amber-900/20 pt-2">
            <strong>Importante:</strong> para participar en la promoción, el médico invitado debe registrarse inmediatamente después de escanear el QR o abrir el link, para que cuente para tus días de crédito.
          </p>
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
