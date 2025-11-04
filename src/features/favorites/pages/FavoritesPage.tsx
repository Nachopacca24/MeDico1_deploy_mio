import { AppLayout } from "@/shared/components/layout/AppLayout";
import { OperationsList } from "@/shared/components/ui/OperationsList";

const Favorites = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Favorite Operations</h1>
          <p className="text-muted-foreground">
            Quick access to your saved medical procedures
          </p>
        </div>

        <OperationsList favoritesOnly={true} />
      </div>
    </AppLayout>
  );
};

export default Favorites;