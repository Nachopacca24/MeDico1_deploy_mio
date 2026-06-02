import { useState, useEffect } from 'react';
import { uploadStore } from '@/shared/stores/uploadStore';

export function useIsUploading(caseId: number): boolean {
  const [uploading, setUploading] = useState(() => uploadStore.has(caseId));
  useEffect(() => {
    setUploading(uploadStore.has(caseId));
    const unsub = uploadStore.subscribe(() => setUploading(uploadStore.has(caseId)));
    return () => { unsub(); };
  }, [caseId]);
  return uploading;
}
