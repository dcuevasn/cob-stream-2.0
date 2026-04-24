import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'quick-widen-bps';
const DEFAULT_BPS = 5;
const MIN_BPS = 0.1;
const MAX_BPS = 100;

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notifyAll() {
  listeners.forEach((cb) => cb());
}

function getSnapshot(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return DEFAULT_BPS;
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? DEFAULT_BPS : parsed;
}

/**
 * Shared hook for the "Quick widen" (Shift+X) bps increment preference.
 * Mirrors useSpreadStepSize: localStorage-backed, synced across components.
 */
export function useQuickWidenBps() {
  const quickWidenBps = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_BPS);

  const updateQuickWidenBps = useCallback((value: number) => {
    const clamped = Math.min(MAX_BPS, Math.max(MIN_BPS, value));
    const rounded = Math.round(clamped * 1000) / 1000;
    localStorage.setItem(STORAGE_KEY, String(rounded));
    notifyAll();
  }, []);

  return { quickWidenBps, updateQuickWidenBps, MIN_BPS, MAX_BPS } as const;
}
