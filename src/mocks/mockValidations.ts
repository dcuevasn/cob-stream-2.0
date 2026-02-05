import type { StreamSet, ValidationResult } from '../types/streamSet';

const FFCH_LIMIT_BPS = 100; // 100 basis points
const MIN_QUANTITY = 1; // QTY streams allow 1–max
const MAX_QUANTITY = 50_000_000;

/** Get base bid/ask values for yield calculation - matches StreamRow logic */
function getBaseBidAsk(streamSet: StreamSet): { bidBase: number; askBase: number } {
  const isManual = streamSet.selectedPriceSource === 'manual' || !streamSet.selectedPriceSource;
  const selectedFeed = streamSet.quoteFeeds?.find((f) => f.feedId === streamSet.selectedPriceSource);
  const value = streamSet.referencePrice.value ?? 0;
  return {
    bidBase: selectedFeed?.bid ?? (isManual && streamSet.referencePrice.manualBid != null ? streamSet.referencePrice.manualBid : value),
    askBase: selectedFeed?.ask ?? (isManual && streamSet.referencePrice.manualAsk != null ? streamSet.referencePrice.manualAsk : value),
  };
}

export function validateStreamSet(streamSet: StreamSet): ValidationResult {
  const { bidBase, askBase } = getBaseBidAsk(streamSet);

  // Check for missing reference price (either base must be valid for manual; value for QF)
  const hasValidBid = bidBase != null && bidBase !== 0;
  const hasValidAsk = askBase != null && askBase !== 0;
  if (!hasValidBid || !hasValidAsk) {
    return {
      success: false,
      error: 'Reference value is empty. Please enter a valid price before launching.',
      errorType: 'ffch',
      affectedSide: 'both',
    };
  }

  // Check FFCH for bid
  const bidDelta = streamSet.bid.spreadMatrix[0]?.deltaBps || 0;
  const bidYieldForFfch = bidBase + bidDelta / 100;
  if (Math.abs(bidDelta) > FFCH_LIMIT_BPS) {
    return {
      success: false,
      error: `Bid FFCH crossed: ${bidYieldForFfch.toFixed(3)}% exceeds limit`,
      errorType: 'ffch',
      affectedSide: 'bid',
    };
  }

  // Check FFCH for ask
  const askDelta = streamSet.ask.spreadMatrix[0]?.deltaBps || 0;
  const askYieldForFfch = askBase + askDelta / 100;
  if (Math.abs(askDelta) > FFCH_LIMIT_BPS) {
    return {
      success: false,
      error: `Ask FFCH crossed: ${askYieldForFfch.toFixed(3)}% exceeds limit`,
      errorType: 'ffch',
      affectedSide: 'ask',
    };
  }

  // Check yield crossing: INVALID when ask_yield > bid_yield at level 1
  // VALID when bid >= ask (bid > ask or bid === ask)
  const bidYield = bidBase + bidDelta / 100;
  const askYield = askBase + askDelta / 100;

  if (askYield > bidYield) {
    return {
      success: false,
      error: `Yield crossing: Ask yield ${askYield.toFixed(3)}% exceeds Bid yield ${bidYield.toFixed(3)}%`,
      errorType: 'yield_crossing',
      affectedSide: 'both',
    };
  }

  // Check quantity limits
  const bidQty = streamSet.bid.spreadMatrix[0]?.quantity || 0;
  const askQty = streamSet.ask.spreadMatrix[0]?.quantity || 0;

  if (bidQty < MIN_QUANTITY || bidQty > MAX_QUANTITY) {
    return {
      success: false,
      error: `Bid quantity ${bidQty.toLocaleString()} outside valid range (${MIN_QUANTITY.toLocaleString()} - ${MAX_QUANTITY.toLocaleString()})`,
      errorType: 'quantity_limit',
      affectedSide: 'bid',
    };
  }

  if (askQty < MIN_QUANTITY || askQty > MAX_QUANTITY) {
    return {
      success: false,
      error: `Ask quantity ${askQty.toLocaleString()} outside valid range (${MIN_QUANTITY.toLocaleString()} - ${MAX_QUANTITY.toLocaleString()})`,
      errorType: 'quantity_limit',
      affectedSide: 'ask',
    };
  }

  return { success: true };
}

export function simulateLaunch(streamSet: StreamSet): Promise<ValidationResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(validateStreamSet(streamSet));
    }, 300); // Simulate network latency
  });
}

export function simulateStopStream(_streamSet: StreamSet): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 200);
  });
}
