// Debug page para verificar API de favoritos
import { useState } from 'react';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { favoritesService } from '@/services/favoritesService';
import { authService } from '@/shared/services/authService';

export default function DebugFavorites() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testGetFavorites = async () => {
    setLoading(true);
    try {
      console.log('🧪 [DEBUG] Iniciando test de getFavorites...');
      const favorites = await favoritesService.getFavorites();
      console.log('✅ [DEBUG] Resultado:', favorites);
      setResult({
        success: true,
        data: favorites,
        count: Array.isArray(favorites) ? favorites.length : 'No es array',
        type: Array.isArray(favorites) ? 'array' : typeof favorites
      });
    } catch (error: any) {
      console.error('❌ [DEBUG] Error:', error);
      setResult({
        success: false,
        error: error.message,
        stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  const testGetFavoriteCodes = async () => {
    setLoading(true);
    try {
      console.log('🧪 [DEBUG] Iniciando test de getFavoriteCodes...');
      const codes = await favoritesService.getFavoriteCodes();
      console.log('✅ [DEBUG] Resultado:', codes);
      setResult({
        success: true,
        data: Array.from(codes),
        count: codes.size,
        type: 'Set'
      });
    } catch (error: any) {
      console.error('❌ [DEBUG] Error:', error);
      setResult({
        success: false,
        error: error.message,
        stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  const testAuth = () => {
    const token = authService.getAccessToken();
    const user = authService.getCurrentUser();
    const isAuth = authService.isAuthenticated();
    
    setResult({
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : null,
      user: user,
      isAuthenticated: isAuth
    });
  };

  const testToggleFavorite = async () => {
    setLoading(true);
    try {
      console.log('🧪 [DEBUG] Iniciando test de toggle...');
      const result = await favoritesService.toggleFavorite({
        surgery_code: 'TEST123',
        surgery_name: 'Test Surgery',
        specialty: 'Test Specialty'
      });
      console.log('✅ [DEBUG] Resultado:', result);
      setResult({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('❌ [DEBUG] Error:', error);
      setResult({
        success: false,
        error: error.message,
        stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 shadow-lg">
          <h1 className="text-3xl font-bold text-white">🔍 Debug de Favoritos</h1>
          <p className="text-purple-100 mt-2">Herramienta de diagnóstico para API de favoritos</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={testAuth}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg font-semibold"
            disabled={loading}
          >
            🔑 Test Autenticación
          </button>

          <button
            onClick={testGetFavorites}
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg font-semibold"
            disabled={loading}
          >
            📥 Test getFavorites()
          </button>

          <button
            onClick={testGetFavoriteCodes}
            className="bg-yellow-600 hover:bg-yellow-700 text-white p-4 rounded-lg font-semibold"
            disabled={loading}
          >
            🔢 Test getFavoriteCodes()
          </button>

          <button
            onClick={testToggleFavorite}
            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg font-semibold"
            disabled={loading}
          >
            🔄 Test toggleFavorite()
          </button>
        </div>

        {loading && (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-blue-700">Ejecutando test...</p>
          </div>
        )}

        {result && (
          <div className={`rounded-lg p-6 ${result.success === false ? 'bg-red-50 border-2 border-red-300' : 'bg-green-50 border-2 border-green-300'}`}>
            <h2 className="text-xl font-bold mb-4">Resultado:</h2>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-sm">
          <h3 className="font-bold mb-2">📋 Información del Sistema:</h3>
          <ul className="space-y-1 text-gray-700">
            <li>• API Base URL: http://localhost:8000/api/v1/medico/favorites</li>
            <li>• Token en localStorage: {localStorage.getItem('medico_access_token') ? '✅ Sí' : '❌ No'}</li>
            <li>• Usuario guardado: {localStorage.getItem('medico_user') ? '✅ Sí' : '❌ No'}</li>
            <li>• Refresh token: {localStorage.getItem('medico_refresh_token') ? '✅ Sí' : '❌ No'}</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-sm">
          <h3 className="font-bold mb-2">⚠️ Instrucciones:</h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>Primero haz click en "Test Autenticación" para verificar que estés logueado</li>
            <li>Luego prueba "Test getFavorites()" para ver si la API responde</li>
            <li>Verifica los logs en la consola del navegador (F12)</li>
            <li>Si hay errores, copia el mensaje completo</li>
          </ol>
        </div>
      </div>
    </AppLayout>
  );
}
