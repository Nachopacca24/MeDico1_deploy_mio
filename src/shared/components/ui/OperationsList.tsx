//OperationsList.tsx
import { useState, useEffect } from "react";
import { OperationCard } from "@/shared/components/ui/OperationCard";
import { SearchBar } from "@/shared/components/ui/SearchBar";
import { SpecialtyFilter } from "@/shared/components/ui/SpecialtyFilter";
import { useAuth } from "@/shared/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import type { Schema } from "@/shared/lib/db-types";

interface OperationsListProps {
  favoritesOnly?: boolean;
  csvOperations?: any[]; // Datos del CSV
}

export function OperationsList({ favoritesOnly = false, csvOperations }: OperationsListProps) {
  const [operations, setOperations] = useState<(Schema["operations"] & { specialtyName: string; price?: string })[]>([]);
  const [filteredOperations, setFilteredOperations] = useState<(Schema["operations"] & { specialtyName: string; price?: string })[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // TODO: Implementar fetch de operaciones desde Django API
        // Por ahora, solo usar datos del CSV si están disponibles
        const csvMapped = csvOperations?.map((c, index) => ({
          id: -(index + 1),
          name: c.cirugia,
          code: c.codigo,
          specialty_id: 0,
          base_points: parseFloat(c.rvu) || 0,
          description: "",
          complexity: 0,
          specialtyName: c.especialidad,
          price: undefined
        })) || [];

        setOperations(csvMapped);
        setFilteredOperations(csvMapped);
        setFavorites([]);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [csvOperations, user?.id]);

  useEffect(() => {
    // Aplicar filtros
    let filtered = operations;

    if (favoritesOnly) filtered = filtered.filter(op => favorites.includes(op.id!));
    if (selectedSpecialty !== null) filtered = filtered.filter(op => op.specialty_id === selectedSpecialty);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(op =>
        op.name.toLowerCase().includes(query) ||
        (op.code && op.code.toLowerCase().includes(query)) ||
        (op.description && op.description.toLowerCase().includes(query))
      );
    }

    setFilteredOperations(filtered);
  }, [operations, favorites, selectedSpecialty, searchQuery, favoritesOnly]);

  const handleFavoriteToggle = async () => {
    // TODO: Implementar recarga de favoritos desde Django API
    if (user?.id) {
      setFavorites([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="w-full md:w-2/3">
          <SearchBar onSearch={setSearchQuery} />
        </div>
        <div className="w-full md:w-1/3">
          <SpecialtyFilter
            onSelect={setSelectedSpecialty}
            selectedId={selectedSpecialty}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredOperations.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <p className="text-lg font-medium">No operations found</p>
          <p className="text-sm text-muted-foreground">
            {favoritesOnly
              ? "You haven't added any operations to your favorites yet."
              : "Try adjusting your filters or search query."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOperations.map((operation) => (
            <OperationCard
              key={operation.id}
              operation={operation}
              isFavorite={favorites.includes(operation.id!)}
              onFavoriteToggle={handleFavoriteToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
