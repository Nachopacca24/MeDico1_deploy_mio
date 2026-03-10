import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import type { Schema } from "@/shared/lib/db-types";

interface HospitalSelectorProps {
  onSelect: (hospitalId: number) => void;
  selectedId?: number;
}

export function HospitalSelector({ onSelect, selectedId }: HospitalSelectorProps) {
  const [open, setOpen] = useState(false);
  const [hospitals, setHospitals] = useState<Schema["hospitals"][]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredHospitals, setFilteredHospitals] = useState<Schema["hospitals"][]>([]);

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        // TODO: Implementar fetch de hospitales desde Django API
        setHospitals([]);
        setFilteredHospitals([]);
      } catch (error) {
        console.error("Failed to fetch hospitals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = hospitals.filter(hospital => 
        hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (hospital.location && hospital.location.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredHospitals(filtered);
    } else {
      setFilteredHospitals(hospitals);
    }
  }, [searchQuery, hospitals]);

  const selectedHospital = hospitals.find(h => h.id === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={loading}
        >
          {selectedId && selectedHospital
            ? selectedHospital.name
            : "Select hospital"}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="p-2">
          <Input
            placeholder="Search hospital..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-[300px] overflow-y-auto">
            {filteredHospitals.length === 0 ? (
              <div className="p-2 text-center text-sm text-muted-foreground">
                No hospital found.
              </div>
            ) : (
              filteredHospitals.map((hospital) => (
                <div
                  key={hospital.id}
                  className={cn(
                    "flex cursor-pointer items-center rounded-md px-2 py-2 text-sm",
                    selectedId === hospital.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                  )}
                  onClick={() => {
                    onSelect(hospital.id!);
                    setOpen(false);
                  }}
                >
                  <div className="flex-1">
                    {hospital.name}
                    {hospital.location && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({hospital.location})
                      </span>
                    )}
                  </div>
                  {selectedId === hospital.id && (
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}