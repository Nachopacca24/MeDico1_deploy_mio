import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, QrCode, X } from 'lucide-react';
import { Button } from './button';

interface InviteCardProps {
  friendCode: string;
}

export function InviteCard({ friendCode }: InviteCardProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const inviteUrl = `https://medicoapp.app/invite?ref=${friendCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Compartí este link — quien se registre quedará conectado con vos automáticamente como colega.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteUrl}
            className="flex-1 text-sm bg-muted border border-border rounded-md px-3 py-2 text-muted-foreground min-w-0"
          />
          <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowQR(true)} className="shrink-0">
            <QrCode className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white dark:bg-card rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-xs w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full">
              <h3 className="font-semibold text-lg">Tu QR de invitación</h3>
              <button onClick={() => setShowQR(false)} className="p-1 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-white p-4 rounded-xl border">
              <QRCodeSVG value={inviteUrl} size={200} includeMargin={false} />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Escaneá con la cámara para unirte como colega
            </p>
          </div>
        </div>
      )}
    </>
  );
}
