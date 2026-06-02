import { useState, useEffect } from 'react';
import { uploadStore } from '@/shared/stores/uploadStore';

export function useIsUploading(caseId: number): boolean {
  const [uploading, setUploading] = useState(() => uploadStore.has(caseId));
  useEffect(() => {
    setUploading(uploadStore.has(caseId));
    return uploadStore.subscribe(() => setUploading(uploadStore.has(caseId)));
  }, [caseId]);
  return uploading;
}
