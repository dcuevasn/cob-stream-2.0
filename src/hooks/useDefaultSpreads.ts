import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'default-spread-values';
const DEFAULT_BID_SPREADS = [0, 1, 2, 3, 4]; // L1-L5 bid default values
const DEFAULT_ASK_SPREADS = [0, -1, -2, -3, -4]; // L1-L5 ask default values (negative)

interface DefaultSpreads {
  bid: number[];
  ask: number[];
}

/**
 * Listeners for cross-component synchronisation of default spread values.
 * When settings are updated, all components pick up the change via useSyncExternalStore.
 */
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notifyAll() {
  // Clear cache when data changes
  cachedSnapshot = null;
  lastRawValue = null;
  listeners.forEach((cb) => cb());
}

// Cache for migrated data to prevent infinite loops
let cachedSnapshot: DefaultSpreads | null = null;
let lastRawValue: string | null = null;

function getSnapshot(): DefaultSpreads {
  const raw = localStorage.getItem(STORAGE_KEY);

  // Return cached value if localStorage hasn't changed
  if (raw === lastRawValue && cachedSnapshot !== null) {
    return cachedSnapshot;
  }

  lastRawValue = raw;

  if (raw === null) {
    cachedSnapshot = { bid: DEFAULT_BID_SPREADS, ask: DEFAULT_ASK_SPREADS };
    return cachedSnapshot;
  }

  try {
    const parsed = JSON.parse(raw);

    // Handle old format: plain array [0, 1, 2, 3, 4]
    if (Array.isArray(parsed) && parsed.length === 5 && parsed.every((v: unknown) => typeof v === 'number')) {
      cachedSnapshot = {
        bid: [...parsed],
        ask: parsed.map((v) => -Math.abs(v)),
      };
      return cachedSnapshot;
    }

    // Handle new format: { bid: [...], ask: [...] }
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray(parsed.bid) &&
      Array.isArray(parsed.ask) &&
      parsed.bid.length === 5 &&
      parsed.ask.length === 5 &&
      parsed.bid.every((v: unknown) => typeof v === 'number') &&
      parsed.ask.every((v: unknown) => typeof v === 'number')
    ) {
      cachedSnapshot = parsed as DefaultSpreads;
      return cachedSnapshot;
    }
  } catch {
    // Fall through to default
  }

  cachedSnapshot = { bid: DEFAULT_BID_SPREADS, ask: DEFAULT_ASK_SPREADS };
  return cachedSnapshot;
}

/**
 * Shared hook that reads/writes default spread values to localStorage.
 *
 * - Default bid: [0, 1, 2, 3, 4] (L1-L5)
 * - Default ask: [0, -1, -2, -3, -4] (L1-L5, negative)
 * - Returns separate bid and ask arrays (5 numbers each)
 * - Persists across sessions via localStorage
 * - Synchronises across all mounted instances via useSyncExternalStore
 */
export function useDefaultSpreads() {
  const defaultSpreads = useSyncExternalStore(subscribe, getSnapshot, () => ({ bid: DEFAULT_BID_SPREADS, ask: DEFAULT_ASK_SPREADS }));

  const updateDefaultSpreads = useCallback((bid: number[], ask: number[]) => {
    if (bid.length !== 5 || ask.length !== 5) {
      console.error('Default spreads must have exactly 5 values for both bid and ask');
      return;
    }
    // Round to 3 decimal places
    const roundedBid = bid.map((v) => Math.round(v * 1000) / 1000);
    const roundedAsk = ask.map((v) => Math.round(v * 1000) / 1000);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bid: roundedBid, ask: roundedAsk }));
    notifyAll();
  }, []);

  return { defaultSpreads, updateDefaultSpreads } as const;
}
