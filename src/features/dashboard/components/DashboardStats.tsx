import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { fine } from "@/shared/lib/fine";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2 } from "lucide-react";

export function DashboardStats() {
  const [recentCalculations, setRecentCalculations] = useState<any[]>([]);
  const [specialtyStats, setSpecialtyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = fine.auth.useSession();
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!session?.user?.id) return;
      
      setLoading(true);
      try {
        // Fetch recent calculations
        const historyData = await fine.table("calculationHistory")
          .select("*")
          .eq("userId", session.user.id)
          .order("calculatedAt", { ascending: false })
          .limit(5);
        
        if (historyData && historyData.length > 0) {
          // Fetch operation names
          const operationIds = historyData.map(h => h.operationId);
          const operations = await fine.table("operations")
            .select("id, name")
            .in("id", operationIds);
          
          // Fetch hospital names
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
              hospitalName: hospital?.name || "Unknown Hospital"
            };
          });
          
          setRecentCalculations(mappedData);
        }
        
        // For specialty stats, we'll need to do multiple queries
        // First get all calculations by this user
        const allCalculations = await fine.table("calculationHistory")
          .select("operationId")
          .eq("userId", session.user.id);
        
        if (allCalculations && allCalculations.length > 0) {
          // Get all operations
          const operationIds = allCalculations.map(c => c.operationId);
          const operations = await fine.table("operations")
            .select("id, specialtyId")
            .in("id", operationIds);
          
          // Count by specialty
          const specialtyCounts: Record<number, number> = {};
          operations?.forEach(op => {
            if (specialtyCounts[op.specialtyId]) {
              specialtyCounts[op.specialtyId]++;
            } else {
              specialtyCounts[op.specialtyId] = 1;
            }
          });
          
          // Get specialty names
          const specialtyIds = Object.keys(specialtyCounts).map(Number);
          const specialties = await fine.table("specialties")
            .select("id, name")
            .in("id", specialtyIds);
          
          // Create the final stats array
          const stats = specialties?.map(specialty => ({
            specialtyName: specialty.name,
            calculationCount: specialtyCounts[specialty.id] || 0
          })) || [];
          
          // Sort by count descending
          stats.sort((a, b) => b.calculationCount - a.calculationCount);
          
          setSpecialtyStats(stats.slice(0, 5)); // Take top 5
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [session?.user?.id]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="col-span-2 md:col-span-1">
        <CardHeader>
          <CardTitle>Recent Calculations</CardTitle>
          <CardDescription>Your last 5 operation valuations</CardDescription>
        </CardHeader>
        <CardContent>
          {recentCalculations.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No calculations yet. Start by calculating an operation value.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recentCalculations}>
                  <XAxis 
                    dataKey="operationName" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                  />
                  <YAxis 
                    tickFormatter={(value) => `Q${value}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`Q${value}`, 'Value']}
                    labelFormatter={(label) => `Operation: ${label}`}
                  />
                  <Bar dataKey="calculatedValue" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="col-span-2 md:col-span-1">
        <CardHeader>
          <CardTitle>Specialty Distribution</CardTitle>
          <CardDescription>Calculations by medical specialty</CardDescription>
        </CardHeader>
        <CardContent>
          {specialtyStats.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No data available. Calculate operations from different specialties.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={specialtyStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="calculationCount"
                    nameKey="specialtyName"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {specialtyStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} calculations`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}