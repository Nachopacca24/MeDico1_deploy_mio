// src/components/cases/ReadOnlyBadge.tsx

import { Badge } from '@/shared/components/ui/badge';
import { Lock } from 'lucide-react';

interface ReadOnlyBadgeProps {
  className?: string;
}

export function ReadOnlyBadge({ className = '' }: ReadOnlyBadgeProps) {
  return (
    <Badge 
      variant="secondary" 
      className={`bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 ${className}`}
    >
      <Lock className="w-3 h-3 mr-1" />
      Solo lectura
    </Badge>
  );
}