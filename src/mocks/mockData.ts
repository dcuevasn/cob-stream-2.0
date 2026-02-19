import type { StreamSet, QuoteFeed, SecurityType, StreamState, StreamQuoteFeed, StagingSnapshot } from '../types/streamSet';

export const QUOTE_FEEDS: QuoteFeed[] = [
  { id: 'qf-cicada', name: 'Cicada Index', isAvailable: true },
  { id: 'qf-bankf-stg1', name: 'BankF-stg_1', isAvailable: true },
  { id: 'qf-market', name: 'Market Data Pro', isAvailable: true },
  { id: 'qf-manual', name: 'Manual', isAvailable: true },
];

interface SecurityData {
  name: string;
  alias: string;
  isin: string;
  type: SecurityType;
  maturity: string;
  couponRate: number;
  referenceYield: number;
}

const SECURITIES: SecurityData[] = [
  // M Bono
  { name: 'M Bono 5.750% Mar-2026', alias: 'MAR26', isin: 'MX0MGO0000H9', type: 'M Bono', maturity: '2026-03-05', couponRate: 5.75, referenceYield: 8.857 },
  { name: 'M Bono 7.750% Sep-2026', alias: 'SEP26', isin: 'MX0MGO0000J5', type: 'M Bono', maturity: '2026-09-03', couponRate: 7.75, referenceYield: 9.089 },
  { name: 'M Bono 7.500% Mar-2027', alias: 'MAR27', isin: 'MX0MGO0000K3', type: 'M Bono', maturity: '2027-03-04', couponRate: 7.5, referenceYield: 10.498 },
  { name: 'M Bono 7.250% Jun-2027', alias: 'JUN27', isin: 'MX0MGO0000L1', type: 'M Bono', maturity: '2027-06-03', couponRate: 7.25, referenceYield: 9.961 },
  { name: 'M Bono 8.500% Mar-2028', alias: 'MAR28', isin: 'MX0MGO0000M9', type: 'M Bono', maturity: '2028-03-02', couponRate: 8.5, referenceYield: 10.250 },
  { name: 'M Bono 8.500% Mar-2029', alias: 'MAR29', isin: 'MX0MGO0000N7', type: 'M Bono', maturity: '2029-03-01', couponRate: 8.5, referenceYield: 10.296 },
  { name: 'M Bono 8.500% May-2029', alias: 'MAY29', isin: 'MX0MGO0000O5', type: 'M Bono', maturity: '2029-05-31', couponRate: 8.5, referenceYield: 9.827 },
  { name: 'M Bono 8.500% Feb-2030', alias: 'FEB30', isin: 'MX0MGO0000P2', type: 'M Bono', maturity: '2030-02-28', couponRate: 8.5, referenceYield: 9.750 },
  { name: 'M Bono 7.750% May-2031', alias: 'MAY31', isin: 'MX0MGO0000Q0', type: 'M Bono', maturity: '2031-05-29', couponRate: 7.75, referenceYield: 9.416 },
  { name: 'M Bono 7.500% Apr-2032', alias: 'APR32', isin: 'MX0MGO0000R8', type: 'M Bono', maturity: '2032-04-29', couponRate: 7.5, referenceYield: 9.670 },
  { name: 'M Bono 8.000% May-2033', alias: 'MAY33', isin: 'MX0MGO0000S6', type: 'M Bono', maturity: '2033-05-26', couponRate: 8.0, referenceYield: 10.002 },
  { name: 'M Bono 7.750% Nov-2034', alias: 'NOV34', isin: 'MX0MGO0000T4', type: 'M Bono', maturity: '2034-11-23', couponRate: 7.75, referenceYield: 9.603 },
  { name: 'M Bono 7.750% May-2035', alias: 'MAY35', isin: 'MX0MGO0000U2', type: 'M Bono', maturity: '2035-05-24', couponRate: 7.75, referenceYield: 9.851 },
  { name: 'M Bono 10.000% Feb-2036', alias: 'FEB36', isin: 'MX0MGO0000V0', type: 'M Bono', maturity: '2036-02-21', couponRate: 10.0, referenceYield: 9.700 },
  { name: 'M Bono 10.000% Nov-2036', alias: 'NOV36', isin: 'MX0MGO0000W8', type: 'M Bono', maturity: '2036-11-20', couponRate: 10.0, referenceYield: 9.999 },
  { name: 'M Bono 8.500% Nov-2038', alias: 'NOV38', isin: 'MX0MGO0000X6', type: 'M Bono', maturity: '2038-11-18', couponRate: 8.5, referenceYield: 10.144 },
  { name: 'M Bono 8.000% Nov-2042', alias: 'NOV42', isin: 'MX0MGO0000Y4', type: 'M Bono', maturity: '2042-11-19', couponRate: 8.0, referenceYield: 9.857 },
  { name: 'M Bono 7.750% Nov-2047', alias: 'NOV47', isin: 'MX0MGO0000Z1', type: 'M Bono', maturity: '2047-11-13', couponRate: 7.75, referenceYield: 10.280 },
  { name: 'M Bono 8.000% Jul-2053', alias: 'JUL53', isin: 'MX0MGO000101', type: 'M Bono', maturity: '2053-07-08', couponRate: 8.0, referenceYield: 10.062 },
  { name: 'M Bono 5.500% Apr-2055', alias: 'APR55', isin: 'MX0MGO000102', type: 'M Bono', maturity: '2055-04-03', couponRate: 5.5, referenceYield: 6.340 },

  // UDI Bono
  { name: 'UDI Bono 4.00% Nov-2028', alias: 'NOV28', isin: 'MX0UDI000001', type: 'UDI Bono', maturity: '2028-11-09', couponRate: 4.0, referenceYield: 6.000 },
  { name: 'UDI Bono 4.50% Nov-2031', alias: 'NOV31', isin: 'MX0UDI000002', type: 'UDI Bono', maturity: '2031-11-06', couponRate: 4.5, referenceYield: 5.051 },
  { name: 'UDI Bono 4.00% Aug-2034', alias: 'AGO34', isin: 'MX0UDI000003', type: 'UDI Bono', maturity: '2034-08-03', couponRate: 4.0, referenceYield: 5.513 },
  { name: 'UDI Bono 4.00% Nov-2035', alias: 'NOV35', isin: 'MX0UDI000004', type: 'UDI Bono', maturity: '2035-11-01', couponRate: 4.0, referenceYield: 5.951 },
  { name: 'UDI Bono 4.00% Nov-2040', alias: 'NOV40', isin: 'MX0UDI000005', type: 'UDI Bono', maturity: '2040-10-31', couponRate: 4.0, referenceYield: 5.073 },
  { name: 'UDI Bono 4.00% Nov-2043', alias: 'NOV43', isin: 'MX0UDI000006', type: 'UDI Bono', maturity: '2043-10-28', couponRate: 4.0, referenceYield: 5.156 },
  { name: 'UDI Bono 4.00% Nov-2046', alias: 'NOV46', isin: 'MX0UDI000007', type: 'UDI Bono', maturity: '2046-10-22', couponRate: 4.0, referenceYield: 5.536 },
  { name: 'UDI Bono 4.00% Nov-2050', alias: 'NOV50', isin: 'MX0UDI000008', type: 'UDI Bono', maturity: '2050-10-15', couponRate: 4.0, referenceYield: 5.495 },
  { name: 'UDI Bono 3.25% Oct-2054', alias: 'OCT54', isin: 'MX0UDI000009', type: 'UDI Bono', maturity: '2054-10-08', couponRate: 3.25, referenceYield: 5.560 },

  // Cetes
  { name: 'CETES 28-Feb-2026', alias: 'CETES 28', isin: 'MX0CET000001', type: 'Cetes', maturity: '2026-02-28', couponRate: 0, referenceYield: 9.85 },
  { name: 'CETES 28-May-2026', alias: 'CETES 55', isin: 'MX0CET000002', type: 'Cetes', maturity: '2026-05-28', couponRate: 0, referenceYield: 9.75 },
  { name: 'CETES 28-Aug-2026', alias: 'CETES 89', isin: 'MX0CET000003', type: 'Cetes', maturity: '2026-08-28', couponRate: 0, referenceYield: 9.65 },

  // Corporate MXN (MXN-denominated corporates)
  { name: 'PEMEX 6.875% 2026', alias: 'PEMEX26', isin: 'MX0COR000001', type: 'Corporate MXN', maturity: '2026-08-04', couponRate: 6.875, referenceYield: 8.50 },
  { name: 'CFE 5.250% 2027', alias: 'CFE27', isin: 'MX0COR000002', type: 'Corporate MXN', maturity: '2027-12-15', couponRate: 5.25, referenceYield: 7.25 },
  { name: 'CEMEX 5.700% 2028', alias: 'CEMEX28', isin: 'MX0COR000003', type: 'Corporate MXN', maturity: '2028-01-11', couponRate: 5.7, referenceYield: 7.80 },

  // Corporate UDI (UDI-denominated corporates)
  { name: 'PEMEX UDI 4.00% 2029', alias: 'PEMEX29', isin: 'MX0CUD000001', type: 'Corporate UDI', maturity: '2029-06-15', couponRate: 4.0, referenceYield: 5.85 },
  { name: 'CFE UDI 3.50% 2030', alias: 'CFE30', isin: 'MX0CUD000002', type: 'Corporate UDI', maturity: '2030-03-20', couponRate: 3.5, referenceYield: 5.42 },
  { name: 'CEMEX UDI 4.25% 2031', alias: 'CEMEX31', isin: 'MX0CUD000003', type: 'Corporate UDI', maturity: '2031-09-10', couponRate: 4.25, referenceYield: 5.68 },
];

function generateSpreadMatrix(levels: number, side: 'bid' | 'ask', baseQty: number = 1000): { levelNumber: number; deltaBps: number; quantity: number }[] {
  const sign = side === 'bid' ? 1 : -1;
  return Array.from({ length: levels }, (_, i) => ({
    levelNumber: i + 1,
    deltaBps: sign * (i + 1) * 0.5, // 0.5, 1.0, 1.5, 2.0, 2.5 bps
    quantity: baseQty,
  }));
}

const QUOTE_FEED_MIN = 9.34;
const QUOTE_FEED_MAX = 10.212;
const QUOTE_FEED_PRECISION = 3;

// Generate per-stream quote feeds with bid/ask values
// Values strictly between 9.34 and 10.212, bid always > ask, 3 decimals
export function generateStreamQuoteFeeds(_baseYield?: number): StreamQuoteFeed[] {
  const numFeeds = Math.floor(Math.random() * 6) + 3; // 3-8 feeds per Stream Set
  const feeds: StreamQuoteFeed[] = [];

  for (let i = 1; i <= numFeeds; i++) {
    // Random midpoint in range, leave room for spread (bid > ask)
    const range = QUOTE_FEED_MAX - QUOTE_FEED_MIN;
    const midPoint = QUOTE_FEED_MIN + Math.random() * range * 0.9 + range * 0.05;
    const spread = 0.002 + Math.random() * 0.02; // 0.2-2.2 bps spread

    let bid = Number((midPoint + spread / 2).toFixed(QUOTE_FEED_PRECISION));
    let ask = Number((midPoint - spread / 2).toFixed(QUOTE_FEED_PRECISION));

    // Ensure bid > ask and both in range
    if (bid <= ask) {
      const tmp = ask;
      ask = bid;
      bid = tmp;
    }
    bid = Math.min(QUOTE_FEED_MAX, Math.max(QUOTE_FEED_MIN, bid));
    ask = Math.min(QUOTE_FEED_MAX, Math.max(QUOTE_FEED_MIN, ask));
    if (bid <= ask) {
      ask = Number((bid - 0.001).toFixed(QUOTE_FEED_PRECISION));
    }

    // Generate random timestamps within the last 5 minutes (bid and ask may differ slightly)
    const now = Date.now();
    const bidOffset = Math.floor(Math.random() * 5 * 60 * 1000); // 0-5 minutes ago
    const askOffset = Math.floor(Math.random() * 5 * 60 * 1000); // 0-5 minutes ago

    feeds.push({
      feedId: `QF-${i}`,
      feedName: `QF-${i}`,
      bid,
      ask,
      bidTimestamp: new Date(now - bidOffset).toISOString(),
      askTimestamp: new Date(now - askOffset).toISOString(),
    });
  }

  return feeds;
}

function getRandomState(): StreamState {
  const states: StreamState[] = ['unconfigured', 'staging', 'active', 'active', 'paused', 'halted'];
  return states[Math.floor(Math.random() * states.length)];
}

export function generateMockStreamSets(): StreamSet[] {
  return SECURITIES.map((sec, i) => {
    const state = getRandomState();
    const levels = Math.floor(Math.random() * 5) + 1;
    const isActive = state === 'active';
    const isPaused = state === 'paused';
    const isHalted = state === 'halted';
    const quoteFeeds = generateStreamQuoteFeeds(sec.referenceYield);
    const selectedFeed = quoteFeeds[0];

    return {
      id: `ss-${i}-${sec.alias}`,
      securityId: `sec-${i}`,
      securityName: sec.name,
      securityAlias: sec.alias,
      securityISIN: sec.isin,
      securityType: sec.type,
      maturityDate: sec.maturity,
      couponRate: sec.couponRate,
      state,
      haltReason: isHalted ? 'ffch' : undefined,
      haltDetails: isHalted ? 'Reference value is empty. Please enter a valid price from Cicada Add-In before launching.' : undefined,
      levels,
      priceMode: 'quantity',
      quoteFeedId: selectedFeed.feedId,
      quoteFeedName: selectedFeed.feedName,
      quoteFeeds,
      selectedPriceSource: isActive || isPaused ? selectedFeed.feedId : 'manual',
      referencePrice: {
        source: state === 'unconfigured' ? 'manual' : 'live',
        value: isActive || isPaused ? selectedFeed.bid : sec.referenceYield,
        timestamp: new Date().toISOString(),
        isOverride: false,
      },
      bid: {
        isActive: isActive,
        levelsToLaunch: isActive ? levels : 0,
        spreadMatrix: generateSpreadMatrix(5, 'bid', (state === 'active' || state === 'paused') ? (sec.alias === 'MAR26' ? 4000 : 1000) : 1000),
        state: isHalted ? 'halted' : state,
      },
      ask: {
        isActive: isActive,
        levelsToLaunch: isActive ? levels : 0,
        spreadMatrix: generateSpreadMatrix(5, 'ask', (state === 'active' || state === 'paused') ? (sec.alias === 'JUL53' ? 200000 : 1000) : 1000),
        state: state,
      },
    };
  });
}

// Generate randomized demo data with varied states across all security types
export function generateRandomDemoData(): StreamSet[] {
  const haltReasons: Array<StreamSet['haltReason']> = ['ffch', 'yield_crossing', 'user_stop', 'execution_error'];
  const haltMessages: Record<string, string> = {
    ffch: 'FFCH crossed: Price exceeds hard limit threshold',
    yield_crossing: 'Yield crossing: Bid yield ≤ Ask yield (inverted spread)',
    user_stop: 'Stopped by user',
    execution_error: 'Execution error: Connection timeout',
  };

  // Shuffle securities to get random selection
  const shuffled = [...SECURITIES].sort(() => Math.random() - 0.5);

  // Select 15-25 random securities across all types
  const selectedCount = Math.floor(Math.random() * 11) + 15;
  const selected = shuffled.slice(0, selectedCount);

  return selected.map((sec, i) => {
    // Weighted random state - more active streams
    const stateRand = Math.random();
    let state: StreamState;
    if (stateRand < 0.45) state = 'active';
    else if (stateRand < 0.6) state = 'staging';
    else if (stateRand < 0.75) state = 'paused';
    else if (stateRand < 0.9) state = 'halted';
    else state = 'unconfigured';

    const isActive = state === 'active';
    const isPaused = state === 'paused';
    const isHalted = state === 'halted';

    // Random halt reason
    const haltReason = isHalted ? haltReasons[Math.floor(Math.random() * haltReasons.length)] : undefined;
    const haltDetails = haltReason ? haltMessages[haltReason] : undefined;

    // Random levels 1-5
    const levels = Math.floor(Math.random() * 5) + 1;

    // Random quantities - varied realistic values
    const qtyOptions = [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000, 200000];
    const bidQty = qtyOptions[Math.floor(Math.random() * qtyOptions.length)];
    const askQty = qtyOptions[Math.floor(Math.random() * qtyOptions.length)];

    // Random spread deltas (0.5 to 5 bps)
    const bidBaseDelta = (Math.floor(Math.random() * 10) + 1) * 0.5;
    const askBaseDelta = -(Math.floor(Math.random() * 10) + 1) * 0.5;

    // Generate per-stream quote feeds
    const quoteFeeds = generateStreamQuoteFeeds(sec.referenceYield);
    const selectedFeedIndex = Math.floor(Math.random() * quoteFeeds.length);
    const selectedFeed = isActive || isPaused ? quoteFeeds[selectedFeedIndex] : null;

    return {
      id: `ss-demo-${Date.now()}-${i}-${sec.alias}`,
      securityId: `sec-${i}`,
      securityName: sec.name,
      securityAlias: sec.alias,
      securityISIN: sec.isin,
      securityType: sec.type,
      maturityDate: sec.maturity,
      couponRate: sec.couponRate,
      state,
      haltReason,
      haltDetails,
      levels,
      priceMode: 'quantity',
      quoteFeedId: selectedFeed?.feedId,
      quoteFeedName: selectedFeed?.feedName,
      quoteFeeds,
      selectedPriceSource: selectedFeed ? selectedFeed.feedId : 'manual',
      referencePrice: {
        source: state === 'unconfigured' ? 'manual' : 'live',
        value: selectedFeed ? selectedFeed.bid : sec.referenceYield,
        timestamp: new Date().toISOString(),
        isOverride: false,
      },
      bid: {
        isActive: isActive,
        levelsToLaunch: isActive ? levels : 0,
        spreadMatrix: Array.from({ length: 5 }, (_, lvl) => ({
          levelNumber: lvl + 1,
          deltaBps: bidBaseDelta + lvl * 0.5,
          quantity: bidQty,
        })),
        state: isHalted && Math.random() > 0.5 ? 'halted' : state,
      },
      ask: {
        isActive: isActive,
        levelsToLaunch: isActive ? levels : 0,
        spreadMatrix: Array.from({ length: 5 }, (_, lvl) => ({
          levelNumber: lvl + 1,
          deltaBps: askBaseDelta - lvl * 0.5,
          quantity: askQty,
        })),
        state: isHalted && Math.random() > 0.5 ? 'halted' : state,
      },
    };
  });
}

// Helper function to create staging snapshot (matches useStreamStore implementation)
function createStagingSnapshot(stream: StreamSet): StagingSnapshot {
  return {
    bid: {
      spreadMatrix: stream.bid.spreadMatrix.map(({ levelNumber, deltaBps, quantity }) => ({ levelNumber, deltaBps, quantity })),
      maxLvls: stream.bid.maxLvls ?? 1,
    },
    ask: {
      spreadMatrix: stream.ask.spreadMatrix.map(({ levelNumber, deltaBps, quantity }) => ({ levelNumber, deltaBps, quantity })),
      maxLvls: stream.ask.maxLvls ?? 1,
    },
    selectedPriceSource: stream.selectedPriceSource || 'manual',
    priceMode: stream.priceMode,
    referencePrice: { ...stream.referencePrice },
  };
}

export type DemoStreamType = 'new_stream' | 'yield_crossing' | 'ffch_bid' | 'ffch_ask' | 'staged' | 'unconfigured';

// Generate additive demo streams that are appended to existing streams
// Each stream has exactly 1 active level on BID and 1 on ASK (except when type specifies otherwise)
// type: 'new_stream' = normal paused stream; 'yield_crossing' = halted with yield crossing;
//       'ffch_bid' = BID halted with FFCH, ASK active; 'ffch_ask' = ASK halted with FFCH, BID active;
//       'staged' = active with pending edits; 'unconfigured' = empty state, no QF assigned
// securityTypeFilter: when provided and not 'All', only pick from securities of that type (context-aware for current view)
export function generateAdditiveDemoStreams(
  count: number = 5,
  type?: DemoStreamType,
  securityTypeFilter?: SecurityType | 'All'
): StreamSet[] {
  // Filter by security type when viewing a specific tab (so generated streams appear in current view)
  const pool =
    securityTypeFilter && securityTypeFilter !== 'All'
      ? SECURITIES.filter((s) => s.type === securityTypeFilter)
      : SECURITIES;
  if (pool.length === 0) return [];

  // Shuffle and select
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, pool.length));

  return selected.map((sec, i) => {
    // Unconfigured: empty state, no QF, default spreads [0,1,2,3,4], notional 1000
    if (type === 'unconfigured') {
      const quoteFeeds = generateStreamQuoteFeeds(sec.referenceYield);
      return {
        id: `ss-demo-${Date.now()}-${i}-${sec.alias}`,
        securityId: `sec-demo-${Date.now()}-${i}`,
        securityName: sec.name,
        securityAlias: sec.alias,
        securityISIN: sec.isin,
        securityType: sec.type,
        maturityDate: sec.maturity,
        couponRate: sec.couponRate,
        state: 'unconfigured' as StreamState,
        levels: 5,
        priceMode: 'quantity',
        quoteFeedId: undefined,
        quoteFeedName: undefined,
        quoteFeeds,
        selectedPriceSource: '', // No QF assigned - displays as "-"
        referencePrice: {
          source: 'manual' as const,
          value: 0,
          timestamp: new Date().toISOString(),
          isOverride: false,
        },
        bid: {
          isActive: false,
          levelsToLaunch: 0,
          maxLvls: 1,
          spreadMatrix: Array.from({ length: 5 }, (_, lvl) => ({
            levelNumber: lvl + 1,
            deltaBps: lvl, // 0, 1, 2, 3, 4 bps
            quantity: 1000,
          })),
          state: 'unconfigured',
        },
        ask: {
          isActive: false,
          levelsToLaunch: 0,
          maxLvls: 1,
          spreadMatrix: Array.from({ length: 5 }, (_, lvl) => ({
            levelNumber: lvl + 1,
            deltaBps: -lvl, // 0, -1, -2, -3, -4 bps
            quantity: 1000,
          })),
          state: 'unconfigured',
        },
      };
    }

    // Side-specific FFCH: one side halted, the other active with 2 levels
    if (type === 'ffch_bid' || type === 'ffch_ask') {
      const ffchQuoteFeeds = generateStreamQuoteFeeds(sec.referenceYield);
      const ffchFeed = ffchQuoteFeeds[Math.floor(Math.random() * ffchQuoteFeeds.length)];
      const qtyOpts = [500, 1000, 2000, 5000, 10000, 25000];
      const bidQtyF = qtyOpts[Math.floor(Math.random() * qtyOpts.length)];
      const askQtyF = qtyOpts[Math.floor(Math.random() * qtyOpts.length)];

      const isBidHalted = type === 'ffch_bid';
      const ffchDelta = 120; // |deltaBps| > FFCH_LIMIT_BPS (100)
      const validDelta = (Math.floor(Math.random() * 10) + 1) * 0.5;

      const bidBaseDelta = isBidHalted ? ffchDelta : validDelta;
      const askBaseDelta = isBidHalted ? -validDelta : -ffchDelta;

      const ffchYield = isBidHalted
        ? (ffchFeed.bid + ffchDelta / 100).toFixed(3)
        : (ffchFeed.ask - ffchDelta / 100).toFixed(3);
      const haltDetails = isBidHalted
        ? `FFCH [BID]: Yield ${ffchYield}% exceeds limit`
        : `FFCH [ASK]: Yield ${ffchYield}% exceeds limit`;

      const ffchStream: StreamSet = {
        id: `ss-demo-${Date.now()}-${i}-${sec.alias}`,
        securityId: `sec-demo-${Date.now()}-${i}`,
        securityName: sec.name,
        securityAlias: sec.alias,
        securityISIN: sec.isin,
        securityType: sec.type,
        maturityDate: sec.maturity,
        couponRate: sec.couponRate,
        state: 'halted',
        haltReason: 'ffch',
        haltDetails,
        levels: 5,
        priceMode: 'quantity',
        quoteFeedId: ffchFeed.feedId,
        quoteFeedName: ffchFeed.feedName,
        quoteFeeds: ffchQuoteFeeds,
        selectedPriceSource: ffchFeed.feedId,
        referencePrice: {
          source: 'live',
          value: ffchFeed.bid,
          timestamp: new Date().toISOString(),
          isOverride: false,
        },
        bid: {
          isActive: !isBidHalted,
          levelsToLaunch: isBidHalted ? 0 : 2,
          maxLvls: isBidHalted ? 1 : 2,
          spreadMatrix: Array.from({ length: 5 }, (_, lvl) => ({
            levelNumber: lvl + 1,
            deltaBps: bidBaseDelta + lvl * 0.5,
            quantity: bidQtyF,
          })),
          state: isBidHalted ? 'halted' : 'active',
        },
        ask: {
          isActive: isBidHalted,
          levelsToLaunch: isBidHalted ? 2 : 0,
          maxLvls: isBidHalted ? 2 : 1,
          spreadMatrix: Array.from({ length: 5 }, (_, lvl) => ({
            levelNumber: lvl + 1,
            deltaBps: askBaseDelta - lvl * 0.5,
            quantity: askQtyF,
          })),
          state: isBidHalted ? 'active' : 'halted',
        },
      };

      return {
        ...ffchStream,
        hasStagingChanges: false,
        lastLaunchedSnapshot: createStagingSnapshot(ffchStream),
      };
    }

    // Generate per-stream quote feeds
    const quoteFeeds = generateStreamQuoteFeeds(sec.referenceYield);
    const selectedFeedIndex = Math.floor(Math.random() * quoteFeeds.length);
    let selectedFeed = quoteFeeds[selectedFeedIndex];

    // For yield_crossing: need askYield1 > bidYield1. Create custom feed with inverted deltas.
    if (type === 'yield_crossing') {
      const baseBid = selectedFeed.bid;
      const baseAsk = selectedFeed.ask;
      // Ensure ask yield > bid yield: askValue + askDelta/100 > bidValue + bidDelta/100
      // Use bidDelta = -80 (bidYield = bid - 0.8), askDelta = 80 (askYield = ask + 0.8)
      // With bid > ask, bidYield could be 9.2, askYield 10.79 -> askYield > bidYield
      selectedFeed = {
        ...selectedFeed,
        bid: baseBid,
        ask: baseAsk,
      };
    }

    // Random quantities
    const qtyOptions = [500, 1000, 2000, 5000, 10000, 25000, 50000];
    const bidQty = qtyOptions[Math.floor(Math.random() * qtyOptions.length)];
    const askQty = qtyOptions[Math.floor(Math.random() * qtyOptions.length)];

    // Base spread deltas - vary by type
    let bidBaseDelta: number;
    let askBaseDelta: number;

    if (type === 'yield_crossing') {
      // bidDelta negative, askDelta positive so askYield > bidYield
      bidBaseDelta = -80; // bid level 1: -79.5
      askBaseDelta = 80;  // ask level 1: 79.5 -> askYield = askValue + 0.795 > bidYield = bidValue - 0.795
    } else {
      bidBaseDelta = (Math.floor(Math.random() * 10) + 1) * 0.5;
      askBaseDelta = -(Math.floor(Math.random() * 10) + 1) * 0.5;
    }

    // State and halt config by type
    let state: StreamState;
    let haltReason: StreamSet['haltReason'];
    let haltDetails: string | undefined;

    if (type === 'yield_crossing') {
      state = 'halted';
      haltReason = 'yield_crossing';
      haltDetails = 'Yield crossing: Bid yield ≤ Ask yield (inverted spread)';
    } else if (type === 'staged') {
      state = 'active'; // Active with staging changes
      haltReason = undefined;
      haltDetails = undefined;
    } else {
      state = 'paused';
      haltReason = undefined;
      haltDetails = undefined;
    }

    const isActive = state === 'active';
    const isHalted = state === 'halted';

    // Build the stream object first (without staging properties)
    const stream: StreamSet = {
      id: `ss-demo-${Date.now()}-${i}-${sec.alias}`,
      securityId: `sec-demo-${Date.now()}-${i}`,
      securityName: sec.name,
      securityAlias: sec.alias,
      securityISIN: sec.isin,
      securityType: sec.type,
      maturityDate: sec.maturity,
      couponRate: sec.couponRate,
      state,
      haltReason,
      haltDetails,
      levels: 5,
      priceMode: 'quantity',
      quoteFeedId: selectedFeed.feedId,
      quoteFeedName: selectedFeed.feedName,
      quoteFeeds,
      selectedPriceSource: selectedFeed.feedId,
      referencePrice: {
        source: 'live',
        value: selectedFeed.bid,
        timestamp: new Date().toISOString(),
        isOverride: false,
      },
      bid: {
        isActive,
        levelsToLaunch: isActive ? 1 : 0,
        maxLvls: 1,
        spreadMatrix: Array.from({ length: 5 }, (_, lvl) => ({
          levelNumber: lvl + 1,
          deltaBps: bidBaseDelta + lvl * 0.5,
          quantity: bidQty,
        })),
        state: isHalted ? 'halted' : state,
      },
      ask: {
        isActive,
        levelsToLaunch: isActive ? 1 : 0,
        maxLvls: 1,
        spreadMatrix: Array.from({ length: 5 }, (_, lvl) => ({
          levelNumber: lvl + 1,
          deltaBps: askBaseDelta - lvl * 0.5,
          quantity: askQty,
        })),
        state: isHalted ? 'halted' : state,
      },
    };

    const initialSnapshot = createStagingSnapshot(stream);

    // Staged: hasStagingChanges with snapshot differing from current (e.g. different qty)
    if (type === 'staged') {
      const snapshotWithDifferentQty: StagingSnapshot = {
        ...initialSnapshot,
        bid: {
          spreadMatrix: initialSnapshot.bid.spreadMatrix.map((l, idx) =>
            idx === 0 ? { ...l, quantity: Math.max(100, l.quantity - 500) } : l
          ),
        },
      };
      return {
        ...stream,
        hasStagingChanges: true,
        lastLaunchedSnapshot: snapshotWithDifferentQty,
      };
    }

    return {
      ...stream,
      hasStagingChanges: false,
      lastLaunchedSnapshot: initialSnapshot,
    };
  });
}

export function generateInitialStreamSets(): StreamSet[] {
  // Generate deterministic initial state based on the screenshots
  return SECURITIES.map((sec, i) => {
    let state: StreamState = 'active';
    let haltReason: StreamSet['haltReason'] = undefined;
    let haltDetails: string | undefined = undefined;

    // Some specific streams are halted based on screenshot
    if (sec.alias === 'MAR28' || sec.alias === 'FEB30') {
      state = 'halted';
      haltReason = 'ffch';
      haltDetails = 'Reference value is empty. Please enter a valid price from Cicada Add-In before launching.';
    }

    const levels = 5;
    const isActive = state === 'active';

    // Generate per-stream quote feeds
    const quoteFeeds = generateStreamQuoteFeeds(sec.referenceYield);
    const selectedFeed = quoteFeeds[0];

    return {
      id: `ss-${i}-${sec.alias}`,
      securityId: `sec-${i}`,
      securityName: sec.name,
      securityAlias: sec.alias,
      securityISIN: sec.isin,
      securityType: sec.type,
      maturityDate: sec.maturity,
      couponRate: sec.couponRate,
      state,
      haltReason,
      haltDetails,
      levels,
      priceMode: 'quantity',
      quoteFeedId: selectedFeed.feedId,
      quoteFeedName: selectedFeed.feedName,
      quoteFeeds,
      selectedPriceSource: isActive ? selectedFeed.feedId : 'manual',
      referencePrice: {
        source: 'live',
        value: isActive ? selectedFeed.bid : sec.referenceYield,
        timestamp: new Date().toISOString(),
        isOverride: false,
      },
      bid: {
        isActive,
        levelsToLaunch: isActive ? levels : 0,
        maxLvls: 1,
        spreadMatrix: generateSpreadMatrix(5, 'bid', sec.alias === 'MAR26' ? 4000 : (sec.alias === 'JUL53' || sec.alias === 'OCT54' ? 100000 : 1000)),
        state: state,
      },
      ask: {
        isActive,
        levelsToLaunch: isActive ? levels : 0,
        maxLvls: 1,
        spreadMatrix: generateSpreadMatrix(5, 'ask', sec.alias === 'JUL53' || sec.alias === 'OCT54' ? 200000 : 1000),
        state: state,
      },
    };
  });
}
