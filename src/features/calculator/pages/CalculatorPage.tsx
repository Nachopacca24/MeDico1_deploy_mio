import { AppLayout } from "@/shared/components/layout/AppLayout";
import { CalculatorForm } from "@/features/calculator/components/CalculatorForm";

const CalculatorPage = () => {
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

export default CalculatorPage;
