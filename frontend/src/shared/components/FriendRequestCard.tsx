// src/components/friendship/FriendRequestCard.tsx
import { FriendRequest } from '@/services/colleaguesService';
import { Check, X, Clock, Stethoscope, Building2 } from 'lucide-react';

interface FriendRequestCardProps {
  request: FriendRequest;
  type: 'received' | 'sent';
  onAccept?: (requestId: number) => void;
  onReject?: (requestId: number) => void;
  isProcessing: boolean;
}

export function FriendRequestCard({ 
  request, 
  type, 
  onAccept, 
  onReject, 
  isProcessing 
}: FriendRequestCardProps) {
  const user = type === 'received' ? request.from_user : request.to_user;
  const avatarUrl = user.avatar 
    ? (user.avatar.startsWith('http') ? user.avatar : `${import.meta.env.VITE_API_URL}${user.avatar}`)
    : null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Hace menos de 1 hora';
    if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="bg-card border rounded-lg p-5 hover:border-primary/50 transition-all">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={user.full_name}
              className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <span className="text-xl font-bold text-primary">
                {user.first_name?.[0]?.toUpperCase() || user.username[0]?.toUpperCase()}
                {user.last_name?.[0]?.toUpperCase() || ''}
              </span>
            </div>
          )}
        </div>

        {/* Info y acciones */}
        <div className="flex-1 min-w-0">
          {/* Nombre y username */}
          <div className="mb-2">
            <h4 className="font-semibold text-foreground truncate">
              {user.full_name || user.username}
            </h4>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>

          {/* Detalles adicionales */}
          <div className="space-y-1 mb-3 text-sm text-muted-foreground">
            {user.specialty && (
              <div className="flex items-center gap-2">
                <Stethoscope className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{user.specialty}</span>
              </div>
            )}
            {user.hospital_default && (
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{user.hospital_default}</span>
              </div>
            )}
          </div>

          {/* Fecha */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(request.created_at)}</span>
          </div>

          {/* Acciones */}
          {type === 'received' && onAccept && onReject && (
            <div className="flex gap-2">
              <button
                onClick={() => onAccept(request.id)}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="font-medium">Aceptar</span>
                  </>
                )}
              </button>
              <button
                onClick={() => onReject(request.id)}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-destructive/10 hover:bg-destructive/20 text-destructive py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                <span className="font-medium">Rechazar</span>
              </button>
            </div>
          )}

          {type === 'sent' && (
            <div className="bg-muted/50 border border-dashed rounded-lg px-3 py-2 text-xs text-muted-foreground text-center">
              Solicitud pendiente de respuesta
            </div>
          )}
        </div>
      </div>
    </div>
  );
}