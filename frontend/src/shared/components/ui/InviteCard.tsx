import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';
import { Button } from './button';

interface InviteCardProps {
  friendCode: string;
}

export function InviteCard({ friendCode }: InviteCardProps) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `https://medicoapp.app/invite?ref=${friendCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
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
