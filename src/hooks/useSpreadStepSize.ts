import { useState, useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'spread-step-size';
const DEFAULT_STEP = 0.1;
const MIN_STEP = 0.001;
const MAX_STEP = 10;

/**
 * Listeners for cross-component synchronisation of step size changes.
 * When one popover updates the step size, all others pick up the change
 * via useSyncExternalStore.
 */
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
  if (raw === null) return DEFAULT_STEP;
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? DEFAULT_STEP : parsed;
}

/**
 * Shared hook that reads/writes the spread step size to `localStorage`.
 *
 * - Default: 0.1 bps
 * - Range: [0.001, 10] bps
 * - Persists across sessions via localStorage
 * - Synchronises across all mounted instances via useSyncExternalStore
 */
export function useSpreadStepSize() {
  const stepSize = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_STEP);

  const updateStepSize = useCallback((value: number) => {
    const clamped = Math.min(MAX_STEP, Math.max(MIN_STEP, value));
    const rounded = Math.round(clamped * 1000) / 1000;
    localStorage.setItem(STORAGE_KEY, String(rounded));
    notifyAll();
  }, []);

  return { stepSize, updateStepSize } as const;
}
