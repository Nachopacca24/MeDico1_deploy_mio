// pages/ColleaguesPage.tsx
import { useState, useEffect } from 'react';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { ColleagueCard } from '@/shared/components/ColleagueCard';
import { FriendRequestCard } from '@/shared/components/FriendRequestCard';
import { 
  colleaguesService, 
  Colleague, 
  FriendRequest,
  SearchColleagueResponse 
} from '@/services/colleaguesService';
import { 
  Users, 
  UserPlus, 
  Search, 
  AlertCircle, 
  CheckCircle,
  Inbox,
  Send,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';

export default function ColleaguesPage() {
  const { user } = useAuth();
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<SearchColleagueResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'colleagues' | 'received' | 'sent'>('colleagues');
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [colleaguesData, requestsData] = await Promise.all([
        colleaguesService.getColleagues(),
        colleaguesService.getFriendRequests()
      ]);

      setColleagues(colleaguesData.colleagues);
      setReceivedRequests(requestsData.received.requests);
      setSentRequests(requestsData.sent.requests);
    } catch (error: any) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setSearching(true);
    setSearchError('');
    setSearchResult(null);
    setSuccessMessage('');

    try {
      const result = await colleaguesService.searchColleague(searchCode.trim().toUpperCase());
      setSearchResult(result);
    } catch (error: any) {
      setSearchError(error.response?.data?.error || 'Error al buscar colega');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;

    setSendingRequest(true);
    setSearchError('');

    try {
      await colleaguesService.sendFriendRequest(searchResult.friend_code);
      setSuccessMessage('Solicitud enviada correctamente');
      setSearchResult(null);
      setSearchCode('');
      await loadData();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setSearchError(error.response?.data?.error || 'Error al enviar solicitud');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    setProcessingRequestId(requestId);
    try {
      await colleaguesService.acceptFriendRequest(requestId);
      setSuccessMessage('Solicitud aceptada correctamente');
      await loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al aceptar solicitud');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    setProcessingRequestId(requestId);
    try {
      await colleaguesService.rejectFriendRequest(requestId);
      setSuccessMessage('Solicitud rechazada');
      await loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al rechazar solicitud');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRemoveColleague = async (colleagueId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este colega?')) return;

    setRemovingId(colleagueId);
    try {
      await colleaguesService.removeColleague(colleagueId);
      setSuccessMessage('Colega eliminado correctamente');
      await loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al eliminar colega');
    } finally {
      setRemovingId(null);
    }
  };

  const copyFriendCode = () => {
    if (user?.friend_code) {
      navigator.clipboard.writeText(user.friend_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
            <p className="text-xl font-semibold text-muted-foreground">Cargando...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h1 className="text-3xl font-semibold mb-1 tracking-tight">Mis Colegas</h1>
            <p className="text-muted-foreground">
              Gestiona tu red de colegas médicos
            </p>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-700 dark:text-green-300 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Tu código de colega */}
        <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg mb-1">Tu Código de Colega</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Comparte este código con otros médicos para que puedan agregarte
              </p>
              <div className="flex items-center gap-3">
                <code className="text-2xl font-mono font-bold bg-background px-4 py-2 rounded-lg border-2">
                  {user?.friend_code}
                </code>
                <button
                  onClick={copyFriendCode}
                  className="p-2 hover:bg-background rounded-lg transition-colors"
                  title="Copiar código"
                >
                  {codeCopied ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Buscar colega */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Agregar Nuevo Colega</h2>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                placeholder="Ingresa el código de colega (ej: ABCD12XY)"
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                maxLength={8}
                disabled={searching}
              />
              <button
                type="submit"
                disabled={searching || !searchCode.trim()}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {searching ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Buscar
                  </>
                )}
              </button>
            </div>

            {/* Error de búsqueda */}
            {searchError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{searchError}</p>
              </div>
            )}

            {/* Resultado de búsqueda */}
            {searchResult && (
              <div className="bg-accent/50 border rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {searchResult.avatar ? (
                      <img 
                        src={searchResult.avatar} 
                        alt={searchResult.full_name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                        <span className="text-2xl font-bold text-primary">
                          {searchResult.first_name?.[0]?.toUpperCase() || searchResult.username[0]?.toUpperCase()}
                          {searchResult.last_name?.[0]?.toUpperCase() || ''}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{searchResult.full_name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">@{searchResult.username}</p>
                    {searchResult.specialty && (
                      <p className="text-sm text-muted-foreground">{searchResult.specialty}</p>
                    )}

                    {searchResult.are_friends ? (
                      <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 text-sm text-green-700 dark:text-green-300">
                        Ya son colegas
                      </div>
                    ) : searchResult.pending_request ? (
                      <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2 text-sm text-yellow-700 dark:text-yellow-300">
                        Ya existe una solicitud pendiente
                      </div>
                    ) : (
                      <button
                        onClick={handleSendRequest}
                        disabled={sendingRequest}
                        className="mt-3 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {sendingRequest ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            Enviar Solicitud
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('colleagues')}
              className={`pb-3 px-1 font-medium transition-colors relative ${
                activeTab === 'colleagues'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Colegas ({colleagues.length})
              </div>
              {activeTab === 'colleagues' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('received')}
              className={`pb-3 px-1 font-medium transition-colors relative ${
                activeTab === 'received'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4" />
                Recibidas ({receivedRequests.length})
              </div>
              {activeTab === 'received' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('sent')}
              className={`pb-3 px-1 font-medium transition-colors relative ${
                activeTab === 'sent'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Enviadas ({sentRequests.length})
              </div>
              {activeTab === 'sent' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Contenido de tabs */}
        {activeTab === 'colleagues' && (
          <div>
            {colleagues.length === 0 ? (
              <div className="bg-muted/50 border-2 border-dashed rounded-lg p-16 text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No tienes colegas aún</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Busca y agrega colegas usando su código para empezar a colaborar
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {colleagues.map((colleague) => (
                  <ColleagueCard
                    key={colleague.id}
                    colleague={colleague}
                    onRemove={handleRemoveColleague}
                    isRemoving={removingId === colleague.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'received' && (
          <div>
            {receivedRequests.length === 0 ? (
              <div className="bg-muted/50 border-2 border-dashed rounded-lg p-16 text-center">
                <Inbox className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No tienes solicitudes pendientes</h3>
                <p className="text-muted-foreground">
                  Las solicitudes que recibas aparecerán aquí
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {receivedRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="received"
                    onAccept={handleAcceptRequest}
                    onReject={handleRejectRequest}
                    isProcessing={processingRequestId === request.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sent' && (
          <div>
            {sentRequests.length === 0 ? (
              <div className="bg-muted/50 border-2 border-dashed rounded-lg p-16 text-center">
                <Send className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No has enviado solicitudes</h3>
                <p className="text-muted-foreground">
                  Las solicitudes que envíes aparecerán aquí
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sentRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="sent"
                    isProcessing={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}