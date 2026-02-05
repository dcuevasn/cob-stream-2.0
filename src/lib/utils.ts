import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { StreamSet, StagingSnapshot, Level, SecurityType } from '../types/streamSet';

/** UDI-based securities: UDI Bono, Corporate UDI */
export function isUdiSecurity(securityType: SecurityType): boolean {
  return securityType === 'UDI Bono' || securityType === 'Corporate UDI';
}

/** MXN-based securities: M Bono, Cetes, Corporate MXN */
export function isMxnSecurity(securityType: SecurityType): boolean {
  return securityType === 'M Bono' || securityType === 'Cetes' || securityType === 'Corporate MXN';
}

/** Toggle label for notional mode: "Trade Amt" for UDI, "Notional" for non-UDI (used in nested view and batch) */
export function getNotionalToggleLabel(securityType: SecurityType): string {
  return isUdiSecurity(securityType) ? 'Trade Amt' : 'Notional';
}

/** Volume/quantity label for level headers (QTY vs Trade Amt/Notional) */
export function getVolumeLabel(priceMode: 'quantity' | 'notional', securityType: SecurityType): string {
  return priceMode === 'notional' ? getNotionalToggleLabel(securityType) : 'QTY';
}

/** Check if a level is active */
function isLevelActive(
  level: Level,
  streamSide: { isActive: boolean; levelsToLaunch?: number; maxLvls?: number }
): boolean {
  return (
    level.isActive ??
    (streamSide.isActive && level.levelNumber <= (streamSide.levelsToLaunch ?? 0) && level.levelNumber <= (streamSide.maxLvls ?? 5))
  );
}

/** Count of active levels per side, derived from level.isActive or stream-level state */
export function getActiveLevelCount(
  matrix: Level[],
  streamSide: { isActive: boolean; levelsToLaunch?: number; maxLvls?: number }
): number {
  return matrix.filter((level) => isLevelActive(level, streamSide)).length;
}

/** Best/innermost active level: lowest level number that is active (L1 preferred, then L2, etc.) */
export function getBestActiveLevel(
  matrix: Level[] | undefined,
  streamSide: { isActive: boolean; levelsToLaunch?: number; maxLvls?: number }
): Level | undefined {
  if (!matrix?.length) return undefined;
  for (let i = 0; i < matrix.length; i++) {
    const level = matrix[i];
    if (level != null && isLevelActive(level, streamSide)) return level;
  }
  return undefined;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, decimals: number = 3): string {
  return value.toFixed(decimals);
}

/** Format with K/M abbreviations for main table. Decimals only when needed, trim trailing zeros. */
export function formatQuantity(value: number): string {
  if (value < 1_000) return value.toString();
  if (value < 1_000_000) {
    const k = value / 1_000;
    const str = k.toFixed(3).replace(/\.?0+$/, '');
    return str + 'K';
  }
  const m = value / 1_000_000;
  const str = m.toFixed(3).replace(/\.?0+$/, '');
  return str + 'M';
}

/** Full numbers with commas for nested level tables (no K/M abbreviations). */
export function formatQuantityFull(value: number): string {
  return value.toLocaleString();
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}

export function calculateYield(referencePrice: number, deltaBps: number): number {
  return referencePrice + deltaBps / 100;
}

/** Deep equality for staging revert detection.
 * For live/quote-feed sources, referencePrice.value is runtime data (driven by feed) and is excluded from the diff. */
export function stagingConfigEquals(stream: StreamSet, snapshot: StagingSnapshot): boolean {
  if (stream.selectedPriceSource !== snapshot.selectedPriceSource || stream.priceMode !== snapshot.priceMode) return false;
  const isManual = stream.selectedPriceSource === 'manual';
  if (isManual && stream.referencePrice.value !== snapshot.referencePrice.value) return false;
  if ((stream.referencePrice.manualBid ?? 0) !== (snapshot.referencePrice.manualBid ?? 0)) return false;
  if ((stream.referencePrice.manualAsk ?? 0) !== (snapshot.referencePrice.manualAsk ?? 0)) return false;
  if ((stream.bid.maxLvls ?? 1) !== (snapshot.bid.maxLvls ?? 1)) return false;
  if ((stream.ask.maxLvls ?? 1) !== (snapshot.ask.maxLvls ?? 1)) return false;
  const bidA = stream.bid.spreadMatrix;
  const bidB = snapshot.bid.spreadMatrix;
  if (bidA.length !== bidB.length) return false;
  for (let i = 0; i < bidA.length; i++) {
    const a = bidA[i];
    const b = bidB[i];
    if (!a || !b || a.levelNumber !== b.levelNumber || a.deltaBps !== b.deltaBps || a.quantity !== b.quantity) return false;
  }
  const askA = stream.ask.spreadMatrix;
  const askB = snapshot.ask.spreadMatrix;
  if (askA.length !== askB.length) return false;
  for (let i = 0; i < askA.length; i++) {
    const a = askA[i];
    const b = askB[i];
    if (!a || !b || a.levelNumber !== b.levelNumber || a.deltaBps !== b.deltaBps || a.quantity !== b.quantity) return false;
  }
  return true;
}
