import { useState } from "react";
import { Star, Calculator, StarOff } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from "@/shared/hooks/use-toast";
import { fine } from "@/shared/lib/fine";
import { useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib/utils";
import type { Schema } from "@/shared/lib/db-types";

interface OperationCardProps {
  operation: Schema["operations"] & { specialtyName?: string };
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
}

export function OperationCard({ 
  operation, 
  isFavorite = false,
  onFavoriteToggle
}: OperationCardProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: session } = fine.auth.useSession();

  const handleFavoriteToggle = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      if (isFavorite) {
        // Remove from favorites
        await fine.table("favorites")
          .delete()
          .eq("userId", session.user.id)
          .eq("operationId", operation.id!);
        
        toast({
          title: "Removed from favorites",
          description: `${operation.name} has been removed from your favorites.`
        });
      } else {
        // Add to favorites
        await fine.table("favorites").insert({
          userId: session.user.id,
          operationId: operation.id!
        });
        
        toast({
          title: "Added to favorites",
          description: `${operation.name} has been added to your favorites.`
        });
      }
      
      if (onFavoriteToggle) {
        onFavoriteToggle();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = () => {
    navigate(`/calculator?operationId=${operation.id}`);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{operation.name}</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleFavoriteToggle}
            disabled={loading}
          >
            {isFavorite ? (
              <StarOff className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Star className="h-5 w-5 text-yellow-500" />
            )}
          </Button>
        </div>
        {operation.code && (
          <Badge variant="outline" className="mt-1">
            Code: {operation.code}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pb-2">
        {operation.description ? (
          <p className="text-sm text-muted-foreground">{operation.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No description available</p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="secondary">
            {operation.basePoints} points
          </Badge>
          {operation.specialtyName && (
            <Badge variant="outline" className="bg-primary/10">
              {operation.specialtyName}
            </Badge>
          )}
          {operation.complexity && (
            <Badge 
              variant="outline" 
              className={cn(
                "ml-auto",
                operation.complexity === 1 && "bg-green-500/10 text-green-700",
                operation.complexity === 2 && "bg-yellow-500/10 text-yellow-700",
                operation.complexity === 3 && "bg-orange-500/10 text-orange-700",
                operation.complexity === 4 && "bg-red-500/10 text-red-700",
                operation.complexity === 5 && "bg-purple-500/10 text-purple-700"
              )}
            >
              {operation.complexity === 1 && "Simple"}
              {operation.complexity === 2 && "Moderate"}
              {operation.complexity === 3 && "Complex"}
              {operation.complexity === 4 && "Very Complex"}
              {operation.complexity === 5 && "Extremely Complex"}
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleCalculate}
          variant="default"
        >
          <Calculator className="mr-2 h-4 w-4" />
          Calculate Value
        </Button>
      </CardFooter>
    </Card>
  );
}
