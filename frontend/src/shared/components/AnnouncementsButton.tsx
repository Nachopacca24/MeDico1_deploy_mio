// src/shared/components/AnnouncementsButton.tsx

import { useState, useEffect } from 'react';
import { Megaphone, X, ChevronDown, ChevronUp } from 'lucide-react';
import { announcementService, type Announcement } from '@/services/announcementService';

export function AnnouncementsButton() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    announcementService.getAnnouncements().then(data => {
      setAnnouncements(data);
      setHasUnread(announcementService.hasUnread(data));
    });
  }, []);

  const handleOpen = () => {
    setOpen(true);
    if (announcements.length) {
      announcementService.markAllSeen(announcements[0].id);
      setHasUnread(false);
    }
  };

  if (!announcements.length && !hasUnread) return null;

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={handleOpen}
        className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
      >
        <Megaphone className="h-4 w-4" />
        Novedades del sistema
        {hasUnread && (
          <>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
            </span>
          </>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Mensajes del equipo MeDico</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1 divide-y divide-border">
              {announcements.map(a => (
                <div key={a.id} className="p-4">
                  <button
                    className="w-full text-left flex items-start justify-between gap-2"
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                  >
                    <div>
                      <p className="font-semibold text-sm">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(a.created_at).toLocaleDateString('es-GT', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </p>
                    </div>
                    {expanded === a.id
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    }
                  </button>
                  {expanded === a.id && (
                    <p className="mt-3 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {a.body}
                    </p>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
