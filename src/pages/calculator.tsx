import { AppLayout } from "@/shared/components/layout/AppLayout";
import { CalculatorForm } from "@/shared/components/ui/CalculatorForm";

const Calculator = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operation Value Calculator</h1>
          <p className="text-muted-foreground">
            Calculate the value of medical procedures based on hospital rates
          </p>
        </div>

        <CalculatorForm />
      </div>
    </AppLayout>
  );
};

export default Calculator;