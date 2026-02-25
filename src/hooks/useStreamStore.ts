import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StreamSet, SecurityType, UserPreferences, StreamState, StagingSnapshot, StreamQuoteFeed, LaunchProgressState, LaunchProgressItem, PauseProgressState, PauseProgressItem } from '../types/streamSet';
import { generateInitialStreamSets, generateRandomDemoData, generateStreamQuoteFeeds, generateAdditiveDemoStreams, type DemoStreamType } from '../mocks/mockData';
import { simulateLaunch, simulateStopStream, validateStreamSet } from '../mocks/mockValidations';
import { stagingConfigEquals, getActiveLevelCount } from '../lib/utils';
import type { SecurityCatalogItem } from '../mocks/securityCatalog';

interface StreamStore {
  // State
  streamSets: StreamSet[];
  selectedStreamId: string | null;
  expandedStreamIds: Set<string>;
  activeTab: SecurityType | 'All';
  searchQuery: string;
  isLoading: boolean;
  launchingStreamIds: Set<string>;
  launchingLevelKeys: Set<string>;
  /** Stream IDs that have attempted launch without a valid price source configured */
  missingPriceSourceStreamIds: Set<string>;
  /** Per-stream: which side failed to launch due to missing manual price (transient, no stream halt) */
  manualPriceErrors: Map<string, 'bid' | 'ask'>;
  preferences: UserPreferences;
  /** Accordion open sections in All view (SecurityType values). Persists across view changes. */
  accordionOpenSections: string[];
  
  /** Launch progress state for batch launch operations */
  launchProgress: LaunchProgressState | null;
  
  /** Pause progress state for batch pause operations */
  pauseProgress: PauseProgressState | null;

  // Actions
  setStreamSets: (streamSets: StreamSet[]) => void;
  updateStreamSet: (id: string, updates: Partial<StreamSet>, options?: { skipStaging?: boolean }) => void;
  selectStream: (id: string | null) => void;
  toggleExpanded: (id: string) => void;
  expandAllInView: () => void;
  collapseAllInView: () => void;
  setActiveTab: (tab: SecurityType | 'All') => void;
  setSearchQuery: (query: string) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  setAccordionOpenSections: (sections: string[]) => void;

  // Stream operations
  launchStream: (id: string) => Promise<void>;
  applyChanges: (id: string) => Promise<void>;
  stopStream: (id: string) => Promise<void>;
  pauseStream: (id: string) => void;
  resumeStream: (id: string) => void;
  launchLevel: (streamId: string, side: 'bid' | 'ask', levelIndex: number) => Promise<void>;
  pauseLevel: (streamId: string, side: 'bid' | 'ask', levelIndex: number) => void;
  launchAllLevels: (streamId: string, side: 'bid' | 'ask') => Promise<void>;
  pauseAllLevels: (streamId: string, side: 'bid' | 'ask') => Promise<void>;
  launchAllInView: () => Promise<void>;
  stopAllInView: () => Promise<void>;
  pauseAllInView: () => void;
  addStreamSet: (securityType: SecurityType) => void;
  addSecuritiesBatch: (securities: SecurityCatalogItem[]) => void;
  deleteStreamSet: (id: string) => void;
  configureStream: (id: string, config: Partial<StreamSet>) => void;

  // Batch operations
  batchUpdatePriceSource: (selectedPriceSource: string, securityType?: SecurityType) => void;
  batchUpdatePriceMode: (priceMode: 'quantity' | 'notional', securityType?: SecurityType) => void;
  batchUpdateMaxLvls: (bidMaxLvls: number, askMaxLvls: number) => void;
  batchUpdateQty: (bidQty: number, askQty: number) => void;

  // Staging revert
  revertStagingChanges: (id: string) => void;
  batchRevertStagingChanges: () => void;
  batchApplyChanges: () => Promise<void>;

  // Price source validation
  clearMissingPriceSourceError: (id: string) => void;
  clearManualPriceError: (id: string) => void;

  // Spread adjustments
  adjustSpreadBid: (delta: number) => void;
  adjustSpreadAsk: (delta: number) => void;
  
  // Type-scoped batch spread adjustments (for column header popovers)
  adjustSpreadForType: (side: 'bid' | 'ask', delta: number, securityType?: SecurityType) => void;
  resetSpreadsForType: (side: 'bid' | 'ask', securityType?: SecurityType) => void;
  revertSpreadsForType: (side: 'bid' | 'ask', securityType?: SecurityType) => void;
  getStreamsForBatchSpread: (securityType?: SecurityType) => StreamSet[];

  // Reset/Demo
  generateDemoData: (type?: DemoStreamType) => void;
  resetState: () => void;

  // Launch progress actions
  launchAllWithProgress: (variant: 'all' | 'bid' | 'ask', securityType?: SecurityType) => Promise<void>;
  dismissLaunchProgress: () => void;
  
  // Pause progress actions
  pauseAllWithProgress: (variant: 'all' | 'bid' | 'ask', securityType?: SecurityType) => Promise<void>;
  dismissPauseProgress: () => void;
  
  // Computed
  getFilteredStreamSets: () => StreamSet[];
  getStreamsByType: (type: SecurityType) => StreamSet[];
  /** Single source of truth for Cancel changes button visibility. */
  hasStagedStreamsInView: () => boolean;
}

const REVERT_DEBOUNCE_MS = 300;
const revertDebounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

/** Canonical predicate: stream is in staging (shows Staging badge, can be reverted/relaunched). */
function isStreamStaging(stream: StreamSet): boolean {
  return (
    stream.state === 'staging' ||
    stream.state === 'halted' ||
    (stream.state === 'active' && !!stream.hasStagingChanges)
  );
}

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
    bidSelectedPriceSource: stream.bidSelectedPriceSource,
    askSelectedPriceSource: stream.askSelectedPriceSource,
    bidReferencePrice: stream.bidReferencePrice ? { ...stream.bidReferencePrice } : undefined,
    askReferencePrice: stream.askReferencePrice ? { ...stream.askReferencePrice } : undefined,
  };
}

/** Create side-specific snapshot: updates specified side, preserves other side from existing snapshot.
 * Global fields (referencePrice, selectedPriceSource, priceMode) always use current stream values —
 * they are shared between both sides, so launching either side commits them. */
function createSideSnapshot(stream: StreamSet, side: 'bid' | 'ask'): StagingSnapshot {
  const existingSnapshot = stream.lastLaunchedSnapshot;

  // If no existing snapshot, create full snapshot
  if (!existingSnapshot) {
    return createStagingSnapshot(stream);
  }

  // Always commit global fields from the current stream. Only the OTHER side's
  // spread/qty matrix is preserved from the existing snapshot.
  if (side === 'bid') {
    return {
      selectedPriceSource: stream.selectedPriceSource || 'manual',
      priceMode: stream.priceMode,
      referencePrice: { ...stream.referencePrice },
      bid: {
        spreadMatrix: stream.bid.spreadMatrix.map(({ levelNumber, deltaBps, quantity }) => ({ levelNumber, deltaBps, quantity })),
        maxLvls: stream.bid.maxLvls ?? 1,
      },
      ask: existingSnapshot.ask,
      bidSelectedPriceSource: stream.bidSelectedPriceSource,
      bidReferencePrice: stream.bidReferencePrice ? { ...stream.bidReferencePrice } : undefined,
      askSelectedPriceSource: existingSnapshot.askSelectedPriceSource,
      askReferencePrice: existingSnapshot.askReferencePrice ? { ...existingSnapshot.askReferencePrice } : undefined,
    };
  } else {
    return {
      selectedPriceSource: stream.selectedPriceSource || 'manual',
      priceMode: stream.priceMode,
      referencePrice: { ...stream.referencePrice },
      bid: existingSnapshot.bid,
      ask: {
        spreadMatrix: stream.ask.spreadMatrix.map(({ levelNumber, deltaBps, quantity }) => ({ levelNumber, deltaBps, quantity })),
        maxLvls: stream.ask.maxLvls ?? 1,
      },
      bidSelectedPriceSource: existingSnapshot.bidSelectedPriceSource,
      bidReferencePrice: existingSnapshot.bidReferencePrice ? { ...existingSnapshot.bidReferencePrice } : undefined,
      askSelectedPriceSource: stream.askSelectedPriceSource,
      askReferencePrice: stream.askReferencePrice ? { ...stream.askReferencePrice } : undefined,
    };
  }
}

function checkStagingRevert(id: string) {
  const { streamSets, updateStreamSet } = useStreamStore.getState();
  const stream = streamSets.find((ss) => ss.id === id);
  if (!stream?.hasStagingChanges) return;

  if (!stream.lastLaunchedSnapshot) {
    // No snapshot yet (unconfigured stream). For manual source: only suppress
    // the staged banner if the user hasn't entered a valid price yet — this
    // prevents the banner from appearing just from selecting the Manual source.
    if (stream.selectedPriceSource === 'manual') {
      const hasValidManualPrice =
        (stream.referencePrice.manualBid != null && stream.referencePrice.manualBid !== 0) ||
        (stream.referencePrice.manualAsk != null && stream.referencePrice.manualAsk !== 0);
      if (!hasValidManualPrice) {
        updateStreamSet(id, { hasStagingChanges: false }, { skipStaging: true });
      }
    } else {
      // Non-manual source on unconfigured stream: no snapshot to diff against, suppress staging.
      updateStreamSet(id, { hasStagingChanges: false }, { skipStaging: true });
    }
    return;
  }

  if (stagingConfigEquals(stream, stream.lastLaunchedSnapshot)) {
    updateStreamSet(id, { hasStagingChanges: false });
  }
}

/** Auto-clear manualPriceErrors when the user enters a valid manual price for the errored side. */
function checkManualPriceErrors(id: string) {
  const { streamSets, manualPriceErrors } = useStreamStore.getState();
  if (!manualPriceErrors.has(id)) return;
  const stream = streamSets.find((ss) => ss.id === id);
  if (!stream) return;
  const errorSide = manualPriceErrors.get(id)!;
  const price = errorSide === 'bid' ? stream.referencePrice.manualBid : stream.referencePrice.manualAsk;
  if (price != null && price !== 0) {
    useStreamStore.setState((s) => {
      const next = new Map(s.manualPriceErrors);
      next.delete(id);
      return { manualPriceErrors: next };
    });
  }
}

function checkAndClearHaltState(id: string) {
  const { streamSets, updateStreamSet } = useStreamStore.getState();
  const stream = streamSets.find((ss) => ss.id === id);
  // If stream is halted and has staging changes, check if current values would pass validation
  if (stream && stream.state === 'halted' && stream.hasStagingChanges) {
    const validation = validateStreamSet(stream);
    // If validation passes, clear halt state and transition to staging (user has fixed the issue)
    if (validation.success) {
      updateStreamSet(id, {
        state: 'staging',
        haltReason: undefined,
        haltDetails: undefined,
        bid: { ...stream.bid, state: 'staging' },
        ask: { ...stream.ask, state: 'staging' },
      }, { skipStaging: true });
    }
  }
}

/** Check if a stream has a valid price source configured for launch */
function isPriceSourceValid(stream: StreamSet): boolean {
  const source = stream.selectedPriceSource;
  // Invalid if null, undefined, empty string, or placeholder
  if (!source || source === '' || source === '-') return false;
  // Valid if manual
  if (source === 'manual') return true;
  // Valid if it's a quote feed that exists in the stream's available feeds
  if (stream.quoteFeeds?.some((f) => f.feedId === source)) return true;
  return false;
}

const defaultPreferences: UserPreferences = {
  securityNameFormat: 'short',
  quantityDisplay: 'quantity',
  showDisabledStreams: true,
  sortOrder: 'maturity-asc',
  keyboardShortcutsEnabled: true,
  defaultLevels: 5,
  toastNotificationsEnabled: true,
  hideIndividualLevelControls: false,
  independentPriceSources: false,
};

export const useStreamStore = create<StreamStore>()(
  persist(
    (set, get) => ({
      streamSets: generateInitialStreamSets(),
      selectedStreamId: null,
      expandedStreamIds: new Set(),
      activeTab: 'All',
      searchQuery: '',
      isLoading: false,
      launchingStreamIds: new Set<string>(),
      launchingLevelKeys: new Set<string>(),
      missingPriceSourceStreamIds: new Set<string>(),
      manualPriceErrors: new Map<string, 'bid' | 'ask'>(),
      preferences: defaultPreferences,
      accordionOpenSections: ['M Bono', 'UDI Bono', 'Cetes', 'Corporate MXN', 'Corporate UDI'],
      launchProgress: null,
      pauseProgress: null,

      setStreamSets: (streamSets) => set({ streamSets }),

      updateStreamSet: (id, updates, options) => {
        const skipStaging = options?.skipStaging === true;
        const touchesStaging =
          !skipStaging &&
          ('bid' in updates || 'ask' in updates || 'selectedPriceSource' in updates || 'priceMode' in updates || 'referencePrice' in updates ||
           'bidSelectedPriceSource' in updates || 'askSelectedPriceSource' in updates || 'bidReferencePrice' in updates || 'askReferencePrice' in updates) &&
          !('hasStagingChanges' in updates && updates.hasStagingChanges === false);
        set((state) => {
          const next = state.streamSets.map((ss) =>
            ss.id === id
              ? { ...ss, ...updates, ...(touchesStaging ? { hasStagingChanges: true } : {}) }
              : ss
          );
          return { streamSets: next };
        });
        if (touchesStaging) {
          clearTimeout(revertDebounceTimers[id]);
          revertDebounceTimers[id] = setTimeout(() => {
            checkStagingRevert(id);
            // Check if halt state should be cleared when values become valid
            checkAndClearHaltState(id);
            // Auto-clear manual price error when user enters a valid price
            checkManualPriceErrors(id);
          }, REVERT_DEBOUNCE_MS);
        }
        if ('hasStagingChanges' in updates && updates.hasStagingChanges === false) {
          clearTimeout(revertDebounceTimers[id]);
          delete revertDebounceTimers[id];
        }
      },

      selectStream: (id) => set({ selectedStreamId: id }),

      toggleExpanded: (id) =>
        set((state) => {
          const newExpanded = new Set(state.expandedStreamIds);
          if (newExpanded.has(id)) {
            newExpanded.delete(id);
          } else {
            newExpanded.add(id);
          }
          return { expandedStreamIds: newExpanded };
        }),

      expandAllInView: () => {
        const ids = get().getFilteredStreamSets().map((s) => s.id);
        set((state) => {
          const newExpanded = new Set(state.expandedStreamIds);
          ids.forEach((id) => newExpanded.add(id));
          return { expandedStreamIds: newExpanded };
        });
      },

      collapseAllInView: () => {
        const ids = new Set(get().getFilteredStreamSets().map((s) => s.id));
        set((state) => {
          const newExpanded = new Set(state.expandedStreamIds);
          ids.forEach((id) => newExpanded.delete(id));
          return { expandedStreamIds: newExpanded };
        });
      },

      setActiveTab: (tab) => set({ activeTab: tab, searchQuery: '' }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setPreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),
      setAccordionOpenSections: (sections) => set({ accordionOpenSections: sections }),

      launchStream: async (id) => {
        const { streamSets, updateStreamSet } = get();
        const stream = streamSets.find((ss) => ss.id === id);
        if (!stream) return;

        // Validate price source before launching
        if (!isPriceSourceValid(stream)) {
          set((s) => ({
            missingPriceSourceStreamIds: new Set(s.missingPriceSourceStreamIds).add(id),
          }));
          return;
        }

        // Clear any previous missing price source error
        set((s) => {
          const next = new Set(s.missingPriceSourceStreamIds);
          next.delete(id);
          return {
            isLoading: true,
            launchingStreamIds: new Set(s.launchingStreamIds).add(id),
            missingPriceSourceStreamIds: next,
          };
        });
        const result = await simulateLaunch(stream);

        if (result.success) {
          const snapshot = createStagingSnapshot(stream);
          // Activate levels up to maxLvls (Relaunch = apply staged changes + launch levels)
          const bidMaxLvls = stream.bid.maxLvls ?? 1;
          const askMaxLvls = stream.ask.maxLvls ?? 1;
          const bidMatrix = stream.bid.spreadMatrix.map((l) => ({
            ...l,
            isActive: l.levelNumber <= bidMaxLvls,
          }));
          const askMatrix = stream.ask.spreadMatrix.map((l) => ({
            ...l,
            isActive: l.levelNumber <= askMaxLvls,
          }));
          updateStreamSet(id, {
            state: 'active',
            bid: {
              ...stream.bid,
              isActive: true,
              state: 'active',
              spreadMatrix: bidMatrix,
            },
            ask: {
              ...stream.ask,
              isActive: true,
              state: 'active',
              spreadMatrix: askMatrix,
            },
            haltReason: undefined,
            haltDetails: undefined,
            lastLaunchedSnapshot: snapshot,
            hasStagingChanges: false,
          });
        } else {
          const newState: StreamState = 'halted';
          updateStreamSet(id, {
            state: newState,
            haltReason: result.errorType as StreamSet['haltReason'],
            haltDetails: result.error,
            bid: {
              ...stream.bid,
              isActive: result.affectedSide !== 'bid' && result.affectedSide !== 'both',
              state: result.affectedSide === 'bid' || result.affectedSide === 'both' ? 'halted' : stream.bid.state,
            },
            ask: {
              ...stream.ask,
              isActive: result.affectedSide !== 'ask' && result.affectedSide !== 'both',
              state: result.affectedSide === 'ask' || result.affectedSide === 'both' ? 'halted' : stream.ask.state,
            },
          });
        }

        set((s) => {
          const next = new Set(s.launchingStreamIds);
          next.delete(id);
          return { isLoading: next.size > 0, launchingStreamIds: next };
        });
      },

      applyChanges: async (streamId) => {
        const { streamSets, launchAllLevels, pauseAllLevels, updateStreamSet } = get();
        const stream = streamSets.find((ss) => ss.id === streamId);
        if (!stream) return;

        // A side must both have its isActive flag set AND have at least one actually-active level
        // to be considered active. Using isActive alone is insufficient because resumeStream sets
        // isActive=true without activating individual levels, and using only level counts is
        // insufficient because stopStream leaves level.isActive=true while setting side.isActive=false.
        const isBidActive = stream.bid.isActive && getActiveLevelCount(stream.bid.spreadMatrix, stream.bid) > 0;
        const isAskActive = stream.ask.isActive && getActiveLevelCount(stream.ask.spreadMatrix, stream.ask) > 0;
        const bidMaxLvls = stream.bid.maxLvls ?? 1;
        const askMaxLvls = stream.ask.maxLvls ?? 1;

        // Track loading state so the button disables during the operation
        set((s) => ({
          launchingStreamIds: new Set(s.launchingStreamIds).add(streamId),
        }));

        // Relaunch: active side with MAX > 0 → apply config and reactivate levels
        if (isBidActive && bidMaxLvls > 0) await launchAllLevels(streamId, 'bid');
        if (isAskActive && askMaxLvls > 0) await launchAllLevels(streamId, 'ask');

        // Stop: active side with MAX = 0 → stop all levels, then fall through to snapshot update
        if (isBidActive && bidMaxLvls === 0) await pauseAllLevels(streamId, 'bid');
        if (isAskActive && askMaxLvls === 0) await pauseAllLevels(streamId, 'ask');

        // For sides that were NOT relaunched (already stopped, or just stopped via MAX=0):
        // commit current config as new snapshot without launching
        const bidWasRelaunched = isBidActive && bidMaxLvls > 0;
        const askWasRelaunched = isAskActive && askMaxLvls > 0;
        if (!bidWasRelaunched || !askWasRelaunched) {
          const updatedStream = get().streamSets.find((ss) => ss.id === streamId);
          if (updatedStream) {
            let newSnapshot: StagingSnapshot;
            if (!bidWasRelaunched && !askWasRelaunched) {
              // Neither side relaunched: commit full config as new snapshot
              newSnapshot = createStagingSnapshot(updatedStream);
            } else if (!bidWasRelaunched) {
              // Bid not relaunched, ask was just launched: update bid side of snapshot
              newSnapshot = createSideSnapshot(updatedStream, 'bid');
            } else {
              // Ask not relaunched, bid was just launched: update ask side of snapshot
              newSnapshot = createSideSnapshot(updatedStream, 'ask');
            }
            updateStreamSet(streamId, {
              lastLaunchedSnapshot: newSnapshot,
              hasStagingChanges: false,
            });
          }
        }

        // Clear loading state
        set((s) => {
          const next = new Set(s.launchingStreamIds);
          next.delete(streamId);
          return { launchingStreamIds: next };
        });
      },

      stopStream: async (id) => {
        const { streamSets, updateStreamSet } = get();
        const stream = streamSets.find((ss) => ss.id === id);
        if (!stream) return;

        set({ isLoading: true });
        await simulateStopStream(stream);

        updateStreamSet(id, {
          state: 'staging',
          bid: { ...stream.bid, isActive: false, state: 'staging' },
          ask: { ...stream.ask, isActive: false, state: 'staging' },
        });

        set({ isLoading: false });
      },

      /** Pause stream - runtime control, does NOT set or re-enable Staging */
      pauseStream: (id) => {
        const { streamSets } = get();
        const stream = streamSets.find((ss) => ss.id === id);
        if (!stream || stream.state !== 'active') return;

        set((state) => ({
          streamSets: state.streamSets.map((ss) => {
            if (ss.id !== id) return ss;
            // Set ALL levels to inactive in both bid and ask spreadMatrix
            const pausedBidMatrix = ss.bid.spreadMatrix.map((l) => ({ ...l, isActive: false }));
            const pausedAskMatrix = ss.ask.spreadMatrix.map((l) => ({ ...l, isActive: false }));
            return {
              ...ss,
              state: 'paused' as StreamState,
              bid: {
                ...ss.bid,
                isActive: false,
                spreadMatrix: pausedBidMatrix,
              },
              ask: {
                ...ss.ask,
                isActive: false,
                spreadMatrix: pausedAskMatrix,
              },
            };
          }),
        }));
      },

      /** Resume stream - does NOT touch hasStagingChanges */
      resumeStream: (id) => {
        const { streamSets } = get();
        const stream = streamSets.find((ss) => ss.id === id);
        if (!stream || stream.state !== 'paused') return;

        set((state) => ({
          streamSets: state.streamSets.map((ss) =>
            ss.id === id
              ? {
                  ...ss,
                  state: 'active' as StreamState,
                  bid: { ...ss.bid, isActive: true },
                  ask: { ...ss.ask, isActive: true },
                }
              : ss
          ),
        }));
      },

      /** Per-level launch - does NOT affect Staging. FE-only. Respects maxLvls. */
      launchLevel: async (streamId, side, levelIndex) => {
        const { streamSets, updateStreamSet } = get();
        const stream = streamSets.find((ss) => ss.id === streamId);
        if (!stream) return;

        // Validate price source before launching
        if (!isPriceSourceValid(stream)) {
          set((s) => ({
            missingPriceSourceStreamIds: new Set(s.missingPriceSourceStreamIds).add(streamId),
          }));
          return;
        }

        const streamSide = side === 'bid' ? stream.bid : stream.ask;
        const maxLvls = streamSide.maxLvls ?? 1;
        if (maxLvls === 0) return; // No levels can be active

        const activeCount = streamSide.spreadMatrix.filter((l) => l.isActive ?? (streamSide.isActive && l.levelNumber <= (streamSide.levelsToLaunch ?? 0))).length;
        if (activeCount >= maxLvls) return; // At limit, prevent launch

        const levelNumber = streamSide.spreadMatrix[levelIndex]?.levelNumber ?? levelIndex + 1;
        if (levelNumber > maxLvls) return; // Level exceeds max, cannot launch

        const key = `${streamId}-${side}-${levelIndex}`;
        set((s) => ({
          launchingLevelKeys: new Set(s.launchingLevelKeys).add(key),
        }));

        await new Promise((r) => setTimeout(r, 200));

        const matrix = side === 'bid' ? stream.bid.spreadMatrix : stream.ask.spreadMatrix;
        const newMatrix = matrix.map((l, i) =>
          i === levelIndex ? { ...l, isActive: true } : l
        );
        
        // Check if side will have any active levels after this launch
        const sideWillHaveActiveLevels = newMatrix.some((l) => l.isActive);
        const otherSide = side === 'bid' ? stream.ask : stream.bid;
        const otherSideHasActiveLevels = otherSide.spreadMatrix.some((l) => l.isActive);
        
        // Update the side
        const sideUpdate = side === 'bid'
          ? {
              bid: {
                ...stream.bid,
                isActive: sideWillHaveActiveLevels,
                state: sideWillHaveActiveLevels ? ('active' as StreamState) : stream.bid.state,
                spreadMatrix: newMatrix,
              },
            }
          : {
              ask: {
                ...stream.ask,
                isActive: sideWillHaveActiveLevels,
                state: sideWillHaveActiveLevels ? ('active' as StreamState) : stream.ask.state,
                spreadMatrix: newMatrix,
              },
            };

        // Update stream state if at least one side has active levels and stream was paused/halted
        const streamStateUpdate = (sideWillHaveActiveLevels || otherSideHasActiveLevels) &&
          (stream.state === 'paused' || stream.state === 'halted')
          ? { state: 'active' as StreamState }
          : {};

        // Clear halt state when activating a level (relaunch action)
        const haltStateUpdate = stream.state === 'halted'
          ? {
              haltReason: undefined,
              haltDetails: undefined,
            }
          : {};

        updateStreamSet(streamId, {
          ...sideUpdate,
          ...streamStateUpdate,
          ...haltStateUpdate,
        }, { skipStaging: true });

        // Clear loading state
        set((s) => {
          const next = new Set(s.launchingLevelKeys);
          next.delete(key);
          return { launchingLevelKeys: next };
        });

        // Re-validate staged status after state updates complete
        // Use setTimeout to ensure this runs after all state updates are applied
        setTimeout(() => checkStagingRevert(streamId), 0);
      },

      /** Per-level pause - does NOT affect Staging. FE-only. */
      pauseLevel: (streamId, side, levelIndex) => {
        const { streamSets, updateStreamSet } = get();
        const stream = streamSets.find((ss) => ss.id === streamId);
        if (!stream) return;

        const matrix = side === 'bid' ? stream.bid.spreadMatrix : stream.ask.spreadMatrix;
        const newMatrix = matrix.map((l, i) =>
          i === levelIndex ? { ...l, isActive: false } : l
        );
        
        // Check if side will have any active levels after this pause
        const sideWillHaveActiveLevels = newMatrix.some((l) => l.isActive);
        const otherSide = side === 'bid' ? stream.ask : stream.bid;
        const otherSideHasActiveLevels = otherSide.spreadMatrix.some((l) => l.isActive);
        
        // Update the paused side
        const sideUpdate = side === 'bid'
          ? {
              bid: {
                ...stream.bid,
                isActive: sideWillHaveActiveLevels,
                state: sideWillHaveActiveLevels ? stream.bid.state : ('paused' as StreamState),
                spreadMatrix: newMatrix,
              },
            }
          : {
              ask: {
                ...stream.ask,
                isActive: sideWillHaveActiveLevels,
                state: sideWillHaveActiveLevels ? stream.ask.state : ('paused' as StreamState),
                spreadMatrix: newMatrix,
              },
            };

        // Update stream state if both sides will be inactive
        const streamStateUpdate = !sideWillHaveActiveLevels && !otherSideHasActiveLevels &&
          stream.state === 'active'
          ? { state: 'paused' as StreamState }
          : {};

        updateStreamSet(streamId, {
          ...sideUpdate,
          ...streamStateUpdate,
        }, { skipStaging: true });

        // Re-validate staged status after state updates complete
        // Use setTimeout to ensure this runs after all state updates are applied
        setTimeout(() => checkStagingRevert(streamId), 0);
      },

      /** Launch all levels on one side - APPLIES staged changes and creates snapshot. Side-specific relaunch. */
      launchAllLevels: async (streamId, side) => {
        const { streamSets, updateStreamSet } = get();
        const stream = streamSets.find((ss) => ss.id === streamId);
        if (!stream) return;

        // Validate price source before launching
        if (!isPriceSourceValid(stream)) {
          set((s) => ({
            missingPriceSourceStreamIds: new Set(s.missingPriceSourceStreamIds).add(streamId),
          }));
          return;
        }

        // Side-specific manual price check: if source is manual and this side has no price,
        // show a transient error without halting the stream (other side can remain active).
        if (stream.selectedPriceSource === 'manual') {
          const manualPrice = side === 'bid' ? stream.referencePrice.manualBid : stream.referencePrice.manualAsk;
          if (manualPrice == null || manualPrice === 0) {
            set((s) => ({ manualPriceErrors: new Map(s.manualPriceErrors).set(streamId, side) }));
            return;
          }
        }
        // Clear any stale manual price error now that the price is present
        set((s) => {
          const next = new Map(s.manualPriceErrors);
          next.delete(streamId);
          return { manualPriceErrors: next };
        });

        const streamSide = side === 'bid' ? stream.bid : stream.ask;
        const maxLvls = streamSide.maxLvls ?? 1;
        if (maxLvls === 0) return; // No levels can be active

        const key = `${streamId}-${side}-launch-all`;
        set((s) => ({
          launchingLevelKeys: new Set(s.launchingLevelKeys).add(key),
        }));

        // Validate only the launched side's configuration (price, FFCH, quantity).
        // Yield crossing is checked only if the other side is already active.
        const validation = validateStreamSet(stream, side);

        if (!validation.success) {
          // If validation fails, halt the stream
          updateStreamSet(streamId, {
            state: 'halted',
            haltReason: validation.errorType as StreamSet['haltReason'],
            haltDetails: validation.error,
            bid: {
              ...stream.bid,
              state: validation.affectedSide === 'bid' || validation.affectedSide === 'both' ? 'halted' : stream.bid.state,
            },
            ask: {
              ...stream.ask,
              state: validation.affectedSide === 'ask' || validation.affectedSide === 'both' ? 'halted' : stream.ask.state,
            },
          }, { skipStaging: true });

          set((s) => {
            const next = new Set(s.launchingLevelKeys);
            next.delete(key);
            return { launchingLevelKeys: next };
          });
          return;
        }

        await new Promise((r) => setTimeout(r, 250));

        // Apply staged changes by creating side-specific snapshot
        // This updates only the launched side, preserving the other side's original snapshot
        const snapshot = createSideSnapshot(stream, side);

        const matrix = side === 'bid' ? stream.bid.spreadMatrix : stream.ask.spreadMatrix;
        const newMatrix = matrix.map((l) => ({ ...l, isActive: l.levelNumber <= maxLvls }));

        // Check if both sides will be active after this launch
        const otherSide = side === 'bid' ? stream.ask : stream.bid;
        const otherSideIsActive = otherSide.spreadMatrix.some((l) => l.isActive);
        const thisSideWillBeActive = true; // We're launching all levels on this side

        // Update the launched side
        const sideUpdate = side === 'bid'
          ? {
              bid: {
                ...stream.bid,
                isActive: true,
                state: 'active' as StreamState,
                spreadMatrix: newMatrix,
              },
            }
          : {
              ask: {
                ...stream.ask,
                isActive: true,
                state: 'active' as StreamState,
                spreadMatrix: newMatrix,
              },
            };

        // Update stream state if at least one side is active and stream was paused/halted
        const streamStateUpdate = (thisSideWillBeActive || otherSideIsActive) &&
          (stream.state === 'paused' || stream.state === 'halted')
          ? { state: 'active' as StreamState }
          : {};

        // Clear halt state when activating all levels (relaunch action)
        const haltStateUpdate = stream.state === 'halted'
          ? {
              haltReason: undefined,
              haltDetails: undefined,
            }
          : {};

        // Check if there are still staged changes on the OTHER side
        // The launched side is now in the snapshot, but the other side might still differ
        const stillHasStagedChanges = !stagingConfigEquals(stream, snapshot);

        // Apply changes: update snapshot and conditionally clear staging flag
        updateStreamSet(streamId, {
          ...sideUpdate,
          ...streamStateUpdate,
          ...haltStateUpdate,
          lastLaunchedSnapshot: snapshot,
          hasStagingChanges: stillHasStagedChanges,
        });

        // Clear loading state
        set((s) => {
          const next = new Set(s.launchingLevelKeys);
          next.delete(key);
          return { launchingLevelKeys: next };
        });
      },

      /** Pause all levels on one side - does NOT affect Staging. FE-only. */
      pauseAllLevels: async (streamId, side) => {
        const { streamSets, updateStreamSet } = get();
        const stream = streamSets.find((ss) => ss.id === streamId);
        if (!stream) return;

        const key = `${streamId}-${side}-pause-all`;
        set((s) => ({
          launchingLevelKeys: new Set(s.launchingLevelKeys).add(key),
        }));

        await new Promise((r) => setTimeout(r, 150));

        const matrix = side === 'bid' ? stream.bid.spreadMatrix : stream.ask.spreadMatrix;
        const newMatrix = matrix.map((l) => ({ ...l, isActive: false }));

        // Check if both sides will be inactive after this pause
        const otherSide = side === 'bid' ? stream.ask : stream.bid;
        const otherSideIsInactive = otherSide.spreadMatrix.every((l) => !l.isActive);
        const thisSideWillBeInactive = true; // We're pausing all levels on this side

        // Update the paused side
        const sideUpdate = side === 'bid'
          ? {
              bid: {
                ...stream.bid,
                isActive: false,
                state: 'paused' as StreamState,
                spreadMatrix: newMatrix,
              },
            }
          : {
              ask: {
                ...stream.ask,
                isActive: false,
                state: 'paused' as StreamState,
                spreadMatrix: newMatrix,
              },
            };

        // Update stream state if both sides will be inactive
        const streamStateUpdate = thisSideWillBeInactive && otherSideIsInactive
          ? { state: 'paused' as StreamState }
          : {};

        updateStreamSet(streamId, {
          ...sideUpdate,
          ...streamStateUpdate,
        }, { skipStaging: true });

        // Clear loading state
        set((s) => {
          const next = new Set(s.launchingLevelKeys);
          next.delete(key);
          return { launchingLevelKeys: next };
        });

        // Re-validate staged status after state updates complete
        // Use setTimeout to ensure this runs after all state updates are applied
        setTimeout(() => checkStagingRevert(streamId), 0);
      },

      launchAllInView: async () => {
        const filteredStreams = get().getFilteredStreamSets();
        // Launch ALL configured streams - force hard relaunches regardless of state
        // INCLUDES paused streams - they get full relaunch (not just resume)
        // Activates ALL levels in spreadMatrix to ensure no levels remain paused
        // Excludes: unconfigured (must configure first), cancelled (permanently disabled)
        const launchableStreams = filteredStreams.filter(
          (ss) => ss.state !== 'cancelled' && ss.state !== 'unconfigured'
        );

        if (launchableStreams.length === 0) return;

        // Track all streams in loading state (including paused - they get full relaunch)
        const allStreamIds = launchableStreams.map((s) => s.id);
        set((s) => ({
          isLoading: true,
          launchingStreamIds: new Set([...s.launchingStreamIds, ...allStreamIds]),
        }));

        // Launch ALL streams in parallel (including paused ones - they get full relaunch, not just resume)
        const results = await Promise.allSettled(
          launchableStreams.map((stream) => simulateLaunch(stream))
        );

        launchableStreams.forEach((stream, i) => {
          const result = results[i];
          if (result.status === 'fulfilled' && result.value.success) {
            const snapshot = createStagingSnapshot(stream);
            // Activate levels up to maxLvls per side
            const bidMaxLvls = stream.bid.maxLvls ?? 1;
            const askMaxLvls = stream.ask.maxLvls ?? 1;
            const activatedBidMatrix = stream.bid.spreadMatrix.map((l) => ({ ...l, isActive: l.levelNumber <= bidMaxLvls }));
            const activatedAskMatrix = stream.ask.spreadMatrix.map((l) => ({ ...l, isActive: l.levelNumber <= askMaxLvls }));
            
            get().updateStreamSet(stream.id, {
              state: 'active',
              bid: {
                ...stream.bid,
                isActive: true,
                state: 'active',
                spreadMatrix: activatedBidMatrix,
              },
              ask: {
                ...stream.ask,
                isActive: true,
                state: 'active',
                spreadMatrix: activatedAskMatrix,
              },
              haltReason: undefined,
              haltDetails: undefined,
              lastLaunchedSnapshot: snapshot,
              hasStagingChanges: false,
            });
          } else if (result.status === 'fulfilled' && !result.value.success) {
            const r = result.value;
            get().updateStreamSet(stream.id, {
              state: 'halted',
              haltReason: r.errorType as StreamSet['haltReason'],
              haltDetails: r.error,
              bid: {
                ...stream.bid,
                isActive: r.affectedSide !== 'bid' && r.affectedSide !== 'both',
                state: r.affectedSide === 'bid' || r.affectedSide === 'both' ? 'halted' : stream.bid.state,
              },
              ask: {
                ...stream.ask,
                isActive: r.affectedSide !== 'ask' && r.affectedSide !== 'both',
                state: r.affectedSide === 'ask' || r.affectedSide === 'both' ? 'halted' : stream.ask.state,
              },
            });
          }
        });

        // Clear loading state for all launched streams
        set((s) => {
          const next = new Set(s.launchingStreamIds);
          launchableStreams.forEach((ss) => next.delete(ss.id));
          return { isLoading: next.size > 0, launchingStreamIds: next };
        });
      },

      stopAllInView: async () => {
        const filteredStreams = get().getFilteredStreamSets();
        const activeStreams = filteredStreams.filter((ss) => ss.state === 'active');

        for (const stream of activeStreams) {
          await get().stopStream(stream.id);
        }
      },

      pauseAllInView: () => {
        const { streamSets, updateStreamSet } = get();
        const filteredStreams = get().getFilteredStreamSets();
        // Pause ALL streams that have active levels (bid or ask), regardless of stream state
        // Excludes: cancelled (permanently disabled), unconfigured (nothing to pause)
        const streamsToPause = filteredStreams.filter(
          (ss) => ss.state !== 'cancelled' && ss.state !== 'unconfigured'
        );

        streamsToPause.forEach((stream) => {
          const hasActiveBid = stream.bid.spreadMatrix.some((l) => l.isActive);
          const hasActiveAsk = stream.ask.spreadMatrix.some((l) => l.isActive);
          
          // Only pause if there are active levels
          if (hasActiveBid || hasActiveAsk) {
            const pausedBidMatrix = stream.bid.spreadMatrix.map((l) => ({ ...l, isActive: false }));
            const pausedAskMatrix = stream.ask.spreadMatrix.map((l) => ({ ...l, isActive: false }));
            
            updateStreamSet(stream.id, {
              state: 'paused',
              bid: {
                ...stream.bid,
                isActive: false,
                state: 'paused',
                spreadMatrix: pausedBidMatrix,
              },
              ask: {
                ...stream.ask,
                isActive: false,
                state: 'paused',
                spreadMatrix: pausedAskMatrix,
              },
            }, { skipStaging: true });
          }
        });
      },

      addStreamSet: (securityType) => {
        const { streamSets } = get();
        const newId = `ss-new-${Date.now()}`;
        const quoteFeeds = generateStreamQuoteFeeds();
        const newStream: StreamSet = {
          id: newId,
          securityId: `sec-new-${Date.now()}`,
          securityName: 'New Security',
          securityAlias: 'NEW',
          securityISIN: 'MXNEW000000',
          securityType,
          maturityDate: '2030-01-01',
          couponRate: 5.0,
          state: 'unconfigured',
          levels: 5,
          priceMode: 'quantity',
          quoteFeedId: undefined,
          quoteFeedName: undefined,
          quoteFeeds,
          selectedPriceSource: 'manual',
          referencePrice: {
            source: 'manual',
            value: 0,
            timestamp: new Date().toISOString(),
            isOverride: false,
          },
          bid: {
            isActive: false,
            levelsToLaunch: 0,
            maxLvls: 1,
            spreadMatrix: Array.from({ length: 5 }, (_, i) => ({
              levelNumber: i + 1,
              deltaBps: (i + 1) * 0.5,
              quantity: 1000,
            })),
          },
          ask: {
            isActive: false,
            levelsToLaunch: 0,
            maxLvls: 1,
            spreadMatrix: Array.from({ length: 5 }, (_, i) => ({
              levelNumber: i + 1,
              deltaBps: -(i + 1) * 0.5,
              quantity: 1000,
            })),
          },
        };

        set({ streamSets: [...streamSets, newStream], selectedStreamId: newId });
      },

      addSecuritiesBatch: (securities) => {
        const { streamSets, preferences } = get();
        const now = Date.now();
        const levels = preferences.defaultLevels || 5;

        const newStreams: StreamSet[] = securities.map((sec, i) => {
          const id = `ss-${sec.id}-${now + i}`;
          const quoteFeeds = generateStreamQuoteFeeds();
          return {
            id,
            securityId: sec.id,
            securityName: sec.name,
            securityAlias: sec.alias,
            securityISIN: sec.isin,
            securityType: sec.type,
            maturityDate: sec.maturity,
            couponRate: sec.couponRate,
            state: 'unconfigured',
            levels,
            priceMode: 'quantity',
            quoteFeedId: undefined,
            quoteFeedName: undefined,
            quoteFeeds,
            selectedPriceSource: 'manual',
            referencePrice: {
              source: 'manual',
              value: 0,
              timestamp: new Date().toISOString(),
              isOverride: false,
            },
            bid: {
              isActive: false,
              levelsToLaunch: 0,
              maxLvls: 1,
              spreadMatrix: Array.from({ length: levels }, (_, idx) => ({
                levelNumber: idx + 1,
                deltaBps: (idx + 1) * 0.5,
                quantity: 1000,
              })),
            },
            ask: {
              isActive: false,
              levelsToLaunch: 0,
              maxLvls: 1,
              spreadMatrix: Array.from({ length: levels }, (_, idx) => ({
                levelNumber: idx + 1,
                deltaBps: -(idx + 1) * 0.5,
                quantity: 1000,
              })),
            },
          };
        });

        set({ streamSets: [...streamSets, ...newStreams] });
      },

      deleteStreamSet: (id) =>
        set((state) => ({
          streamSets: state.streamSets.filter((ss) => ss.id !== id),
          selectedStreamId: state.selectedStreamId === id ? null : state.selectedStreamId,
        })),

      configureStream: (id, config) => {
        const { streamSets, updateStreamSet } = get();
        const stream = streamSets.find((ss) => ss.id === id);
        if (!stream) return;

        // When configuring, transition to staging state
        updateStreamSet(id, {
          ...config,
          state: 'staging',
        });
      },

      /** Batch update Price Source for all streams in current view/section. 
       * Uses atomic state update to ensure consistency.
       * When securityType is provided (in All view sections), only updates streams of that type.
       * IMPORTANT: Always assigns the EXACT selected price source to ALL streams - no fallback logic.
       * This ensures consistent batch updates where all streams get the same selection.
       * If a stream doesn't have the selected QF in quoteFeeds, it's added to ensure validity. */
      batchUpdatePriceSource: (selectedPriceSource, securityType) => {
        const { getFilteredStreamSets } = get();
        let streams = getFilteredStreamSets();
        
        // When securityType is provided (in All view sections), filter to just that type
        if (securityType) {
          streams = streams.filter((s) => s.securityType === securityType);
        }
        
        const isManual = selectedPriceSource === 'manual';
        const timestamp = new Date().toISOString();
        
        // For QF selections, find a reference feed from any stream that has it
        // This is used to populate quoteFeeds for streams that don't have this QF
        let referenceFeed: StreamQuoteFeed | null = null;
        if (!isManual) {
          for (const s of streams) {
            const found = s.quoteFeeds?.find((f) => f.feedId === selectedPriceSource);
            if (found) {
              referenceFeed = found;
              break;
            }
          }
          // If not found in filtered streams, check all streams
          if (!referenceFeed) {
            for (const s of get().streamSets) {
              const found = s.quoteFeeds?.find((f) => f.feedId === selectedPriceSource);
              if (found) {
                referenceFeed = found;
                break;
              }
            }
          }
        }

        // Single atomic state update
        set((state) => {
          const streamIds = new Set(streams.map((s) => s.id));
          const nextStreamSets = state.streamSets.map((stream) => {
            // Only update streams in the current filtered view
            if (!streamIds.has(stream.id)) return stream;

            if (isManual) {
              // Manual: preserve current displayed values
              const currentFeed = stream.quoteFeeds?.find((f) => f.feedId === stream.selectedPriceSource);
              const currentBid = currentFeed?.bid ?? stream.referencePrice.manualBid ?? stream.referencePrice.value;
              const currentAsk = currentFeed?.ask ?? stream.referencePrice.manualAsk ?? stream.referencePrice.value;
              
              return {
                ...stream,
                selectedPriceSource: 'manual',
                quoteFeedId: undefined,
                quoteFeedName: undefined,
                referencePrice: {
                  ...stream.referencePrice,
                  source: 'manual',
                  value: stream.referencePrice.value || currentBid,
                  manualBid: currentBid,
                  manualAsk: currentAsk,
                },
                hasStagingChanges: true,
              };
            } else {
              // QF selection: Find the selected feed in this stream's quoteFeeds
              let feed = stream.quoteFeeds?.find((f) => f.feedId === selectedPriceSource);
              let updatedQuoteFeeds = stream.quoteFeeds;
              
              // If stream doesn't have this QF, add it from reference (ensures isPriceSourceValid passes)
              if (!feed && referenceFeed) {
                // Clone the reference feed for this stream
                feed = { ...referenceFeed };
                updatedQuoteFeeds = [...(stream.quoteFeeds || []), feed];
              } else if (!feed) {
                // No reference available - create a placeholder feed entry
                // This ensures the QF is recognized as valid even without live data
                feed = {
                  feedId: selectedPriceSource,
                  feedName: selectedPriceSource,
                  bid: stream.referencePrice.value || 0,
                  ask: stream.referencePrice.value || 0,
                };
                updatedQuoteFeeds = [...(stream.quoteFeeds || []), feed];
              }
              
              const bidValue = feed.bid ?? stream.referencePrice.value;
              
              return {
                ...stream,
                // Always use the user's exact selection
                selectedPriceSource: selectedPriceSource,
                quoteFeedId: selectedPriceSource,
                quoteFeedName: feed.feedName ?? selectedPriceSource,
                quoteFeeds: updatedQuoteFeeds,
                referencePrice: {
                  ...stream.referencePrice,
                  source: 'live',
                  value: bidValue,
                  timestamp,
                },
                hasStagingChanges: true,
              };
            }
          });

          return { streamSets: nextStreamSets };
        });
      },

      /** Batch update Price Mode (Qty ↔ Notional) for all streams in current view/section.
       * When securityType is provided (in All view sections), only updates streams of that type. */
      batchUpdatePriceMode: (priceMode, securityType) => {
        const { getFilteredStreamSets, updateStreamSet } = get();
        let streams = getFilteredStreamSets();
        
        // When securityType is provided (in All view sections), filter to just that type
        if (securityType) {
          streams = streams.filter((s) => s.securityType === securityType);
        }
        
        streams.forEach((stream) => {
          updateStreamSet(stream.id, { priceMode });
        });
      },

      /** Batch update MAX Lvls for all streams in current view. Triggers staged mode per stream. */
      batchUpdateMaxLvls: (bidMaxLvls, askMaxLvls) => {
        const { getFilteredStreamSets, updateStreamSet } = get();
        const streams = getFilteredStreamSets();
        streams.forEach((stream) => {
          const origBid = stream.lastLaunchedSnapshot?.bid.maxLvls ?? 1;
          const origAsk = stream.lastLaunchedSnapshot?.ask.maxLvls ?? 1;
          if (bidMaxLvls === origBid && askMaxLvls === origAsk) return;
          updateStreamSet(stream.id, {
            bid: { ...stream.bid, maxLvls: bidMaxLvls },
            ask: { ...stream.ask, maxLvls: askMaxLvls },
          });
        });
      },

      batchUpdateQty: (bidQty, askQty) => {
        const { getFilteredStreamSets, updateStreamSet } = get();
        const streams = getFilteredStreamSets();
        streams.forEach((stream) => {
          const newBidMatrix = stream.bid.spreadMatrix.map((l) => ({ ...l, quantity: bidQty }));
          const newAskMatrix = stream.ask.spreadMatrix.map((l) => ({ ...l, quantity: askQty }));
          updateStreamSet(stream.id, {
            bid: { ...stream.bid, spreadMatrix: newBidMatrix },
            ask: { ...stream.ask, spreadMatrix: newAskMatrix },
          });
        });
      },

      /** Revert staged changes to last launched snapshot. Preserves runtime state (isActive). */
      revertStagingChanges: (id) => {
        const { streamSets, updateStreamSet } = get();
        const stream = streamSets.find((ss) => ss.id === id);
        if (!stream?.hasStagingChanges || !stream.lastLaunchedSnapshot) return;

        clearTimeout(revertDebounceTimers[id]);
        delete revertDebounceTimers[id];

        const snap = stream.lastLaunchedSnapshot;
        const bidMatrix = stream.bid.spreadMatrix.map((curr, i) => {
          const s = snap.bid.spreadMatrix[i];
          return s ? { ...curr, levelNumber: s.levelNumber, deltaBps: s.deltaBps, quantity: s.quantity } : curr;
        });
        const askMatrix = stream.ask.spreadMatrix.map((curr, i) => {
          const s = snap.ask.spreadMatrix[i];
          return s ? { ...curr, levelNumber: s.levelNumber, deltaBps: s.deltaBps, quantity: s.quantity } : curr;
        });

        const feed = snap.selectedPriceSource !== 'manual'
          ? stream.quoteFeeds?.find((f) => f.feedId === snap.selectedPriceSource)
          : undefined;

        const bidMaxLvls = snap.bid.maxLvls ?? 1;
        const askMaxLvls = snap.ask.maxLvls ?? 1;

        // Clear halt state when reverting to last successful launch snapshot
        // The snapshot represents a valid state that was successfully launched
        updateStreamSet(id, {
          bid: { ...stream.bid, spreadMatrix: bidMatrix, maxLvls: bidMaxLvls },
          ask: { ...stream.ask, spreadMatrix: askMatrix, maxLvls: askMaxLvls },
          selectedPriceSource: snap.selectedPriceSource,
          priceMode: snap.priceMode,
          referencePrice: { ...snap.referencePrice },
          quoteFeedId: feed?.feedId,
          quoteFeedName: feed?.feedName,
          bidSelectedPriceSource: snap.bidSelectedPriceSource,
          askSelectedPriceSource: snap.askSelectedPriceSource,
          bidReferencePrice: snap.bidReferencePrice ? { ...snap.bidReferencePrice } : undefined,
          askReferencePrice: snap.askReferencePrice ? { ...snap.askReferencePrice } : undefined,
          hasStagingChanges: false,
          haltReason: undefined,
          haltDetails: undefined,
        }, { skipStaging: true });
      },

      /** Clear the missing price source error for a stream */
      clearMissingPriceSourceError: (id) => {
        set((s) => {
          const next = new Set(s.missingPriceSourceStreamIds);
          next.delete(id);
          return { missingPriceSourceStreamIds: next };
        });
      },

      clearManualPriceError: (id) => {
        set((s) => {
          const next = new Map(s.manualPriceErrors);
          next.delete(id);
          return { manualPriceErrors: next };
        });
      },

      /** Batch revert all staged changes in current view to last launched snapshots. */
      batchRevertStagingChanges: () => {
        const { getFilteredStreamSets } = get();
        const streams = getFilteredStreamSets();
        
        // Filter to only streams with staging changes and snapshots
        const streamsToRevert = streams.filter(
          (s) => s.hasStagingChanges && s.lastLaunchedSnapshot
        );

        if (streamsToRevert.length === 0) return;

        // Clear all debounce timers for streams being reverted
        streamsToRevert.forEach((stream) => {
          clearTimeout(revertDebounceTimers[stream.id]);
          delete revertDebounceTimers[stream.id];
        });

        // Single atomic state update
        set((state) => {
          const streamIds = new Set(streamsToRevert.map((s) => s.id));
          const nextStreamSets = state.streamSets.map((stream) => {
            if (!streamIds.has(stream.id) || !stream.hasStagingChanges || !stream.lastLaunchedSnapshot) {
              return stream;
            }

            const snap = stream.lastLaunchedSnapshot;
            const bidMatrix = stream.bid.spreadMatrix.map((curr, i) => {
              const s = snap.bid.spreadMatrix[i];
              return s ? { ...curr, levelNumber: s.levelNumber, deltaBps: s.deltaBps, quantity: s.quantity } : curr;
            });
            const askMatrix = stream.ask.spreadMatrix.map((curr, i) => {
              const s = snap.ask.spreadMatrix[i];
              return s ? { ...curr, levelNumber: s.levelNumber, deltaBps: s.deltaBps, quantity: s.quantity } : curr;
            });

            const feed = snap.selectedPriceSource !== 'manual'
              ? stream.quoteFeeds?.find((f) => f.feedId === snap.selectedPriceSource)
              : undefined;

            const bidMaxLvls = snap.bid.maxLvls ?? 1;
            const askMaxLvls = snap.ask.maxLvls ?? 1;

            return {
              ...stream,
              bid: { ...stream.bid, spreadMatrix: bidMatrix, maxLvls: bidMaxLvls },
              ask: { ...stream.ask, spreadMatrix: askMatrix, maxLvls: askMaxLvls },
              selectedPriceSource: snap.selectedPriceSource,
              priceMode: snap.priceMode,
              referencePrice: { ...snap.referencePrice },
              quoteFeedId: feed?.feedId,
              quoteFeedName: feed?.feedName,
              bidSelectedPriceSource: snap.bidSelectedPriceSource,
              askSelectedPriceSource: snap.askSelectedPriceSource,
              bidReferencePrice: snap.bidReferencePrice ? { ...snap.bidReferencePrice } : undefined,
              askReferencePrice: snap.askReferencePrice ? { ...snap.askReferencePrice } : undefined,
              hasStagingChanges: false,
            };
          });

          return { streamSets: nextStreamSets };
        });
      },

      /** Apply staged changes for all staged streams in current view. */
      batchApplyChanges: async () => {
        const { getFilteredStreamSets, applyChanges } = get();
        const stagedStreams = getFilteredStreamSets().filter((s) => s.hasStagingChanges);
        await Promise.all(stagedStreams.map((s) => applyChanges(s.id)));
      },

      adjustSpreadBid: (delta) => {
        const filteredStreams = get().getFilteredStreamSets();
        set((state) => ({
          streamSets: state.streamSets.map((ss) => {
            if (!filteredStreams.find((fs) => fs.id === ss.id)) return ss;
            return {
              ...ss,
              hasStagingChanges: true,
              bid: {
                ...ss.bid,
                spreadMatrix: ss.bid.spreadMatrix.map((level) => ({
                  ...level,
                  deltaBps: level.deltaBps + delta,
                })),
              },
            };
          }),
        }));
      },

      adjustSpreadAsk: (delta) => {
        const filteredStreams = get().getFilteredStreamSets();
        set((state) => ({
          streamSets: state.streamSets.map((ss) => {
            if (!filteredStreams.find((fs) => fs.id === ss.id)) return ss;
            return {
              ...ss,
              hasStagingChanges: true,
              ask: {
                ...ss.ask,
                spreadMatrix: ss.ask.spreadMatrix.map((level) => ({
                  ...level,
                  deltaBps: level.deltaBps + delta,
                })),
              },
            };
          }),
        }));
      },

      // Type-scoped batch spread adjustments (for column header popovers)
      getStreamsForBatchSpread: (securityType) => {
        const { streamSets, activeTab } = get();
        if (securityType) {
          // All view: filter by specific section type
          return streamSets.filter((s) => s.securityType === securityType);
        }
        // Individual view: use standard filtered streams
        return get().getFilteredStreamSets();
      },

      adjustSpreadForType: (side, delta, securityType) => {
        const targetStreams = get().getStreamsForBatchSpread(securityType);
        const targetIds = new Set(targetStreams.map((s) => s.id));
        
        set((state) => ({
          streamSets: state.streamSets.map((ss) => {
            if (!targetIds.has(ss.id)) return ss;
            const sideData = side === 'bid' ? ss.bid : ss.ask;
            const updatedMatrix = sideData.spreadMatrix.map((level) => ({
              ...level,
              deltaBps: level.deltaBps + delta,
            }));
            return {
              ...ss,
              hasStagingChanges: true,
              [side]: {
                ...sideData,
                spreadMatrix: updatedMatrix,
              },
            };
          }),
        }));
      },

      resetSpreadsForType: (side, securityType) => {
        const targetStreams = get().getStreamsForBatchSpread(securityType);
        const targetIds = new Set(targetStreams.map((s) => s.id));
        // Get default spreads from localStorage (or use fallback)
        const getDefaultSpreads = () => {
          try {
            const raw = localStorage.getItem('default-spread-values');
            if (raw) {
              const parsed = JSON.parse(raw);

              // Handle old format: plain array [0, 1, 2, 3, 4]
              // Return migrated data but don't save (to avoid side effects)
              if (Array.isArray(parsed) && parsed.length === 5 && parsed.every((v: unknown) => typeof v === 'number')) {
                return {
                  bid: [...parsed],
                  ask: parsed.map((v) => -Math.abs(v)),
                };
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
                return parsed as { bid: number[]; ask: number[] };
              }
            }
          } catch {
            // Fall through to default
          }
          return { bid: [0, 1, 2, 3, 4], ask: [0, -1, -2, -3, -4] }; // Default fallback
        };
        const defaultSpreads = getDefaultSpreads();

        set((state) => ({
          streamSets: state.streamSets.map((ss) => {
            if (!targetIds.has(ss.id)) return ss;
            const sideData = side === 'bid' ? ss.bid : ss.ask;
            const sideDefaults = side === 'bid' ? defaultSpreads.bid : defaultSpreads.ask;
            const updatedMatrix = sideData.spreadMatrix.map((level, i) => ({
              ...level,
              deltaBps: sideDefaults[i] ?? 0,
            }));
            return {
              ...ss,
              hasStagingChanges: true,
              [side]: {
                ...sideData,
                spreadMatrix: updatedMatrix,
              },
            };
          }),
        }));
      },

      revertSpreadsForType: (side, securityType) => {
        const targetStreams = get().getStreamsForBatchSpread(securityType);
        const targetIds = new Set(targetStreams.map((s) => s.id));
        
        set((state) => ({
          streamSets: state.streamSets.map((ss) => {
            if (!targetIds.has(ss.id)) return ss;
            // Only revert if we have a snapshot to revert to
            if (!ss.lastLaunchedSnapshot) return ss;
            
            const snap = ss.lastLaunchedSnapshot;
            const snapMatrix = side === 'bid' ? snap.bid.spreadMatrix : snap.ask.spreadMatrix;
            const sideData = side === 'bid' ? ss.bid : ss.ask;
            
            // Restore spread values from snapshot
            const revertedMatrix = sideData.spreadMatrix.map((level, i) => {
              const snapLevel = snapMatrix[i];
              return snapLevel
                ? { ...level, deltaBps: snapLevel.deltaBps }
                : level;
            });
            
            // Check if the other side has staging changes
            const otherSide = side === 'bid' ? 'ask' : 'bid';
            const otherSideData = ss[otherSide];
            const otherSnapMatrix = side === 'bid' ? snap.ask.spreadMatrix : snap.bid.spreadMatrix;
            const otherSideHasChanges = otherSideData.spreadMatrix.some((level, i) => {
              const snapLevel = otherSnapMatrix[i];
              return snapLevel && level.deltaBps !== snapLevel.deltaBps;
            });
            
            // Also check other staging fields
            const hasOtherStagingChanges = otherSideHasChanges ||
              ss.selectedPriceSource !== snap.selectedPriceSource ||
              ss.priceMode !== snap.priceMode ||
              ss.bid.maxLvls !== snap.bid.maxLvls ||
              ss.ask.maxLvls !== snap.ask.maxLvls;
            
            return {
              ...ss,
              hasStagingChanges: hasOtherStagingChanges,
              [side]: {
                ...sideData,
                spreadMatrix: revertedMatrix,
              },
            };
          }),
        }));
      },

      generateDemoData: (type: DemoStreamType = 'new_stream') => {
        const { streamSets, activeTab } = get();

        // Generate 1 new demo stream of specified type (additive only - never replace existing)
        // Context-aware: use activeTab so generated streams match current view (e.g. Corporate UDI → Corporate UDI streams)
        const newDemoStreams = generateAdditiveDemoStreams(1, type, activeTab);

        // Append new streams to existing ones (preserve all user-configured data)
        const updatedStreamSets = [...streamSets, ...newDemoStreams];

        set({
          streamSets: updatedStreamSets,
          isLoading: false,
        });
      },

      // Launch progress actions
      launchAllWithProgress: async (variant, securityType) => {
        const { getFilteredStreamSets, updateStreamSet } = get();
        let streams = getFilteredStreamSets();
        
        // Filter by security type if provided (for section-specific launches in All view)
        if (securityType) {
          streams = streams.filter((s) => s.securityType === securityType);
        }
        
        // Filter to launchable streams
        const launchableStreams = streams.filter(
          (ss) => ss.state !== 'cancelled' && ss.state !== 'unconfigured'
        );
        
        if (launchableStreams.length === 0) return;
        
        // Initialize progress state with order counts based on maxLvls and variant
        const progressItems: LaunchProgressItem[] = launchableStreams.map((s) => {
          const bidMaxLvls = s.bid.maxLvls ?? 1;
          const askMaxLvls = s.ask.maxLvls ?? 1;
          // Calculate expected order counts based on launch variant
          const bidCount = (variant === 'all' || variant === 'bid') ? bidMaxLvls : 0;
          const askCount = (variant === 'all' || variant === 'ask') ? askMaxLvls : 0;
          return {
            streamId: s.id,
            streamName: s.securityAlias || s.securityName,
            status: 'pending' as const,
            bidCount,
            askCount,
            securityType: s.securityType,
          };
        });
        
        set({
          launchProgress: {
            isActive: true,
            items: progressItems,
            completedCount: 0,
            totalCount: launchableStreams.length,
            variant,
            startTime: Date.now(),
          },
          isLoading: true,
          launchingStreamIds: new Set(launchableStreams.map((s) => s.id)),
        });
        
        // Process streams in small batches (2-3 at a time) for smooth animation
        const BATCH_SIZE = 2;
        const STAGGER_DELAY = 150; // ms between starting each stream in batch
        
        for (let i = 0; i < launchableStreams.length; i += BATCH_SIZE) {
          const batch = launchableStreams.slice(i, i + BATCH_SIZE);
          
          // Process batch with staggered starts for smoother animation
          const batchPromises = batch.map(async (stream, batchIndex) => {
            // Stagger the start of each stream in the batch
            await new Promise((resolve) => setTimeout(resolve, batchIndex * STAGGER_DELAY));
            
            // Update to processing state
            set((s) => {
              if (!s.launchProgress) return s;
              const items = s.launchProgress.items.map((item) =>
                item.streamId === stream.id
                  ? { ...item, status: 'processing' as const, startTime: Date.now() }
                  : item
              );
              return { launchProgress: { ...s.launchProgress, items } };
            });
            
            // Validate price source before launching
            if (!isPriceSourceValid(stream)) {
              set((s) => {
                if (!s.launchProgress) return s;
                const items = s.launchProgress.items.map((item) =>
                  item.streamId === stream.id
                    ? { ...item, status: 'error' as const, error: 'Missing price source', endTime: Date.now() }
                    : item
                );
                const completedCount = items.filter((item) => item.status === 'success' || item.status === 'error').length;
                return { 
                  launchProgress: { ...s.launchProgress, items, completedCount },
                  missingPriceSourceStreamIds: new Set(s.missingPriceSourceStreamIds).add(stream.id),
                };
              });
              return;
            }
            
            try {
              // Simulate launch (add slight delay for animation smoothness)
              const result = await simulateLaunch(stream);
              
              if (result.success) {
                const snapshot = createStagingSnapshot(stream);
                const bidMaxLvls = stream.bid.maxLvls ?? 1;
                const askMaxLvls = stream.ask.maxLvls ?? 1;
                
                // Determine which side(s) to activate based on variant
                let activateBid = variant === 'all' || variant === 'bid';
                let activateAsk = variant === 'all' || variant === 'ask';
                
                const activatedBidMatrix = stream.bid.spreadMatrix.map((l) => ({
                  ...l,
                  isActive: activateBid && l.levelNumber <= bidMaxLvls,
                }));
                const activatedAskMatrix = stream.ask.spreadMatrix.map((l) => ({
                  ...l,
                  isActive: activateAsk && l.levelNumber <= askMaxLvls,
                }));
                
                updateStreamSet(stream.id, {
                  state: 'active',
                  bid: {
                    ...stream.bid,
                    isActive: activateBid,
                    state: 'active',
                    spreadMatrix: activatedBidMatrix,
                  },
                  ask: {
                    ...stream.ask,
                    isActive: activateAsk,
                    state: 'active',
                    spreadMatrix: activatedAskMatrix,
                  },
                  haltReason: undefined,
                  haltDetails: undefined,
                  lastLaunchedSnapshot: snapshot,
                  hasStagingChanges: false,
                });
                
                // Update to success state
                set((s) => {
                  if (!s.launchProgress) return s;
                  const items = s.launchProgress.items.map((item) =>
                    item.streamId === stream.id
                      ? { ...item, status: 'success' as const, endTime: Date.now() }
                      : item
                  );
                  const completedCount = items.filter((item) => item.status === 'success' || item.status === 'error').length;
                  return { launchProgress: { ...s.launchProgress, items, completedCount } };
                });
              } else {
                // Handle launch failure
                updateStreamSet(stream.id, {
                  state: 'halted',
                  haltReason: result.errorType as StreamSet['haltReason'],
                  haltDetails: result.error,
                  bid: {
                    ...stream.bid,
                    isActive: result.affectedSide !== 'bid' && result.affectedSide !== 'both',
                    state: result.affectedSide === 'bid' || result.affectedSide === 'both' ? 'halted' : stream.bid.state,
                  },
                  ask: {
                    ...stream.ask,
                    isActive: result.affectedSide !== 'ask' && result.affectedSide !== 'both',
                    state: result.affectedSide === 'ask' || result.affectedSide === 'both' ? 'halted' : stream.ask.state,
                  },
                });
                
                // Update to error state
                set((s) => {
                  if (!s.launchProgress) return s;
                  const items = s.launchProgress.items.map((item) =>
                    item.streamId === stream.id
                      ? { ...item, status: 'error' as const, error: result.error, endTime: Date.now() }
                      : item
                  );
                  const completedCount = items.filter((item) => item.status === 'success' || item.status === 'error').length;
                  return { launchProgress: { ...s.launchProgress, items, completedCount } };
                });
              }
            } catch (err) {
              // Handle unexpected errors
              set((s) => {
                if (!s.launchProgress) return s;
                const items = s.launchProgress.items.map((item) =>
                  item.streamId === stream.id
                    ? { ...item, status: 'error' as const, error: 'Unexpected error', endTime: Date.now() }
                    : item
                );
                const completedCount = items.filter((item) => item.status === 'success' || item.status === 'error').length;
                return { launchProgress: { ...s.launchProgress, items, completedCount } };
              });
            }
          });
          
          // Wait for batch to complete before starting next batch
          await Promise.all(batchPromises);
        }
        
        // Mark launch progress as complete (stays visible until user dismisses)
        set((s) => ({
          isLoading: false,
          launchingStreamIds: new Set(),
          launchProgress: s.launchProgress ? { ...s.launchProgress, isActive: false } : null,
        }));
      },
      
      dismissLaunchProgress: () => {
        set({ launchProgress: null });
      },
      
      // Pause progress actions
      pauseAllWithProgress: async (variant, securityType) => {
        const { getFilteredStreamSets, updateStreamSet } = get();
        let streams = getFilteredStreamSets();
        
        // Filter by security type if provided (for section-specific pauses in All view)
        if (securityType) {
          streams = streams.filter((s) => s.securityType === securityType);
        }
        
        // Filter to pausable streams (not cancelled/unconfigured, and have active levels)
        const pausableStreams = streams.filter((ss) => {
          if (ss.state === 'cancelled' || ss.state === 'unconfigured') return false;
          const hasActiveBid = ss.bid.spreadMatrix.some((l) => l.isActive);
          const hasActiveAsk = ss.ask.spreadMatrix.some((l) => l.isActive);
          // For bid/ask variant, only include streams with active levels on that side
          if (variant === 'bid') return hasActiveBid;
          if (variant === 'ask') return hasActiveAsk;
          return hasActiveBid || hasActiveAsk;
        });
        
        if (pausableStreams.length === 0) return;
        
        // Initialize progress state with order counts based on active levels and variant
        const progressItems: PauseProgressItem[] = pausableStreams.map((s) => {
          const activeBidCount = s.bid.spreadMatrix.filter((l) => l.isActive).length;
          const activeAskCount = s.ask.spreadMatrix.filter((l) => l.isActive).length;
          // Calculate expected order counts based on pause variant
          const bidCount = (variant === 'all' || variant === 'bid') ? activeBidCount : 0;
          const askCount = (variant === 'all' || variant === 'ask') ? activeAskCount : 0;
          return {
            streamId: s.id,
            streamName: s.securityAlias || s.securityName,
            status: 'pending' as const,
            bidCount,
            askCount,
            securityType: s.securityType,
          };
        });
        
        set({
          pauseProgress: {
            isActive: true,
            items: progressItems,
            completedCount: 0,
            totalCount: pausableStreams.length,
            variant,
            startTime: Date.now(),
          },
        });
        
        // Process streams in small batches (2-3 at a time) for smooth animation
        const BATCH_SIZE = 2;
        const STAGGER_DELAY = 100; // ms between starting each stream in batch (faster than launch)
        
        for (let i = 0; i < pausableStreams.length; i += BATCH_SIZE) {
          const batch = pausableStreams.slice(i, i + BATCH_SIZE);
          
          // Process batch with staggered starts for smoother animation
          const batchPromises = batch.map(async (stream, batchIndex) => {
            // Stagger the start of each stream in the batch
            await new Promise((resolve) => setTimeout(resolve, batchIndex * STAGGER_DELAY));
            
            // Update to processing state
            set((s) => {
              if (!s.pauseProgress) return s;
              const items = s.pauseProgress.items.map((item) =>
                item.streamId === stream.id
                  ? { ...item, status: 'processing' as const, startTime: Date.now() }
                  : item
              );
              return { pauseProgress: { ...s.pauseProgress, items } };
            });
            
            try {
              // Small delay for visual feedback
              await new Promise((resolve) => setTimeout(resolve, 80));
              
              // Determine which sides to pause based on variant
              const pauseBid = variant === 'all' || variant === 'bid';
              const pauseAsk = variant === 'all' || variant === 'ask';
              
              const pausedBidMatrix = stream.bid.spreadMatrix.map((l) => ({
                ...l,
                isActive: pauseBid ? false : l.isActive,
              }));
              const pausedAskMatrix = stream.ask.spreadMatrix.map((l) => ({
                ...l,
                isActive: pauseAsk ? false : l.isActive,
              }));
              
              // Check if stream will be fully paused after this operation
              const bidWillBeActive = pausedBidMatrix.some((l) => l.isActive);
              const askWillBeActive = pausedAskMatrix.some((l) => l.isActive);
              const willBePaused = !bidWillBeActive && !askWillBeActive;
              
              updateStreamSet(stream.id, {
                state: willBePaused ? 'paused' : stream.state,
                bid: {
                  ...stream.bid,
                  isActive: bidWillBeActive,
                  state: pauseBid ? 'paused' : stream.bid.state,
                  spreadMatrix: pausedBidMatrix,
                },
                ask: {
                  ...stream.ask,
                  isActive: askWillBeActive,
                  state: pauseAsk ? 'paused' : stream.ask.state,
                  spreadMatrix: pausedAskMatrix,
                },
              }, { skipStaging: true });
              
              // Update to success state
              set((s) => {
                if (!s.pauseProgress) return s;
                const items = s.pauseProgress.items.map((item) =>
                  item.streamId === stream.id
                    ? { ...item, status: 'success' as const, endTime: Date.now() }
                    : item
                );
                const completedCount = items.filter((item) => item.status === 'success' || item.status === 'error').length;
                return { pauseProgress: { ...s.pauseProgress, items, completedCount } };
              });
            } catch (err) {
              // Handle unexpected errors
              set((s) => {
                if (!s.pauseProgress) return s;
                const items = s.pauseProgress.items.map((item) =>
                  item.streamId === stream.id
                    ? { ...item, status: 'error' as const, error: 'Unexpected error', endTime: Date.now() }
                    : item
                );
                const completedCount = items.filter((item) => item.status === 'success' || item.status === 'error').length;
                return { pauseProgress: { ...s.pauseProgress, items, completedCount } };
              });
            }
          });
          
          // Wait for batch to complete before starting next batch
          await Promise.all(batchPromises);
        }
        
        // Mark pause progress as complete (stays visible until user dismisses)
        set((s) => ({
          pauseProgress: s.pauseProgress ? { ...s.pauseProgress, isActive: false } : null,
        }));
      },
      
      dismissPauseProgress: () => {
        set({ pauseProgress: null });
      },

      resetState: () => {
        set({
          streamSets: generateInitialStreamSets(),
          selectedStreamId: null,
          expandedStreamIds: new Set(),
          activeTab: 'All',
          searchQuery: '',
          isLoading: false,
          launchProgress: null,
          pauseProgress: null,
        });
      },

      getFilteredStreamSets: () => {
        const { streamSets, activeTab, searchQuery, preferences } = get();
        let filtered = streamSets;

        // Filter by tab
        if (activeTab !== 'All') {
          filtered = filtered.filter((ss) => ss.securityType === activeTab);
        }

        // Filter by search query (case-insensitive contains)
        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          const statusLabels: Record<StreamState, string> = {
            active: 'active',
            paused: 'paused',
            staging: 'staging',
            halted: 'halted',
            unconfigured: 'unconfigured',
            cancelled: 'cancelled',
          };
          filtered = filtered.filter((ss) => {
            const matchStr = [
              ss.securityName,
              ss.securityAlias,
              ss.securityISIN,
              ss.id,
              statusLabels[ss.state],
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();
            return matchStr.includes(query);
          });
        }

        // Hide disabled streams if preference set
        if (!preferences.showDisabledStreams) {
          filtered = filtered.filter((ss) => ss.state !== 'cancelled');
        }

        // Sort
        if (preferences.sortOrder === 'maturity-asc') {
          filtered = [...filtered].sort(
            (a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime()
          );
        } else if (preferences.sortOrder === 'maturity-desc') {
          filtered = [...filtered].sort(
            (a, b) => new Date(b.maturityDate).getTime() - new Date(a.maturityDate).getTime()
          );
        }

        return filtered;
      },

      getStreamsByType: (type) => {
        return get().streamSets.filter((ss) => ss.securityType === type);
      },

      hasStagedStreamsInView: () => {
        const streams = get().getFilteredStreamSets();
        // Only true when streams have actual pending edits — drives Cancel/Apply action buttons.
        // Intentionally excludes streams that are in 'staging'/'halted' state but have no
        // pending edits (hasStagingChanges: false), which would be a false positive because
        // batchRevertStagingChanges and batchApplyChanges both guard on hasStagingChanges too.
        return streams.some((s) => !!s.hasStagingChanges);
      },
    }),
    {
      name: 'cob-stream-storage',
      partialize: (state) => ({
        streamSets: state.streamSets,
        preferences: state.preferences,
        activeTab: state.activeTab,
        accordionOpenSections: state.accordionOpenSections,
      }),
    }
  )
);

// Simulate price updates for active streams
let priceUpdateInterval: number | null = null;

export function startPriceSimulation() {
  if (priceUpdateInterval) return;

  priceUpdateInterval = window.setInterval(() => {
    const { streamSets, updateStreamSet } = useStreamStore.getState();

    streamSets.forEach((ss) => {
      if (ss.state === 'active' && ss.referencePrice.source === 'live') {
        // Random price movement ±0.005%
        const delta = (Math.random() - 0.5) * 0.01;
        const newValue = Math.max(0, ss.referencePrice.value + delta);

        updateStreamSet(
          ss.id,
          {
            referencePrice: {
              ...ss.referencePrice,
              value: newValue,
              timestamp: new Date().toISOString(),
            },
          },
          { skipStaging: true }
        );
      }
    });
  }, 3000);
}

export function stopPriceSimulation() {
  if (priceUpdateInterval) {
    clearInterval(priceUpdateInterval);
    priceUpdateInterval = null;
  }
}
