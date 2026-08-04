// Generic loading placeholder for edit/new forms that fetch data before rendering.
// Mirrors the pulsing-bar style already used by CaseCardSkeleton in cases.tsx.
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

function SkeletonField() {
  return (
    <div className="space-y-1.5">
      <div className="h-3 w-20 rounded bg-muted-foreground/20" />
      <div className="h-9 w-full rounded-md bg-muted-foreground/10" />
    </div>
  );
}

function SkeletonSection({ fields = 3 }: { fields?: number }) {
  return (
    <Card className="animate-pulse">
      <CardHeader className="space-y-1.5">
        <div className="h-4 w-40 rounded bg-muted-foreground/20" />
        <div className="h-3 w-56 rounded bg-muted-foreground/15" />
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <SkeletonField key={i} />
        ))}
      </CardContent>
    </Card>
  );
}

export function FormSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: sections }).map((_, i) => (
        <SkeletonSection key={i} />
      ))}
    </div>
  );
}
