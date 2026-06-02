// Simple reactive store to track cases with images uploading in background
type Listener = () => void;

const uploadingCaseIds = new Set<number>();
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(fn => fn());
}

export const uploadStore = {
  add(id: number) {
    uploadingCaseIds.add(id);
    notify();
  },
  remove(id: number) {
    uploadingCaseIds.delete(id);
    notify();
  },
  has(id: number) {
    return uploadingCaseIds.has(id);
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
