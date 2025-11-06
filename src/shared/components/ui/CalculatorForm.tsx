import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HospitalSelector } from "@/shared/components/ui/HospitalSelector";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/hooks/use-toast";
import { useAuth } from "@/shared/contexts/AuthContext";
import { Calculator, Save } from "lucide-react";
import type { Schema } from "@/shared/lib/db-types";

export function CalculatorForm() {
  const [searchParams] = useSearchParams();
  const operationId = searchParams.get("operationId");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [operation, setOperation] = useState<Schema["operations"] & { specialtyName?: string } | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<number | undefined>();
  const [hospitalRate, setHospitalRate] = useState<Schema["hospitalOperationRates"] | null>(null);
  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchOperation = async () => {
      if (!operationId) return;
      
      setLoading(true);
      try {
        // TODO: Implementar fetch de operación desde Django API
        setOperation(null);
        toast({
          title: "Coming Soon",
          description: "Operation details will be loaded from the API soon.",
        });
      } catch (error) {
        console.error("Failed to fetch operation:", error);
        toast({
          title: "Error",
          description: "Failed to load operation details.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOperation();
  }, [operationId, toast]);

  useEffect(() => {
    const fetchHospitalRate = async () => {
      if (!selectedHospital || !operation?.id) return;
      
      try {
        // TODO: Implementar fetch de tarifas desde Django API
        setHospitalRate(null);
      } catch (error) {
        console.error("Failed to fetch hospital rate:", error);
        setHospitalRate(null);
      }
    };

    if (selectedHospital && operation) {
      fetchHospitalRate();
    } else {
      setHospitalRate(null);
      setCalculatedValue(null);
    }
  }, [selectedHospital, operation, toast]);

  const handleCalculate = () => {
    if (!operation || !selectedHospital) {
      toast({
        title: "Missing information",
        description: "Please select both an operation and a hospital.",
        variant: "destructive"
      });
      return;
    }

    setCalculating(true);
    
    try {
      // Calculate based on hospital rate if available, otherwise use default calculation
      let value: number;
      
      if (hospitalRate) {
        value = operation.base_points * hospitalRate.point_value * hospitalRate.currency_per_point;
      } else {
        // Default calculation - this is a simplified version
        // In a real app, you might want to fetch a default rate from the hospital
        const defaultPointValue = 1.0;
        const defaultCurrencyPerPoint = 10.0; // 10 Quetzales per point as default
        value = operation.base_points * defaultPointValue * defaultCurrencyPerPoint;
      }
      
      // Apply complexity multiplier
      const complexityMultiplier = 1 + ((operation.complexity || 1) - 1) * 0.25;
      value = value * complexityMultiplier;
      
      setCalculatedValue(value);
      
      toast({
        title: "Calculation complete",
        description: `The value of this operation is Q${value.toFixed(2)}.`,
      });
    } catch (error) {
      toast({
        title: "Calculation error",
        description: "Failed to calculate operation value.",
        variant: "destructive"
      });
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveCalculation = async () => {
    if (!operation?.id || !selectedHospital || calculatedValue === null || !user?.id) {
      toast({
        title: "Cannot save",
        description: "Please complete the calculation first.",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    try {
      // TODO: Implementar guardado de cálculo en Django API
      toast({
        title: "Coming Soon",
        description: "Save to history will be available soon.",
      });
      
      // navigate("/history");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save calculation.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading operation details...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </CardContent>
      </Card>
    );
  }

  if (!operation && operationId) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Operation not found</CardTitle>
          <CardDescription>
            The operation you're looking for doesn't exist or has been removed.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => navigate("/operations")}>
            Browse Operations
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Operation Value Calculator</CardTitle>
        <CardDescription>
          Calculate the value of medical operations based on hospital rates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {operation ? (
          <div className="rounded-lg bg-primary/5 p-4">
            <h3 className="text-lg font-medium">{operation.name}</h3>
            {operation.code && (
              <p className="text-sm text-muted-foreground">Code: {operation.code}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium">
                {operation.base_points} base points
              </span>
              {operation.specialtyName && (
                <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium">
                  {operation.specialtyName}
                </span>
              )}
              <span className="rounded-full bg-accent px-2 py-1 text-xs font-medium">
                Complexity: {operation.complexity || 1}
              </span>
            </div>
            {operation.description && (
              <p className="mt-2 text-sm">{operation.description}</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-muted-foreground">
              No operation selected. Please select an operation from the operations page.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate("/operations")}
            >
              Browse Operations
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="hospital">Select Hospital</Label>
          <HospitalSelector 
            onSelect={setSelectedHospital} 
            selectedId={selectedHospital}
          />
        </div>

        {calculatedValue !== null && (
          <>
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
              <h3 className="text-lg font-medium text-green-800 dark:text-green-300">
                Calculated Value
              </h3>
              <p className="mt-2 text-3xl font-bold text-green-700 dark:text-green-400">
                Q{calculatedValue.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-green-600 dark:text-green-300">
                {operation?.base_points || 0} points × 
                {hospitalRate ? ` Q${hospitalRate.currency_per_point.toFixed(2)}` : " default rate"} × 
                complexity factor
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this calculation..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:space-x-2 sm:space-y-0">
        <Button
          onClick={handleCalculate}
          disabled={!operation || !selectedHospital || calculating}
          className="w-full sm:w-auto"
        >
          <Calculator className="mr-2 h-4 w-4" />
          {calculating ? "Calculating..." : "Calculate Value"}
        </Button>
        
        {calculatedValue !== null && (
          <Button
            onClick={handleSaveCalculation}
            disabled={saving}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save to History"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}