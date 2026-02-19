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

/**
 * Validate stream configuration before launching.
 * When `side` is provided, only the specified side's price, FFCH, and quantity are checked.
 * Yield crossing is only checked when the other side is already active (or when launching both sides).
 */
export function validateStreamSet(streamSet: StreamSet, side?: 'bid' | 'ask'): ValidationResult {
  const { bidBase, askBase } = getBaseBidAsk(streamSet);
  const checkBid = !side || side === 'bid';
  const checkAsk = !side || side === 'ask';

  // Check for missing reference price (only for the side(s) being launched)
  const hasValidBid = bidBase != null && bidBase !== 0;
  const hasValidAsk = askBase != null && askBase !== 0;

  if (checkBid && !hasValidBid && checkAsk && !hasValidAsk) {
    return {
      success: false,
      error: 'FFCH [BID + ASK]: Reference value is empty. Please enter a valid price before launching.',
      errorType: 'ffch',
      affectedSide: 'both',
    };
  }
  if (checkBid && !hasValidBid) {
    return {
      success: false,
      error: 'FFCH [BID]: Reference value is empty. Please enter a valid price before launching.',
      errorType: 'ffch',
      affectedSide: 'bid',
    };
  }
  if (checkAsk && !hasValidAsk) {
    return {
      success: false,
      error: 'FFCH [ASK]: Reference value is empty. Please enter a valid price before launching.',
      errorType: 'ffch',
      affectedSide: 'ask',
    };
  }

  // Check FFCH for bid
  const bidDelta = streamSet.bid.spreadMatrix[0]?.deltaBps || 0;
  if (checkBid) {
    const bidYieldForFfch = bidBase + bidDelta / 100;
    if (Math.abs(bidDelta) > FFCH_LIMIT_BPS) {
      return {
        success: false,
        error: `FFCH [BID]: Yield ${bidYieldForFfch.toFixed(3)}% exceeds limit`,
        errorType: 'ffch',
        affectedSide: 'bid',
      };
    }
  }

  // Check FFCH for ask
  const askDelta = streamSet.ask.spreadMatrix[0]?.deltaBps || 0;
  if (checkAsk) {
    const askYieldForFfch = askBase + askDelta / 100;
    if (Math.abs(askDelta) > FFCH_LIMIT_BPS) {
      return {
        success: false,
        error: `FFCH [ASK]: Yield ${askYieldForFfch.toFixed(3)}% exceeds limit`,
        errorType: 'ffch',
        affectedSide: 'ask',
      };
    }
  }

  // Check yield crossing: INVALID when ask_yield > bid_yield at level 1.
  // For side-specific launches, only check when the other side is currently active —
  // crossing is only possible when both sides are simultaneously live.
  const otherSideIsActive = !side
    ? true
    : side === 'bid'
      ? streamSet.ask.spreadMatrix.some((l) => l.isActive)
      : streamSet.bid.spreadMatrix.some((l) => l.isActive);

  if (otherSideIsActive) {
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
  }

  // Check quantity limits (only for the side(s) being launched)
  if (checkBid) {
    const bidQty = streamSet.bid.spreadMatrix[0]?.quantity || 0;
    if (bidQty < MIN_QUANTITY || bidQty > MAX_QUANTITY) {
      return {
        success: false,
        error: `Bid quantity ${bidQty.toLocaleString()} outside valid range (${MIN_QUANTITY.toLocaleString()} - ${MAX_QUANTITY.toLocaleString()})`,
        errorType: 'quantity_limit',
        affectedSide: 'bid',
      };
    }
  }

  if (checkAsk) {
    const askQty = streamSet.ask.spreadMatrix[0]?.quantity || 0;
    if (askQty < MIN_QUANTITY || askQty > MAX_QUANTITY) {
      return {
        success: false,
        error: `Ask quantity ${askQty.toLocaleString()} outside valid range (${MIN_QUANTITY.toLocaleString()} - ${MAX_QUANTITY.toLocaleString()})`,
        errorType: 'quantity_limit',
        affectedSide: 'ask',
      };
    }
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
