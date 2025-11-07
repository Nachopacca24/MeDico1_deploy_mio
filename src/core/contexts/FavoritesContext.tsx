import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { favoritesService } from '@/services/favoritesService';

interface FavoritesContextType {
  favorites: Set<string>;
  isLoading: boolean;
  refreshFavorites: () => Promise<void>;
  toggleFavorite: (code: string, name: string, specialty: string) => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const loadFavorites = async () => {
    try {
      const codes = await favoritesService.getFavoriteCodes();
      setFavorites(codes);
    } catch (error) {
      setFavorites(new Set());
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFavorites = async () => {
    await loadFavorites();
  };

  const toggleFavorite = async (code: string, name: string, specialty: string): Promise<boolean> => {
    const normalizedCode = String(code).trim();
    
    try {
      const result = await favoritesService.toggleFavorite({
        surgery_code: normalizedCode,
        surgery_name: name,
        specialty: specialty,
      });

      // Recargar desde el servidor para asegurar sincronización
      await loadFavorites();

      return result.is_favorite;
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  return (
    <FavoritesContext.Provider value={{ favorites, isLoading, refreshFavorites, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
