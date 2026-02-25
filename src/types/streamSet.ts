export type StreamState = 'unconfigured' | 'staging' | 'active' | 'paused' | 'halted' | 'cancelled';
export type HaltReason = 'ffch' | 'yield_crossing' | 'user_stop' | 'execution_error';
export type PriceMode = 'quantity' | 'notional' | 'amount';
export type PriceSource = 'live' | 'manual';
export type SecurityType = 'M Bono' | 'UDI Bono' | 'Cetes' | 'Corporate MXN' | 'Corporate UDI';

export interface Level {
  levelNumber: number; // 1-5
  deltaBps: number; // in basis points, absolute to ref price
  quantity: number;
  /** Per-level active state for Launch/Pause control. When undefined, derived from stream-level state. */
  isActive?: boolean;
}

export interface StreamSide {
  isActive: boolean;
  levelsToLaunch: number; // 0 = stopped, 1-5 = active levels
  /** Max levels that can be active per side (0-5). Default 1. */
  maxLvls?: number;
  spreadMatrix: Level[];
  state?: StreamState;
  haltReason?: HaltReason;
}

export interface ReferencePrice {
  source: PriceSource;
  value: number;
  timestamp: string;
  isOverride: boolean;
  lastStableValue?: number;
  /** Manual mode: separate bid/ask when user enters values (preserved when switching from QF to Manual) */
  manualBid?: number;
  manualAsk?: number;
}

/** Baseline for revert detection when user edits levels/price source */
export interface StagingSnapshot {
  bid: { spreadMatrix: Level[]; maxLvls?: number };
  ask: { spreadMatrix: Level[]; maxLvls?: number };
  selectedPriceSource: string;
  priceMode: PriceMode;
  referencePrice: ReferencePrice;
  /** Per-side sources — captured when independentPriceSources is active */
  bidSelectedPriceSource?: string;
  askSelectedPriceSource?: string;
  bidReferencePrice?: ReferencePrice;
  askReferencePrice?: ReferencePrice;
}

export interface StreamSet {
  id: string;
  securityId: string;
  securityName: string;
  securityAlias: string;
  securityISIN: string;
  securityType: SecurityType;
  maturityDate: string;
  couponRate: number;
  state: StreamState;
  haltReason?: HaltReason;
  haltDetails?: string;

  // Configuration
  levels: number;
  priceMode: PriceMode;
  quoteFeedId?: string;
  quoteFeedName?: string;
  referencePrice: ReferencePrice;

  // Per-stream quote feeds (3-8 feeds per stream)
  quoteFeeds: StreamQuoteFeed[];
  selectedPriceSource: string; // 'manual' or feedId like 'QF-1'

  // Per-side settings
  bid: StreamSide;
  ask: StreamSide;

  /** Overlay: user has unsaved edits (levels, price source). Coexists with state (Active + Staging, etc.) */
  hasStagingChanges?: boolean;
  /** Baseline for revert detection; set on successful launch */
  lastLaunchedSnapshot?: StagingSnapshot;

  /** Per-side price sources — only active when the independentPriceSources feature flag is on */
  bidSelectedPriceSource?: string;
  askSelectedPriceSource?: string;
  bidReferencePrice?: ReferencePrice;
  askReferencePrice?: ReferencePrice;
}

export interface QuoteFeed {
  id: string;
  name: string;
  isAvailable: boolean;
}

// Per-stream quote feed with bid/ask values
export interface StreamQuoteFeed {
  feedId: string;
  feedName: string;
  bid: number; // Always > ask
  ask: number;
  /** Timestamp when bid price was last received */
  bidTimestamp?: string;
  /** Timestamp when ask price was last received */
  askTimestamp?: string;
}

export interface UserPreferences {
  securityNameFormat: 'short' | 'long';
  quantityDisplay: PriceMode;
  showDisabledStreams: boolean;
  sortOrder: 'maturity-asc' | 'maturity-desc' | 'manual';
  keyboardShortcutsEnabled: boolean;
  defaultLevels: number;
  toastNotificationsEnabled: boolean;
  hideIndividualLevelControls: boolean;
  independentPriceSources: boolean;
}

export interface ValidationResult {
  success: boolean;
  error?: string;
  errorType?: 'ffch' | 'yield_crossing' | 'quantity_limit' | 'open_risk';
  affectedSide?: 'bid' | 'ask' | 'both';
}

// Launch Progress Types for batch launch operations
export type LaunchProgressStatus = 'pending' | 'processing' | 'success' | 'error';

export interface LaunchProgressItem {
  streamId: string;
  streamName: string;
  status: LaunchProgressStatus;
  error?: string;
  startTime?: number;
  endTime?: number;
  /** Number of bid orders launched */
  bidCount: number;
  /** Number of ask orders launched */
  askCount: number;
  /** Security type for grouping in All view */
  securityType: SecurityType;
}

export interface LaunchProgressState {
  isActive: boolean;
  items: LaunchProgressItem[];
  completedCount: number;
  totalCount: number;
  variant: 'all' | 'bid' | 'ask';
  startTime: number;
}

// Pause Progress Types for batch pause operations (mirrors Launch progress)
export interface PauseProgressItem {
  streamId: string;
  streamName: string;
  status: LaunchProgressStatus;
  error?: string;
  startTime?: number;
  endTime?: number;
  /** Number of bid orders being paused */
  bidCount: number;
  /** Number of ask orders being paused */
  askCount: number;
  /** Security type for grouping in All view */
  securityType: SecurityType;
}

export interface PauseProgressState {
  isActive: boolean;
  items: PauseProgressItem[];
  completedCount: number;
  totalCount: number;
  variant: 'all' | 'bid' | 'ask';
  startTime: number;
}
