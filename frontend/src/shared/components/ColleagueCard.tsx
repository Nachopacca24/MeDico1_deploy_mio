// src/components/friendship/ColleagueCard.tsx
import { Colleague } from '@/services/colleaguesService';
import { UserMinus, Mail, Phone, Building2, Stethoscope } from 'lucide-react';

interface ColleagueCardProps {
  colleague: Colleague;
  onRemove: (colleagueId: number) => void;
  isRemoving: boolean;
}

export function ColleagueCard({ colleague, onRemove, isRemoving }: ColleagueCardProps) {
  const avatarUrl = colleague.avatar 
    ? (colleague.avatar.startsWith('http') ? colleague.avatar : `${import.meta.env.VITE_API_URL}${colleague.avatar}`)
    : null;

  return (
    <div className="bg-card border rounded-lg p-6 hover:border-primary transition-all hover:shadow-lg">
      {/* Header con avatar y nombre */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={colleague.full_name}
              className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <span className="text-2xl font-bold text-primary">
                {colleague.first_name?.[0]?.toUpperCase() || colleague.username[0]?.toUpperCase()}
                {colleague.last_name?.[0]?.toUpperCase() || ''}
              </span>
            </div>
          )}
        </div>

        {/* Nombre e info básica - ARREGLADO con break-words */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground break-words">
            {colleague.full_name || colleague.username}
          </h3>
          <p className="text-sm text-muted-foreground break-all">@{colleague.username}</p>
        </div>

        {/* Botón eliminar */}
        <button
          onClick={() => onRemove(colleague.id)}
          disabled={isRemoving}
          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
          title="Eliminar colega"
        >
          {isRemoving ? (
            <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
          ) : (
            <UserMinus className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Detalles del colega - ARREGLADO con break-words y overflow */}
      <div className="space-y-2 text-sm">
        {colleague.specialty && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <Stethoscope className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="break-words flex-1">{colleague.specialty}</span>
          </div>
        )}

        {colleague.hospital_default && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <Building2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="break-words flex-1">{colleague.hospital_default}</span>
          </div>
        )}

        {colleague.email && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <Mail className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="break-all flex-1">{colleague.email}</span>
          </div>
        )}

        {colleague.phone && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <Phone className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="break-words flex-1">{colleague.phone}</span>
          </div>
        )}
      </div>

      {/* Código de amigo */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground flex-shrink-0">Código de colega</span>
          <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">
            {colleague.friend_code}
          </code>
        </div>
      </div>
    </div>
  );
}