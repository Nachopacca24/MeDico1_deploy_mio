import { useState, useEffect } from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { fine } from "@/shared/lib/fine";
import { SearchBar } from "@/shared/components/ui/SearchBar";
import { Loader2, Calculator, Trash2 } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";

const History = () => {
  const [calculations, setCalculations] = useState<any[]>([]);
  const [filteredCalculations, setFilteredCalculations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: session } = fine.auth.useSession();

  useEffect(() => {
    const fetchCalculations = async () => {
      if (!session?.user?.id) return;
      
      setLoading(true);
      try {
        // Get calculation history
        const historyData = await fine.table("calculationHistory")
          .select("*")
          .eq("userId", session.user.id)
          .order("calculatedAt", { ascending: false });
        
        if (historyData && historyData.length > 0) {
          // Get operations
          const operationIds = historyData.map(h => h.operationId);
          const operations = await fine.table("operations")
            .select("id, name, code")
            .in("id", operationIds);
          
          // Get hospitals
          const hospitalIds = historyData.map(h => h.hospitalId);
          const hospitals = await fine.table("hospitals")
            .select("id, name")
            .in("id", hospitalIds);
          
          // Map the data
          const mappedData = historyData.map(calc => {
            const operation = operations?.find(o => o.id === calc.operationId);
            const hospital = hospitals?.find(h => h.id === calc.hospitalId);
            
            return {
              ...calc,
              operationName: operation?.name || "Unknown Operation",
              operationCode: operation?.code || null,
              hospitalName: hospital?.name || "Unknown Hospital"
            };
          });
          
          setCalculations(mappedData);
          setFilteredCalculations(mappedData);
        } else {
          setCalculations([]);
          setFilteredCalculations([]);
        }
      } catch (error) {
        console.error("Failed to fetch calculation history:", error);
        toast({
          title: "Error",
          description: "Failed to load calculation history.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCalculations();
  }, [session?.user?.id, toast]);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = calculations.filter(calc => 
        calc.operationName.toLowerCase().includes(query) ||
        (calc.operationCode && calc.operationCode.toLowerCase().includes(query)) ||
        calc.hospitalName.toLowerCase().includes(query) ||
        (calc.notes && calc.notes.toLowerCase().includes(query))
      );
      setFilteredCalculations(filtered);
    } else {
      setFilteredCalculations(calculations);
    }
  }, [searchQuery, calculations]);

  const handleDelete = async (id: number) => {
    try {
      await fine.table("calculationHistory").delete().eq("id", id);
      
      setCalculations(prev => prev.filter(calc => calc.id !== id));
      
      toast({
        title: "Deleted",
        description: "Calculation record has been removed from history.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete calculation record.",
        variant: "destructive"
      });
    }
  };

  const handleRecalculate = (operationId: number) => {
    navigate(`/calculator?operationId=${operationId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-GT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calculation History</h1>
          <p className="text-muted-foreground">
            View your past operation valuations
          </p>
        </div>

        <div className="w-full md:w-1/2">
          <SearchBar 
            onSearch={setSearchQuery}
            placeholder="Search by operation, hospital, or notes..."
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCalculations.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center p-6 text-center">
                <p className="text-lg font-medium">No calculation history found</p>
                <p className="text-sm text-muted-foreground">
                  {calculations.length === 0
                    ? "You haven't performed any calculations yet."
                    : "No results match your search criteria."}
                </p>
                {calculations.length === 0 && (
                  <Button 
                    className="mt-4"
                    onClick={() => navigate("/calculator")}
                  >
                    Start Calculating
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation</TableHead>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCalculations.map((calc) => (
                      <TableRow key={calc.id}>
                        <TableCell className="font-medium">
                          {calc.operationName}
                          {calc.operationCode && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({calc.operationCode})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{calc.hospitalName}</TableCell>
                        <TableCell className="font-mono">
                          Q{calc.calculatedValue.toFixed(2)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(calc.calculatedAt)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {calc.notes || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRecalculate(calc.operationId)}
                              title="Recalculate"
                            >
                              <Calculator className="h-4 w-4" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete calculation record?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this
                                    calculation record from your history.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(calc.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default History;