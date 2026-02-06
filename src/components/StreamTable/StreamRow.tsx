import { useMemo, useCallback, useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, ChevronDown, ChevronRight, Clock, Loader2, Minus, Pause, Play, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { StreamSet, StreamSide, StreamState, Level, StagingSnapshot } from '../../types/streamSet';
import { getActiveLevelCount, getBestActiveLevel } from '../../lib/utils';

import { useStreamStore } from '../../hooks/useStreamStore';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { StatusBadge } from '../StateIndicators/StatusBadge';
import { ValidationBanner } from '../StateIndicators/ValidationBanner';
import { cn, formatNumber, formatQuantity, formatQuantityFull, isUdiSecurity, getVolumeLabel, getNotionalToggleLabel } from '../../lib/utils';
import { CompactSelect, type CompactSelectOption } from '../ui/compact-select';
import { STREAM_TABLE_COL_GRID } from './StreamTableHeader';

/** Helper: Check if a level value differs from snapshot (for staged highlighting) */
function isLevelValueStaged(
  currentValue: number,
  snapshotValue: number | undefined,
  tolerance: number = 0.0001
): boolean {
  if (snapshotValue === undefined) return false;
  return Math.abs(currentValue - snapshotValue) > tolerance;
}

interface StreamRowProps {
  stream: StreamSet;
}

/** Manual Bid/Ask numeric inputs when Price Source is Manual */
function ManualBidAskInputs({
  stream,
  updateStreamSet,
  formatNumber,
}: {
  stream: StreamSet;
  updateStreamSet: (id: string, updates: Partial<StreamSet>) => void;
  formatNumber: (n: number, d?: number) => string;
}) {
  const bidVal = stream.referencePrice.manualBid ?? stream.referencePrice.value ?? 0;
  const askVal = stream.referencePrice.manualAsk ?? stream.referencePrice.value ?? 0;
  const [bidInput, setBidInput] = useState(formatNumber(bidVal));
  const [askInput, setAskInput] = useState(formatNumber(askVal));

  // Check if manual values differ from snapshot (for staged highlighting)
  const snapshot = stream.lastLaunchedSnapshot;
  const snapshotBid = snapshot?.referencePrice.manualBid ?? snapshot?.referencePrice.value;
  const snapshotAsk = snapshot?.referencePrice.manualAsk ?? snapshot?.referencePrice.value;
  const isBidStaged = snapshotBid !== undefined ? isLevelValueStaged(bidVal, snapshotBid) : false;
  const isAskStaged = snapshotAsk !== undefined ? isLevelValueStaged(askVal, snapshotAsk) : false;

  useEffect(() => {
    setBidInput(formatNumber(bidVal));
    setAskInput(formatNumber(askVal));
  }, [bidVal, askVal, formatNumber]);

  const commitBid = useCallback(() => {
    const n = parseFloat(bidInput);
    if (!isNaN(n) && n >= 0) {
      updateStreamSet(stream.id, {
        referencePrice: {
          ...stream.referencePrice,
          source: 'manual',
          value: stream.referencePrice.value || n,
          manualBid: n,
          manualAsk: stream.referencePrice.manualAsk ?? stream.referencePrice.value ?? n,
        },
      });
    } else {
      setBidInput(formatNumber(bidVal));
    }
  }, [bidInput, stream, updateStreamSet, formatNumber, bidVal]);

  const commitAsk = useCallback(() => {
    const n = parseFloat(askInput);
    if (!isNaN(n) && n >= 0) {
      updateStreamSet(stream.id, {
        referencePrice: {
          ...stream.referencePrice,
          source: 'manual',
          value: stream.referencePrice.value || n,
          manualBid: stream.referencePrice.manualBid ?? stream.referencePrice.value ?? n,
          manualAsk: n,
        },
      });
    } else {
      setAskInput(formatNumber(askVal));
    }
  }, [askInput, stream, updateStreamSet, formatNumber, askVal]);

  const handleKeyDown = (e: React.KeyboardEvent, commit: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
  };

  return (
    <div className="flex items-center gap-4" role="group" aria-label="Manual price source">
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-medium text-green-400 uppercase tracking-wider shrink-0">
          Manual Bid
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={bidInput}
          onChange={(e) => setBidInput(e.target.value.replace(/[^0-9.-]/g, ''))}
          onBlur={commitBid}
          onKeyDown={(e) => handleKeyDown(e, commitBid)}
          onFocus={(e) => e.target.select()}
          className={cn(
            'w-20 h-6 px-2 text-[11px] tabular-nums rounded border bg-background',
            'focus:outline-none focus:ring-1 focus:ring-offset-0',
            'hover:bg-muted/50 transition-colors',
            isBidStaged
              ? 'text-blue-400 bg-blue-500/10 border-blue-500/30 focus:border-blue-500/50 focus:ring-blue-500/30'
              : 'border-border focus:border-green-500/50 focus:ring-green-500/30'
          )}
          aria-label="Manual bid value"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-medium text-red-400 uppercase tracking-wider shrink-0">
          Manual Ask
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={askInput}
          onChange={(e) => setAskInput(e.target.value.replace(/[^0-9.-]/g, ''))}
          onBlur={commitAsk}
          onKeyDown={(e) => handleKeyDown(e, commitAsk)}
          onFocus={(e) => e.target.select()}
          className={cn(
            'w-20 h-6 px-2 text-[11px] tabular-nums rounded border bg-background',
            'focus:outline-none focus:ring-1 focus:ring-offset-0',
            'hover:bg-muted/50 transition-colors',
            isAskStaged
              ? 'text-blue-400 bg-blue-500/10 border-blue-500/30 focus:border-blue-500/50 focus:ring-blue-500/30'
              : 'border-border focus:border-red-500/50 focus:ring-red-500/30'
          )}
          aria-label="Manual ask value"
        />
      </div>
    </div>
  );
}

/** Format timestamp for display in tooltip */
function formatTimestamp(isoString?: string): string {
  if (!isoString) return 'No timestamp';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/** Read-only Live Bid/Ask display when connected to QF price source */
function LiveBidAskDisplay({
  bidValue,
  askValue,
  bidTimestamp,
  askTimestamp,
  formatNumber,
}: {
  bidValue: number;
  askValue: number;
  bidTimestamp?: string;
  askTimestamp?: string;
  formatNumber: (n: number, d?: number) => string;
}) {
  // Use current time as fallback if no timestamp provided (for backwards compatibility)
  const effectiveBidTimestamp = bidTimestamp || new Date().toISOString();
  const effectiveAskTimestamp = askTimestamp || new Date().toISOString();
  
  return (
    <div className="flex items-center gap-4" role="group" aria-label="Live price source">
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-medium text-live-bid uppercase tracking-wider shrink-0">
          Live Bid
        </label>
        <span className="w-20 h-6 px-2 flex items-center text-[11px] tabular-nums text-live-bid bg-muted/30 rounded border border-border">
          {bidValue != null && bidValue !== 0 ? formatNumber(bidValue) : '-'}
        </span>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Clock className="h-3 w-3 text-gray-500 shrink-0" aria-label="Bid timestamp" />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {formatTimestamp(effectiveBidTimestamp)}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-medium text-live-ask uppercase tracking-wider shrink-0">
          Live Ask
        </label>
        <span className="w-20 h-6 px-2 flex items-center text-[11px] tabular-nums text-live-ask bg-muted/30 rounded border border-border">
          {askValue != null && askValue !== 0 ? formatNumber(askValue) : '-'}
        </span>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Clock className="h-3 w-3 text-gray-500 shrink-0" aria-label="Ask timestamp" />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {formatTimestamp(effectiveAskTimestamp)}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 50_000_000;

/** Column header with chevron that opens batch qty/notional popover */
function BatchQtyHeader({
  volumeLabel,
  side,
  stream,
  onBatchApply,
}: {
  volumeLabel: string;
  side: 'bid' | 'ask';
  stream: StreamSet;
  onBatchApply: (side: 'bid' | 'ask', quantity: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const matrix = side === 'bid' ? stream.bid.spreadMatrix : stream.ask.spreadMatrix;
  const currentQty = matrix[0]?.quantity ?? 1000;
  const [inputValue, setInputValue] = useState(currentQty.toString());

  useEffect(() => {
    if (open) {
      setInputValue(currentQty.toString());
    }
  }, [open, currentQty]);

  const parsed = parseInt(inputValue.replace(/[^0-9]/g, ''), 10);
  const isValid = !isNaN(parsed) && parsed >= MIN_QUANTITY && parsed <= MAX_QUANTITY;
  const wouldChange = matrix.some((l) => l.quantity !== parsed);
  const canApply = isValid && wouldChange;

  const handleApply = () => {
    if (!canApply) return;
    onBatchApply(side, parsed);
    setOpen(false);
  };

  const handleCancel = () => setOpen(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex items-center gap-1 w-full text-left py-1 px-2 text-muted-foreground font-medium',
            'hover:text-foreground hover:bg-muted/50 rounded transition-colors',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset'
          )}
          aria-label={`Set ${volumeLabel} for all levels`}
        >
          {volumeLabel}
          <ChevronDown className="h-3 w-3 opacity-70 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={4}
        collisionPadding={8}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'min-w-[240px] w-[240px] p-6',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
        )}
      >
        <div role="group" aria-label={`Set ${volumeLabel} (All Levels)`} className="flex flex-col">
          {/* Title - smaller weight, bottom margin */}
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Set {volumeLabel} (All Levels)
          </h3>

          {/* Input section - label 8px above input */}
          <label className="flex flex-col gap-2 mb-5">
            <span className="text-[11px] font-medium text-muted-foreground">{volumeLabel}</span>
            <input
              type="text"
              inputMode="numeric"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))}
              onFocus={(e) => (e.target as HTMLInputElement).select()}
              placeholder={formatQuantityFull(currentQty)}
              className={cn(
                'w-full h-10 px-4 py-2.5 text-[11px] tabular-nums rounded border border-border bg-background',
                'focus:outline-none focus:ring-1 focus:ring-ring',
                !isValid && inputValue !== '' && 'border-red-500/50'
              )}
              aria-label={volumeLabel}
            />
            {!isValid && inputValue !== '' && (
              <span className="text-[10px] text-red-500">
                Must be {MIN_QUANTITY.toLocaleString()} – {MAX_QUANTITY.toLocaleString()}
              </span>
            )}
          </label>

          {/* Button section - compact, right-aligned */}
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleCancel} className="h-7 px-2.5 text-[11px]">
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleApply} disabled={!canApply} className="h-7 px-2.5 text-[11px]">
              Apply
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const SPREAD_INCREMENT = 0.1;

/** Default spread values (bps) for Reset to Default: L1=0, L2=1, L3=4, L4=5, L5=6 */
const DEFAULT_SPREADS_BPS = [0, 1, 4, 5, 6];

function roundBps(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Format spread (bps) for display: "0" for zero, trim trailing zeros for non-zero */
function formatSpreadBps(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  if (rounded === 0) return '0';
  const str = rounded.toFixed(3).replace(/\.?0+$/, '');
  return str || '0';
}

/** Column header with chevron that opens batch spread adjustment popover */
function BatchSpreadHeader({
  side,
  stream,
  onBatchAdjust,
  onResetToDefault,
  onCancelEdits,
}: {
  side: 'bid' | 'ask';
  stream: StreamSet;
  onBatchAdjust: (side: 'bid' | 'ask', baseSpreads: number[], adjustmentBps: number) => void;
  onResetToDefault: (side: 'bid' | 'ask') => void;
  onCancelEdits: (side: 'bid' | 'ask') => void;
}) {
  const [open, setOpen] = useState(false);
  const matrix = side === 'bid' ? stream.bid.spreadMatrix : stream.ask.spreadMatrix;
  const [baseSpreads, setBaseSpreads] = useState<number[]>([]);
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [inputStr, setInputStr] = useState('0');

  useEffect(() => {
    if (open) {
      setBaseSpreads(matrix.map((l) => l.deltaBps));
      setAdjustmentValue(0);
      setInputStr('0');
    }
    // Only reset when popover opens. Do NOT depend on matrix - applying an adjustment
    // updates the stream → matrix changes → would reset input to 0 and break +/- buttons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const getBase = () => (baseSpreads.length > 0 ? baseSpreads : matrix.map((l) => l.deltaBps));

  const applyAdjustment = useCallback(
    (adj: number) => {
      const rounded = roundBps(adj);
      setAdjustmentValue(rounded);
      setInputStr(rounded === 0 ? '0' : formatSpreadBps(rounded));
      const base = getBase();
      if (base.length > 0) {
        onBatchAdjust(side, base, rounded);
      }
    },
    [side, baseSpreads, matrix, onBatchAdjust]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow: empty, minus sign alone, decimal point sequences, and valid numbers up to 3 decimals
    if (raw !== '' && raw !== '-' && raw !== '.' && raw !== '-.' && !/^-?\d*\.?\d{0,3}$/.test(raw)) return;
    setInputStr(raw === '' ? '0' : raw);
    // Don't apply adjustment for incomplete input (just minus or decimal point)
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') {
      return;
    }
    const n = parseFloat(raw);
    if (!isNaN(n)) {
      const rounded = roundBps(n);
      setAdjustmentValue(rounded);
      const base = getBase();
      if (base.length > 0) {
        onBatchAdjust(side, base, rounded);
      }
    }
  };

  const handlePlus = () => {
    const newVal = roundBps(adjustmentValue + SPREAD_INCREMENT);
    applyAdjustment(newVal);
  };

  const handleMinus = () => {
    const newVal = roundBps(adjustmentValue - SPREAD_INCREMENT);
    applyAdjustment(newVal);
  };

  const handleBlur = () => {
    const n = parseFloat(inputStr);
    const rounded = !isNaN(n) ? roundBps(n) : 0;
    setAdjustmentValue(rounded);
    setInputStr(rounded === 0 ? '0' : formatSpreadBps(rounded));
    const base = getBase();
    if (base.length > 0) {
      onBatchAdjust(side, base, rounded);
    }
  };

  const handleResetToDefault = () => {
    const defaults = side === 'ask'
      ? DEFAULT_SPREADS_BPS.map((bps) => -Math.abs(bps))
      : [...DEFAULT_SPREADS_BPS];
    setBaseSpreads(defaults);
    setAdjustmentValue(0);
    setInputStr('0');
    onResetToDefault(side);
  };

  const handleCancelEdits = () => {
    setAdjustmentValue(0);
    setInputStr('0');
    onCancelEdits(side);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex items-center gap-1 w-full text-left py-1 px-2 text-muted-foreground font-medium',
            'hover:text-foreground hover:bg-muted/50 rounded transition-colors',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset'
          )}
          aria-label={`Adjust spread for all levels`}
        >
          Spread
          <ChevronDown className="h-3 w-3 opacity-70 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={4}
        collisionPadding={8}
        avoidCollisions={false}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'min-w-[200px] w-[220px] max-w-[240px] p-3',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
        )}
      >
        <div role="group" aria-label="Adjust Spread (All Levels)" className="flex flex-col">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">
            Adjust Spread (All Levels)
          </h3>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleMinus();
              }}
              className="h-8 w-8 shrink-0 p-0"
              aria-label="Decrease by 0.1 bps"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <input
                type="text"
                inputMode="decimal"
                value={inputStr}
                onChange={handleInputChange}
                onFocus={(e) => (e.target as HTMLInputElement).select()}
                onBlur={handleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className={cn(
                  'flex-1 min-w-0 h-8 px-2 py-1.5 text-[11px] tabular-nums text-center rounded border border-border bg-background',
                  'focus:outline-none focus:ring-1 focus:ring-ring'
                )}
                aria-label="Adjustment in bps"
              />
              <span className="text-[10px] text-muted-foreground shrink-0">bps</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handlePlus();
              }}
              className="h-8 w-8 shrink-0 p-0"
              aria-label="Increase by 0.1 bps"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {/* Action Buttons - Cancel Edits and Reset side-by-side */}
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelEdits();
              }}
              className="!h-[22px] !min-h-[22px] !px-2 !py-1 rounded-md text-[11px] font-medium bg-zinc-600 text-zinc-200 hover:bg-zinc-500 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 border-0 shrink-0 whitespace-nowrap"
              aria-label="Cancel spread edits and revert to original values"
            >
              Cancel edits
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleResetToDefault();
              }}
              className="!h-[22px] !min-h-[22px] !px-2 !py-1 rounded-md text-[11px] font-medium bg-zinc-600 text-zinc-200 hover:bg-zinc-500 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 border-0 shrink-0 whitespace-nowrap gap-1"
              aria-label="Reset all level spreads to default values"
            >
              <RotateCcw className="h-2.5 w-2.5 shrink-0" />
              Reset
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Compact inline-editable cell: select on focus, Tab/Enter to commit */
function LevelCellInput({
  value,
  onChange,
  onKeyDown,
  className,
  side,
  isStaged = false,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onKeyDown'> & {
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  side: 'bid' | 'ask';
  isStaged?: boolean;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onFocus={(e) => e.target.select()}
      className={cn(
        'w-full min-w-0 h-6 px-1.5 text-[11px] tabular-nums rounded border border-transparent bg-background/50',
        'focus:border-border focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0',
        'hover:bg-muted/50 transition-colors',
        side === 'bid' && 'focus:border-green-500/50 focus:ring-green-500/30',
        side === 'ask' && 'focus:border-red-500/50 focus:ring-red-500/30',
        // Blue highlight for staged/changed values (readable on dark background)
        isStaged && 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        className
      )}
      {...props}
    />
  );
}

interface ExpandedLevelsTableProps {
  stream: StreamSet;
  bidValue: number;
  askValue: number;
  bidTimestamp?: string;
  askTimestamp?: string;
  updateStreamSet: (id: string, updates: Partial<StreamSet>) => void;
  formatNumber: (n: number, d?: number) => string;
  launchStream: (id: string) => Promise<void>;
  launchLevel: (streamId: string, side: 'bid' | 'ask', levelIndex: number) => Promise<void>;
  pauseLevel: (streamId: string, side: 'bid' | 'ask', levelIndex: number) => void;
  launchAllLevels: (streamId: string, side: 'bid' | 'ask') => Promise<void>;
  pauseAllLevels: (streamId: string, side: 'bid' | 'ask') => Promise<void>;
  revertStagingChanges: (id: string) => void;
  launchingStreamIds: Set<string>;
  launchingLevelKeys: Set<string>;
}

function ExpandedLevelsTable({
  stream,
  bidValue,
  askValue,
  bidTimestamp,
  askTimestamp,
  updateStreamSet,
  formatNumber,
  launchStream,
  launchLevel,
  pauseLevel,
  launchAllLevels,
  pauseAllLevels,
  revertStagingChanges,
  launchingStreamIds,
  launchingLevelKeys,
}: ExpandedLevelsTableProps) {
  const updateBidLevel = useCallback(
    (levelIndex: number, updates: Partial<Level>) => {
      const newMatrix = stream.bid.spreadMatrix.map((l, i) =>
        i === levelIndex ? { ...l, ...updates } : l
      );
      updateStreamSet(stream.id, { bid: { ...stream.bid, spreadMatrix: newMatrix } });
    },
    [stream, updateStreamSet]
  );

  const updateAskLevel = useCallback(
    (levelIndex: number, updates: Partial<Level>) => {
      const newMatrix = stream.ask.spreadMatrix.map((l, i) =>
        i === levelIndex ? { ...l, ...updates } : l
      );
      updateStreamSet(stream.id, { ask: { ...stream.ask, spreadMatrix: newMatrix } });
    },
    [stream, updateStreamSet]
  );

  const batchUpdateQty = useCallback(
    (side: 'bid' | 'ask', quantity: number) => {
      const streamSide = side === 'bid' ? stream.bid : stream.ask;
      const newMatrix = streamSide.spreadMatrix.map((l) => ({ ...l, quantity }));
      updateStreamSet(stream.id, {
        [side]: { ...streamSide, spreadMatrix: newMatrix },
      });
    },
    [stream, updateStreamSet]
  );

  const batchUpdateSpread = useCallback(
    (side: 'bid' | 'ask', baseSpreads: number[], adjustmentBps: number) => {
      if (baseSpreads.length === 0) return;
      const streamSide = side === 'bid' ? stream.bid : stream.ask;
      const newMatrix = streamSide.spreadMatrix.map((l, i) => ({
        ...l,
        deltaBps: roundBps((baseSpreads[i] ?? l.deltaBps) + adjustmentBps),
      }));
      updateStreamSet(stream.id, {
        [side]: { ...streamSide, spreadMatrix: newMatrix },
      });
    },
    [stream, updateStreamSet]
  );

  const batchResetToDefaultSpread = useCallback(
    (side: 'bid' | 'ask') => {
      const streamSide = side === 'bid' ? stream.bid : stream.ask;
      const defaultBps = side === 'ask'
        ? DEFAULT_SPREADS_BPS.map((bps) => roundBps(-Math.abs(bps)))
        : DEFAULT_SPREADS_BPS.map((bps) => roundBps(bps));
      const newMatrix = streamSide.spreadMatrix.map((l, i) => ({
        ...l,
        deltaBps: defaultBps[i] ?? l.deltaBps,
      }));
      updateStreamSet(stream.id, {
        [side]: { ...streamSide, spreadMatrix: newMatrix },
      });
    },
    [stream, updateStreamSet]
  );

  const batchCancelEditsSpread = useCallback(
    (side: 'bid' | 'ask') => {
      // Revert spreads to snapshot values (if available)
      const snapshot = stream.lastLaunchedSnapshot;
      if (!snapshot) return;
      
      const streamSide = side === 'bid' ? stream.bid : stream.ask;
      const snapMatrix = side === 'bid' ? snapshot.bid.spreadMatrix : snapshot.ask.spreadMatrix;
      
      const revertedMatrix = streamSide.spreadMatrix.map((l, i) => {
        const snapLevel = snapMatrix[i];
        return snapLevel ? { ...l, deltaBps: snapLevel.deltaBps } : l;
      });
      
      // Check if the other side has staging changes
      const otherSide = side === 'bid' ? 'ask' : 'bid';
      const otherSideData = stream[otherSide];
      const otherSnapMatrix = side === 'bid' ? snapshot.ask.spreadMatrix : snapshot.bid.spreadMatrix;
      const otherSideHasChanges = otherSideData.spreadMatrix.some((level, i) => {
        const snapLevel = otherSnapMatrix[i];
        return snapLevel && Math.abs(level.deltaBps - snapLevel.deltaBps) > 0.0001;
      });
      
      // Also check other staging fields
      const hasOtherStagingChanges = otherSideHasChanges ||
        stream.selectedPriceSource !== snapshot.selectedPriceSource ||
        stream.priceMode !== snapshot.priceMode ||
        stream.bid.maxLvls !== snapshot.bid.maxLvls ||
        stream.ask.maxLvls !== snapshot.ask.maxLvls;
      
      updateStreamSet(stream.id, {
        [side]: { ...streamSide, spreadMatrix: revertedMatrix },
        hasStagingChanges: hasOtherStagingChanges,
      }, { skipStaging: true });
    },
    [stream, updateStreamSet]
  );

  const isUdi = isUdiSecurity(stream.securityType);
  const volumeLabel = getVolumeLabel(stream.priceMode, stream.securityType);
  const notionalToggleLabel = getNotionalToggleLabel(stream.securityType);
  const bidActiveCount = getActiveLevelCount(stream.bid.spreadMatrix, stream.bid);
  const askActiveCount = getActiveLevelCount(stream.ask.spreadMatrix, stream.ask);

  // Check for yield crossing: ask level 1 > bid level 1
  // Find level 1 (index 0) or closest active level
  const bidLevel1 = stream.bid.spreadMatrix[0];
  const askLevel1 = stream.ask.spreadMatrix[0];
  const bidYield1 = bidLevel1 ? bidValue + bidLevel1.deltaBps / 100 : null;
  const askYield1 = askLevel1 ? askValue + askLevel1.deltaBps / 100 : null;
  const hasYieldCrossing = bidYield1 !== null && askYield1 !== null && askYield1 > bidYield1;

  return (
    <div
      className={cn(
        'px-4 pb-3 pt-2',
        'bg-muted/20'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {stream.hasStagingChanges && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 mb-2 py-1.5 pl-[8px] pr-[8px] rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] min-h-[28px] h-[30px]"
          style={{ paddingLeft: '8px', paddingRight: '8px' }}
        >
          <span className="truncate shrink-0">Staged changes — relaunch to apply.</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {stream.lastLaunchedSnapshot && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  revertStagingChanges(stream.id);
                }}
                className="!h-[22px] !min-h-[22px] !px-2 !py-1 rounded-md text-[11px] font-medium bg-zinc-600 text-zinc-200 hover:bg-zinc-500 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 border-0 shrink-0 w-fit min-w-0"
                title="Revert to last launched state"
              >
                Cancel edits
              </Button>
            )}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                launchStream(stream.id);
              }}
              disabled={launchingStreamIds.has(stream.id)}
              className="!h-[22px] !min-h-[22px] !px-2 !py-1 rounded-md text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 shrink-0 w-fit min-w-0"
              title="Relaunch to apply changes"
            >
              {launchingStreamIds.has(stream.id) ? (
                <Loader2 className="h-3 w-3 animate-spin shrink-0" aria-hidden />
              ) : (
                'Relaunch'
              )}
            </Button>
          </div>
        </div>
      )}
      {/* Yield Crossing Alert - appears when ask level 1 > bid level 1 */}
      {hasYieldCrossing && (
        <div
          role="alert"
          className="flex items-center gap-2 mb-2 py-1.5 pl-[8px] pr-[8px] rounded-md bg-yellow-500/10 text-yellow-500 dark:text-yellow-400 text-[11px] min-h-[28px] h-[30px]"
          style={{ paddingLeft: '8px', paddingRight: '8px' }}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate shrink-0">
            Yield Crossing: Ask value ({formatNumber(askYield1!)}) exceeds Bid value ({formatNumber(bidYield1!)}) at level 1
          </span>
        </div>
      )}
      {/* Manual Bid/Ask or Live Bid/Ask - hidden for UDI; Volume mode - shown for all with type-specific labels */}
      <div className="flex items-center justify-between gap-4 mb-2 py-2" role="group" aria-label="Price and volume settings">
        <div className="flex items-center gap-4">
          {!isUdi && stream.selectedPriceSource === 'manual' && (
            <ManualBidAskInputs
              stream={stream}
              updateStreamSet={updateStreamSet}
              formatNumber={formatNumber}
            />
          )}
          {!isUdi && stream.selectedPriceSource && stream.selectedPriceSource !== 'manual' && (
            <LiveBidAskDisplay
              bidValue={bidValue}
              askValue={askValue}
              bidTimestamp={bidTimestamp}
              askTimestamp={askTimestamp}
              formatNumber={formatNumber}
            />
          )}
        </div>
        <div
          role="tablist"
          aria-label="Volume unit"
          className="segmented-control h-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={stream.priceMode === 'quantity'}
            data-active={stream.priceMode === 'quantity'}
            onClick={(e) => {
              e.stopPropagation();
              updateStreamSet(stream.id, { priceMode: 'quantity' });
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                updateStreamSet(stream.id, { priceMode: 'notional' });
              }
            }}
            className={cn(
              'segmented-control-segment min-w-0',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background'
            )}
          >
            QTY
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={stream.priceMode === 'notional'}
            data-active={stream.priceMode === 'notional'}
            title={isUdi ? 'Trade Amount (UDI)' : 'Notional'}
            onClick={(e) => {
              e.stopPropagation();
              updateStreamSet(stream.id, { priceMode: 'notional' });
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === ' ') {
                e.preventDefault();
                updateStreamSet(stream.id, { priceMode: 'quantity' });
              }
            }}
            className={cn(
              'segmented-control-segment min-w-0',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background'
            )}
          >
            {notionalToggleLabel}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Bid Levels - columns: Qty/Notional, Spread, Yield */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-medium text-green-400 uppercase tracking-wider">
              Bid Levels ({bidActiveCount})
            </span>
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      launchAllLevels(stream.id, 'bid');
                    }}
                    disabled={launchingLevelKeys.has(`${stream.id}-bid-launch-all`) || launchingLevelKeys.has(`${stream.id}-bid-pause-all`)}
                    className="h-5 w-5 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                  >
                    {launchingLevelKeys.has(`${stream.id}-bid-launch-all`) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Launch all bid levels</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      pauseAllLevels(stream.id, 'bid');
                    }}
                    disabled={launchingLevelKeys.has(`${stream.id}-bid-launch-all`) || launchingLevelKeys.has(`${stream.id}-bid-pause-all`)}
                    className="h-5 w-5 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    {launchingLevelKeys.has(`${stream.id}-bid-pause-all`) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Pause className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pause all bid levels</TooltipContent>
              </Tooltip>
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                <span>MAX Lvls</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={stream.bid.maxLvls ?? 1}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    e.stopPropagation();
                    const raw = e.target.value;
                    const v = raw === '' ? 0 : Math.min(5, Math.max(0, parseInt(raw, 10) || 0));
                    updateStreamSet(stream.id, {
                      bid: { ...stream.bid, maxLvls: v },
                    });
                  }}
                  onKeyDown={(e) => {
                    if (/^[0-5]$/.test(e.key)) {
                      e.target.select();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'w-10 h-5 px-1 text-center text-[10px] tabular-nums rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring',
                    stream.lastLaunchedSnapshot && (stream.bid.maxLvls ?? 1) !== (stream.lastLaunchedSnapshot.bid.maxLvls ?? 1) && 'text-blue-400 bg-blue-500/10'
                  )}
                />
              </label>
            </div>
          </div>
          <div className="rounded border border-border/50 overflow-hidden">
            <table className="w-full text-[11px] tabular-nums">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  <th className="text-center py-1 px-1 text-muted-foreground font-medium w-12" aria-label="Level control" />
                  <th className="text-left py-1 px-2 text-muted-foreground font-medium w-8">L</th>
                  <th className="text-left py-0 px-0 text-muted-foreground font-medium">
                    <BatchQtyHeader volumeLabel={volumeLabel} side="bid" stream={stream} onBatchApply={batchUpdateQty} />
                  </th>
                  <th className="text-left py-0 px-0 text-muted-foreground font-medium">
                    <BatchSpreadHeader side="bid" stream={stream} onBatchAdjust={batchUpdateSpread} onResetToDefault={batchResetToDefaultSpread} onCancelEdits={batchCancelEditsSpread} />
                  </th>
                  <th className="text-left py-1 px-2 text-muted-foreground font-medium">Yield</th>
                </tr>
              </thead>
              <tbody>
                {stream.bid.spreadMatrix.map((level, i) => (
                  <LevelRow
                    key={level.levelNumber}
                    level={level}
                    levelIndex={i}
                    baseValue={bidValue}
                    side="bid"
                    streamId={stream.id}
                    streamSide={stream.bid}
                    formatNumber={formatNumber}
                    onUpdateBid={(u) => updateBidLevel(i, u)}
                    onUpdateAsk={() => {}}
                    launchLevel={launchLevel}
                    pauseLevel={pauseLevel}
                    launchingLevelKeys={launchingLevelKeys}
                    controlPosition="left"
                    stream={stream}
                    snapshot={stream.lastLaunchedSnapshot}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ask Levels - columns: Yield, Spread, Qty (mirrored) */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">
              Ask Levels ({askActiveCount})
            </span>
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      launchAllLevels(stream.id, 'ask');
                    }}
                    disabled={launchingLevelKeys.has(`${stream.id}-ask-launch-all`) || launchingLevelKeys.has(`${stream.id}-ask-pause-all`)}
                    className="h-5 w-5 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    {launchingLevelKeys.has(`${stream.id}-ask-launch-all`) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Launch all ask levels</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      pauseAllLevels(stream.id, 'ask');
                    }}
                    disabled={launchingLevelKeys.has(`${stream.id}-ask-launch-all`) || launchingLevelKeys.has(`${stream.id}-ask-pause-all`)}
                    className="h-5 w-5 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    {launchingLevelKeys.has(`${stream.id}-ask-pause-all`) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Pause className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pause all ask levels</TooltipContent>
              </Tooltip>
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                <span>MAX Lvls</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={stream.ask.maxLvls ?? 1}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    e.stopPropagation();
                    const raw = e.target.value;
                    const v = raw === '' ? 0 : Math.min(5, Math.max(0, parseInt(raw, 10) || 0));
                    updateStreamSet(stream.id, {
                      ask: { ...stream.ask, maxLvls: v },
                    });
                  }}
                  onKeyDown={(e) => {
                    if (/^[0-5]$/.test(e.key)) {
                      e.target.select();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'w-10 h-5 px-1 text-center text-[10px] tabular-nums rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring',
                    stream.lastLaunchedSnapshot && (stream.ask.maxLvls ?? 1) !== (stream.lastLaunchedSnapshot.ask.maxLvls ?? 1) && 'text-blue-400 bg-blue-500/10'
                  )}
                />
              </label>
            </div>
          </div>
          <div className="rounded border border-border/50 overflow-hidden">
            <table className="w-full text-[11px] tabular-nums">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  <th className="text-left py-1 px-2 text-muted-foreground font-medium">Yield</th>
                  <th className="text-left py-0 px-0 text-muted-foreground font-medium">
                    <BatchSpreadHeader side="ask" stream={stream} onBatchAdjust={batchUpdateSpread} onResetToDefault={batchResetToDefaultSpread} onCancelEdits={batchCancelEditsSpread} />
                  </th>
                  <th className="text-left py-0 px-0 text-muted-foreground font-medium">
                    <BatchQtyHeader volumeLabel={volumeLabel} side="ask" stream={stream} onBatchApply={batchUpdateQty} />
                  </th>
                  <th className="text-center py-1 px-1 text-muted-foreground font-medium w-12" aria-label="Level control" />
                </tr>
              </thead>
              <tbody>
                {stream.ask.spreadMatrix.map((level, i) => (
                  <LevelRow
                    key={level.levelNumber}
                    level={level}
                    levelIndex={i}
                    baseValue={askValue}
                    side="ask"
                    streamId={stream.id}
                    streamSide={stream.ask}
                    formatNumber={formatNumber}
                    onUpdateBid={() => {}}
                    onUpdateAsk={(u) => updateAskLevel(i, u)}
                    launchLevel={launchLevel}
                    pauseLevel={pauseLevel}
                    launchingLevelKeys={launchingLevelKeys}
                    controlPosition="right"
                    stream={stream}
                    snapshot={stream.lastLaunchedSnapshot}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LevelRowProps {
  level: Level;
  levelIndex: number;
  baseValue: number;
  side: 'bid' | 'ask';
  streamId: string;
  streamSide: StreamSide;
  formatNumber: (n: number, d?: number) => string;
  onUpdateBid: (u: Partial<Level>) => void;
  onUpdateAsk: (u: Partial<Level>) => void;
  launchLevel: (streamId: string, side: 'bid' | 'ask', levelIndex: number) => Promise<void>;
  pauseLevel: (streamId: string, side: 'bid' | 'ask', levelIndex: number) => void;
  launchingLevelKeys: Set<string>;
  controlPosition: 'left' | 'right';
  stream?: StreamSet; // For staging comparison
  snapshot?: StagingSnapshot; // For staging comparison
}

function LevelRow({
  level,
  levelIndex,
  baseValue,
  side,
  streamId,
  streamSide,
  formatNumber,
  onUpdateBid,
  onUpdateAsk,
  launchLevel,
  pauseLevel,
  launchingLevelKeys,
  controlPosition,
  stream,
  snapshot,
}: LevelRowProps) {
  const onUpdate = side === 'bid' ? onUpdateBid : onUpdateAsk;
  const yieldVal = baseValue + level.deltaBps / 100;

  const isLevelActive = level.isActive ?? (streamSide.isActive && level.levelNumber <= (streamSide.levelsToLaunch ?? 0));
  const levelKey = `${streamId}-${side}-${levelIndex}`;
  const isLaunching = launchingLevelKeys.has(levelKey);
  const isBatchLaunching = launchingLevelKeys.has(`${streamId}-${side}-launch-all`);
  const isBatchPausing = launchingLevelKeys.has(`${streamId}-${side}-pause-all`);
  const isLevelLoading = isLaunching || isBatchLaunching || isBatchPausing;

  const maxLvls = streamSide.maxLvls ?? 1;
  const activeCount = streamSide.spreadMatrix.filter((l) => l.isActive ?? (streamSide.isActive && l.levelNumber <= (streamSide.levelsToLaunch ?? 0))).length;
  const canLaunch = maxLvls > 0 && level.levelNumber <= maxLvls && (activeCount < maxLvls || isLevelActive);
  const [qtyInput, setQtyInput] = useState(formatQuantityFull(level.quantity));
  const [spreadInput, setSpreadInput] = useState(formatSpreadBps(level.deltaBps));
  const [yieldInput, setYieldInput] = useState(formatNumber(yieldVal));

  // Check if values differ from snapshot (for staged highlighting)
  const snapshotLevel = snapshot 
    ? (side === 'bid' ? snapshot.bid.spreadMatrix[levelIndex] : snapshot.ask.spreadMatrix[levelIndex])
    : undefined;
  
  const isQtyStaged = snapshotLevel ? isLevelValueStaged(level.quantity, snapshotLevel.quantity) : false;
  const isSpreadStaged = snapshotLevel ? isLevelValueStaged(level.deltaBps, snapshotLevel.deltaBps) : false;
  const isYieldStaged = snapshotLevel && snapshotLevel.deltaBps !== undefined
    ? isLevelValueStaged(level.deltaBps, snapshotLevel.deltaBps)
    : false;

  const commitQty = () => {
    const n = parseInt(qtyInput.replace(/,/g, ''), 10);
    if (!isNaN(n) && n >= 0) onUpdate({ quantity: n });
    else setQtyInput(formatQuantityFull(level.quantity));
  };

  const roundTo3Decimals = (n: number) => Math.round(n * 1000) / 1000;

  const handleSpreadChange = (v: string) => {
    if (v !== '' && v !== '-' && !/^-?\d*\.?\d{0,3}$/.test(v)) return;
    setSpreadInput(v);
    const n = parseFloat(v);
    if (!isNaN(n)) {
      const deltaBps = side === 'ask' ? -Math.abs(n) : n;
      const newYield = baseValue + deltaBps / 100;
      setYieldInput(formatNumber(newYield));
    }
  };

  const commitSpread = () => {
    const n = parseFloat(spreadInput);
    if (!isNaN(n)) {
      const rounded = roundTo3Decimals(n);
      const deltaBps = side === 'ask' ? -Math.abs(rounded) : rounded;
      onUpdate({ deltaBps });
      setSpreadInput(formatSpreadBps(deltaBps));
    } else {
      setSpreadInput(formatSpreadBps(level.deltaBps));
    }
  };

  const handleYieldChange = (v: string) => {
    setYieldInput(v);
    const n = parseFloat(v);
    if (!isNaN(n)) {
      const deltaBps = (n - baseValue) * 100;
      const displayBps = side === 'ask' ? -Math.abs(deltaBps) : deltaBps;
      setSpreadInput(formatSpreadBps(roundTo3Decimals(displayBps)));
    }
  };

  const commitYield = () => {
    const n = parseFloat(yieldInput);
    if (!isNaN(n)) {
      const deltaBps = (n - baseValue) * 100;
      onUpdate({ deltaBps: side === 'ask' ? -Math.abs(deltaBps) : deltaBps });
    }
    setYieldInput(formatNumber(baseValue + level.deltaBps / 100));
  };

  const handleKeyDown = (e: React.KeyboardEvent, commit: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
  };

  // Sync from props when level changes externally (e.g. from another stream update)
  useEffect(() => {
    setQtyInput(formatQuantityFull(level.quantity));
    setSpreadInput(formatSpreadBps(level.deltaBps));
    setYieldInput(formatNumber(baseValue + level.deltaBps / 100));
  }, [level.quantity, level.deltaBps, baseValue, side, formatNumber]);

  const controlCell = (
    <td className="py-0.5 px-1 w-12">
      <div className="flex items-center justify-center gap-0.5">
        {isLevelLoading ? (
          <Loader2 className="h-2 w-2 animate-spin shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <span
            className={cn(
              'w-2 h-2 rounded-md shrink-0',
              isLevelActive ? (side === 'bid' ? 'bg-[hsl(var(--status-active))]' : 'bg-red-400') : 'bg-muted-foreground/60'
            )}
            aria-hidden
          />
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                if (isLevelActive) pauseLevel(streamId, side, levelIndex);
                else if (canLaunch) launchLevel(streamId, side, levelIndex);
              }}
              disabled={isLaunching || (!isLevelActive && !canLaunch)}
              className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50"
            >
              {isLaunching ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isLevelActive ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isLevelActive
              ? 'Pause level'
              : !canLaunch
                ? (maxLvls === 0 ? 'MAX Lvls is 0' : level.levelNumber > maxLvls ? `Level exceeds MAX Lvls (${maxLvls})` : `MAX Lvls limit reached (${maxLvls})`)
                : 'Launch level'}
          </TooltipContent>
        </Tooltip>
      </div>
    </td>
  );

  if (side === 'bid') {
    return (
      <tr className="border-b border-border/30 last:border-0 hover:bg-muted/30">
        {controlPosition === 'left' && controlCell}
        <td className="py-0.5 px-2 text-muted-foreground tabular-nums">L{level.levelNumber}</td>
        <td className="py-0.5 px-2">
          <LevelCellInput
            value={qtyInput}
            onChange={(v) => setQtyInput(v)}
            onKeyDown={(e) => handleKeyDown(e, commitQty)}
            onBlur={commitQty}
            side="bid"
            isStaged={isQtyStaged}
          />
        </td>
        <td className="py-0.5 px-2">
          <LevelCellInput
            value={spreadInput}
            onChange={handleSpreadChange}
            onKeyDown={(e) => handleKeyDown(e, commitSpread)}
            onBlur={commitSpread}
            side="bid"
            isStaged={isSpreadStaged}
          />
        </td>
        <td className={cn('py-0.5 px-2 tabular-nums', side === 'bid' && 'text-green-400/90')}>
          <LevelCellInput
            value={yieldInput}
            onChange={handleYieldChange}
            onKeyDown={(e) => handleKeyDown(e, commitYield)}
            onBlur={commitYield}
            side="bid"
            isStaged={isYieldStaged}
          />
        </td>
        {controlPosition === 'right' && controlCell}
      </tr>
    );
  }

  return (
    <tr className="border-b border-border/30 last:border-0 hover:bg-muted/30">
      {controlPosition === 'left' && controlCell}
      <td className={cn('py-0.5 px-2 tabular-nums', side === 'ask' && 'text-red-400/90')}>
        <LevelCellInput
          value={yieldInput}
          onChange={handleYieldChange}
          onKeyDown={(e) => handleKeyDown(e, commitYield)}
          onBlur={commitYield}
          side="ask"
          isStaged={isYieldStaged}
        />
      </td>
      <td className="py-0.5 px-2">
        <LevelCellInput
          value={spreadInput}
          onChange={handleSpreadChange}
          onKeyDown={(e) => handleKeyDown(e, commitSpread)}
          onBlur={commitSpread}
          side="ask"
          isStaged={isSpreadStaged}
        />
      </td>
      <td className="py-0.5 px-2">
        <LevelCellInput
          value={qtyInput}
          onChange={(v) => setQtyInput(v)}
          onKeyDown={(e) => handleKeyDown(e, commitQty)}
          onBlur={commitQty}
          side="ask"
          isStaged={isQtyStaged}
        />
      </td>
      {controlPosition === 'right' && controlCell}
    </tr>
  );
}

export function StreamRow({ stream }: StreamRowProps) {
  const {
    expandedStreamIds,
    toggleExpanded,
    selectedStreamId,
    selectStream,
    launchStream,
    launchLevel,
    pauseLevel,
    launchAllLevels,
    pauseAllLevels,
    revertStagingChanges,
    deleteStreamSet,
    updateStreamSet,
    launchingStreamIds,
    launchingLevelKeys,
    missingPriceSourceStreamIds,
    clearMissingPriceSourceError,
    launchProgress,
    pauseProgress,
  } = useStreamStore();

  const isExpanded = expandedStreamIds.has(stream.id);
  const isSelected = selectedStreamId === stream.id;

  // Check if stream is currently being processed (launch, pause, or batch operation)
  const isLaunching = launchingStreamIds.has(stream.id);
  const isInLaunchBatch = launchProgress?.items.some(
    (item) => item.streamId === stream.id && item.status === 'processing'
  ) ?? false;
  const isInPauseBatch = pauseProgress?.items.some(
    (item) => item.streamId === stream.id && item.status === 'processing'
  ) ?? false;
  const isStreamProcessing = isLaunching || isInLaunchBatch || isInPauseBatch;

  // Best/innermost active level per side for collapsed row (L1 preferred, then L2, L3... if L1 inactive)
  const bidBestLevel = getBestActiveLevel(stream.bid.spreadMatrix, stream.bid);
  const askBestLevel = getBestActiveLevel(stream.ask.spreadMatrix, stream.ask);

  // Helper: Check if collapsed row values are staged (for highlighting)
  const snapshot = stream.lastLaunchedSnapshot;
  const bidBestSnapshot = snapshot?.bid.spreadMatrix.find(l => l.levelNumber === bidBestLevel?.levelNumber);
  const askBestSnapshot = snapshot?.ask.spreadMatrix.find(l => l.levelNumber === askBestLevel?.levelNumber);
  
  const isBidQtyStaged = bidBestLevel && bidBestSnapshot 
    ? isLevelValueStaged(bidBestLevel.quantity, bidBestSnapshot.quantity)
    : false;
  const isBidSpreadStaged = bidBestLevel && bidBestSnapshot
    ? isLevelValueStaged(bidBestLevel.deltaBps, bidBestSnapshot.deltaBps)
    : false;
  const isAskQtyStaged = askBestLevel && askBestSnapshot
    ? isLevelValueStaged(askBestLevel.quantity, askBestSnapshot.quantity)
    : false;
  // L1 quantity staged (for BSIZ/ASIZ which show L1 only)
  const bidL1Snapshot = snapshot?.bid.spreadMatrix[0];
  const askL1Snapshot = snapshot?.ask.spreadMatrix[0];
  const isBidL1QtyStaged = bidL1Snapshot ? isLevelValueStaged(stream.bid.spreadMatrix[0]?.quantity ?? 0, bidL1Snapshot.quantity) : false;
  const isAskL1QtyStaged = askL1Snapshot ? isLevelValueStaged(stream.ask.spreadMatrix[0]?.quantity ?? 0, askL1Snapshot.quantity) : false;
  const isAskSpreadStaged = askBestLevel && askBestSnapshot
    ? isLevelValueStaged(askBestLevel.deltaBps, askBestSnapshot.deltaBps)
    : false;
  const isPriceSourceStaged = snapshot && snapshot.selectedPriceSource !== stream.selectedPriceSource;

  // Get bid/ask values from selected price source
  const selectedFeed = stream.quoteFeeds?.find(f => f.feedId === stream.selectedPriceSource);
  const isManual = stream.selectedPriceSource === 'manual' || !stream.selectedPriceSource;
  const bidValue = selectedFeed?.bid ?? (isManual && stream.referencePrice.manualBid != null
    ? stream.referencePrice.manualBid
    : stream.referencePrice.value);
  const askValue = selectedFeed?.ask ?? (isManual && stream.referencePrice.manualAsk != null
    ? stream.referencePrice.manualAsk
    : stream.referencePrice.value);

  const bidYield = bidValue + (bidBestLevel?.deltaBps || 0) / 100;
  const askYield = askValue + (askBestLevel?.deltaBps || 0) / 100;

  const bidActiveCount = getActiveLevelCount(stream.bid.spreadMatrix, stream.bid);
  const askActiveCount = getActiveLevelCount(stream.ask.spreadMatrix, stream.ask);

  /** Global status indicator: Active (green) if any level active; Paused (gray) when none. Halted/cancelled/unconfigured unchanged. */
  const hasAnyActiveLevel = bidActiveCount > 0 || askActiveCount > 0;
  const statusDisplayState: StreamState =
    stream.state === 'halted' || stream.state === 'cancelled' || stream.state === 'unconfigured'
      ? stream.state
      : hasAnyActiveLevel
        ? 'active'
        : 'paused';

  /** Global Pause/Launch toggle: loading when any batch operation (bid/ask launch-all or pause-all) is in progress */
  const isGlobalToggleLoading =
    launchingLevelKeys.has(`${stream.id}-bid-launch-all`) ||
    launchingLevelKeys.has(`${stream.id}-bid-pause-all`) ||
    launchingLevelKeys.has(`${stream.id}-ask-launch-all`) ||
    launchingLevelKeys.has(`${stream.id}-ask-pause-all`);

  /** Check if this stream has the missing price source error */
  const hasMissingPriceSourceError = missingPriceSourceStreamIds.has(stream.id);

  // Build price source options: Manual + Quote Feeds group (QF-1, QF-2, …)
  const priceSourceOptions = useMemo<CompactSelectOption[]>(() => {
    const options: CompactSelectOption[] = [
      { value: 'manual', label: 'Manual', group: '' },
    ];

    const feeds = stream.quoteFeeds ?? [];
    if (feeds.length > 0) {
      feeds.forEach((feed) => {
        options.push({
          value: feed.feedId,
          label: feed.feedName,
          group: 'Quote Feeds',
          bid: feed.bid,
          ask: feed.ask,
        });
      });
    }

    return options;
  }, [stream.quoteFeeds]);

  const handlePriceSourceChange = (value: string, _option: CompactSelectOption) => {
    const isManual = value === 'manual';
    const feed = stream.quoteFeeds?.find(f => f.feedId === value);

    // Clear the missing price source error when user selects a valid source
    if (hasMissingPriceSourceError && (isManual || feed)) {
      clearMissingPriceSourceError(stream.id);
    }

    // When transitioning from unconfigured, move to staging
    const stateUpdate = stream.state === 'unconfigured'
      ? {
          state: 'staging' as StreamState,
          bid: { ...stream.bid, state: 'staging' },
          ask: { ...stream.ask, state: 'staging' },
        }
      : {};

    // When selecting a quote feed, auto-populate bid/ask values
    if (!isManual && feed) {
      updateStreamSet(stream.id, {
        ...stateUpdate,
        selectedPriceSource: value,
        quoteFeedId: feed.feedId,
        quoteFeedName: feed.feedName,
        referencePrice: {
          ...stream.referencePrice,
          source: 'live',
          value: feed.bid,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      // Manual: preserve current displayed values (don't overwrite user-entered)
      const currentBid = selectedFeed?.bid ?? stream.referencePrice.manualBid ?? stream.referencePrice.value;
      const currentAsk = selectedFeed?.ask ?? stream.referencePrice.manualAsk ?? stream.referencePrice.value;
      updateStreamSet(stream.id, {
        ...stateUpdate,
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
      });
    }
  };

  return (
    <div
      className={cn(
        'border-b border-border/30 rounded-sm',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
        isSelected && 'stream-set-selected',
        isExpanded && 'expanded-row-bg',
        stream.state === 'staging' && 'staging-bg',
        stream.state === 'paused' && 'paused-bg',
        stream.state === 'halted' && 'halted-bg'
      )}
      tabIndex={isSelected ? 0 : -1}
    >
      <div>
      {/* Main Row - click toggles levels editor and selects; actions use stopPropagation */}
      <div
        className={cn(
          `grid ${STREAM_TABLE_COL_GRID} gap-2 px-4 py-2 items-center cursor-pointer text-sm`,
          'table-row-hover'
        )}
        onClick={() => {
          toggleExpanded(stream.id);
          selectStream(stream.id === selectedStreamId ? null : stream.id);
        }}
      >
        {/* Expand/Status */}
        <div className="flex items-center gap-1 min-w-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(stream.id);
            }}
            className="h-5 w-5"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
          <StatusBadge state={statusDisplayState} haltDetails={stream.haltDetails} isLoading={isStreamProcessing} />
          {stream.hasStagingChanges && (
            <Badge
              variant="staging-indicator"
              title="Staged changes (pending apply)"
              aria-label="Staged changes (pending apply)"
            >
              S
            </Badge>
          )}
        </div>

        {/* Name */}
        <div className="truncate font-medium" title={stream.securityName}>
          {stream.securityAlias}
        </div>

        {/* Price Source / QF - show "-" when unconfigured (no QF assigned), otherwise CompactSelect */}
        <div onClick={(e) => e.stopPropagation()}>
          <CompactSelect
            value={stream.state === 'unconfigured' ? '' : (stream.selectedPriceSource || 'manual')}
            options={priceSourceOptions}
            onChange={handlePriceSourceChange}
            placeholder={stream.state === 'unconfigured' ? '-' : 'Select...'}
            className={cn(
              'w-20',
              isPriceSourceStaged && 'text-blue-400 bg-blue-500/10'
            )}
          />
        </div>

        {/* BID LVL - count of active bid levels */}
        {/* Show "-" when unconfigured or no active levels */}
        <span className={cn(
          'text-center tabular-nums text-xs',
          stream.state !== 'unconfigured' && bidActiveCount > 0 ? 'text-green-400' : 'text-muted-foreground'
        )}>
          {stream.state === 'unconfigured' ? '-' : (bidActiveCount > 0 ? bidActiveCount : '-')}
        </span>

        {/* BSIZ - L1 (innermost) level only; matches nested table, no 100x conversion */}
        {/* Show "-" when unconfigured */}
        <span className={cn(
          'text-right tabular-nums text-xs px-1 py-0.5 rounded',
          stream.state === 'unconfigured' ? 'text-muted-foreground' :
          (stream.bid.spreadMatrix[0]?.quantity ?? 0) > 0 
            ? (isBidL1QtyStaged ? 'text-blue-400 bg-blue-500/10' : 'text-green-400')
            : 'text-muted-foreground'
        )}>
          {stream.state === 'unconfigured' ? '-' :
            ((stream.bid.spreadMatrix[0]?.quantity ?? 0) > 0
              ? formatQuantity(stream.bid.spreadMatrix[0]!.quantity)
              : '-')}
        </span>

        {/* BSP - spread from best/innermost active bid level */}
        {/* Show "-" when unconfigured */}
        <span className={cn(
          'text-right tabular-nums text-xs px-1 py-0.5 rounded',
          stream.state === 'unconfigured' ? 'text-muted-foreground' :
          bidBestLevel?.deltaBps != null
            ? (isBidSpreadStaged ? 'text-blue-400 bg-blue-500/10' : 'text-green-400')
            : 'text-muted-foreground'
        )}>
          {stream.state === 'unconfigured' ? '-' :
            (bidBestLevel?.deltaBps != null ? formatSpreadBps(bidBestLevel.deltaBps) : '-')}
        </span>

        {/* BID */}
        {/* Show "-" when unconfigured */}
        <span className={cn(
          'text-right tabular-nums text-xs',
          stream.state === 'unconfigured' ? 'text-muted-foreground' :
          (bidValue != null && bidValue !== 0 ? 'text-green-400' : 'text-muted-foreground')
        )}>
          {stream.state === 'unconfigured' ? '-' :
            (bidValue != null && bidValue !== 0 ? formatNumber(bidYield) : '-')}
        </span>

        {/* Live Bid - softer tone for external market data */}
        {/* Show "-" when unconfigured */}
        <span className={cn(
          'text-center px-1 py-0.5 rounded tabular-nums text-xs',
          stream.state === 'unconfigured' ? 'text-muted-foreground' :
          (bidValue != null && bidValue !== 0 ? 'text-live-bid' : 'text-muted-foreground')
        )}>
          {stream.state === 'unconfigured' ? '-' :
            (bidValue != null && bidValue !== 0 ? formatNumber(bidValue) : '-')}
        </span>

        {/* Live Ask - softer tone for external market data */}
        {/* Show "-" when unconfigured */}
        <span className={cn(
          'text-center px-1 py-0.5 rounded tabular-nums text-xs',
          stream.state === 'unconfigured' ? 'text-muted-foreground' :
          (askValue != null && askValue !== 0 ? 'text-live-ask' : 'text-muted-foreground')
        )}>
          {stream.state === 'unconfigured' ? '-' :
            (askValue != null && askValue !== 0 ? formatNumber(askValue) : '-')}
        </span>

        {/* ASK */}
        {/* Show "-" when unconfigured */}
        <span className={cn(
          'text-right tabular-nums text-xs',
          stream.state === 'unconfigured' ? 'text-muted-foreground' :
          (askValue != null && askValue !== 0 ? 'text-red-400' : 'text-muted-foreground')
        )}>
          {stream.state === 'unconfigured' ? '-' :
            (askValue != null && askValue !== 0 ? formatNumber(askYield) : '-')}
        </span>

        {/* ASP - spread from best/innermost active ask level */}
        {/* Show "-" when unconfigured */}
        <span className={cn(
          'text-right tabular-nums text-xs px-1 py-0.5 rounded',
          stream.state === 'unconfigured' ? 'text-muted-foreground' :
          askBestLevel?.deltaBps != null
            ? (isAskSpreadStaged ? 'text-blue-400 bg-blue-500/10' : 'text-red-400')
            : 'text-muted-foreground'
        )}>
          {stream.state === 'unconfigured' ? '-' :
            (askBestLevel?.deltaBps != null ? formatSpreadBps(askBestLevel.deltaBps) : '-')}
        </span>

        {/* ASIZ - L1 (innermost) level only; matches nested table, no 100x conversion */}
        {/* Show "-" when unconfigured */}
        <span className={cn(
          'text-right tabular-nums text-xs px-1 py-0.5 rounded',
          stream.state === 'unconfigured' ? 'text-muted-foreground' :
          (stream.ask.spreadMatrix[0]?.quantity ?? 0) > 0
            ? (isAskL1QtyStaged ? 'text-blue-400 bg-blue-500/10' : 'text-red-400')
            : 'text-muted-foreground'
        )}>
          {stream.state === 'unconfigured' ? '-' :
            ((stream.ask.spreadMatrix[0]?.quantity ?? 0) > 0
              ? formatQuantity(stream.ask.spreadMatrix[0]!.quantity)
              : '-')}
        </span>

        {/* ALVL - count of active ask levels */}
        {/* Show "-" when unconfigured or no active levels */}
        <span className={cn(
          'text-center tabular-nums text-xs',
          stream.state !== 'unconfigured' && askActiveCount > 0 ? 'text-red-400' : 'text-muted-foreground'
        )}>
          {stream.state === 'unconfigured' ? '-' : (askActiveCount > 0 ? askActiveCount : '-')}
        </span>

        {/* UNIT - volume mode */}
        {/* Show "-" when unconfigured, blue highlight when staged */}
        <span className={cn(
          'text-center text-xs',
          stream.state === 'unconfigured'
            ? 'text-muted-foreground'
            : stream.hasStagingChanges && stream.lastLaunchedSnapshot && stream.priceMode !== stream.lastLaunchedSnapshot.priceMode
              ? 'text-blue-400 font-medium'
              : 'text-muted-foreground'
        )}>
          {stream.state === 'unconfigured' ? '-' : (stream.priceMode === 'notional' ? 'MXN' : 'QTY')}
        </span>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1.5 min-w-0 overflow-visible" onClick={(e) => e.stopPropagation()}>
          {stream.hasStagingChanges && !isExpanded && (
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Cancel Edits button - always show when there are staging changes */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  revertStagingChanges(stream.id);
                }}
                className="!h-[22px] !min-h-[22px] !px-2 !py-1 rounded-md text-[11px] font-medium bg-zinc-600 text-zinc-200 hover:bg-zinc-500 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 border-0 shrink-0 whitespace-nowrap"
                title="Revert to last launched state"
              >
                Cancel edits
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  launchStream(stream.id);
                }}
                disabled={launchingStreamIds.has(stream.id)}
                className="!h-[22px] !min-h-[22px] !px-2 !py-1 rounded-md text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 shrink-0 whitespace-nowrap"
                title="Relaunch to apply changes"
              >
                {launchingStreamIds.has(stream.id) ? (
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" aria-hidden />
                ) : (
                  'Relaunch'
                )}
              </Button>
            </div>
          )}
          {stream.state !== 'cancelled' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (isGlobalToggleLoading) return;
                    if (hasAnyActiveLevel) {
                      await pauseAllLevels(stream.id, 'bid');
                      await pauseAllLevels(stream.id, 'ask');
                    } else {
                      await launchAllLevels(stream.id, 'bid');
                      await launchAllLevels(stream.id, 'ask');
                    }
                  }}
                  disabled={isGlobalToggleLoading}
                  className={cn(
                    'h-6 w-6 shrink-0 min-w-[24px]',
                    hasAnyActiveLevel
                      ? 'text-red-400 hover:text-red-300 hover:bg-red-400/10'
                      : 'text-green-400 hover:text-green-300 hover:bg-green-400/10'
                  )}
                >
                  {isGlobalToggleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : hasAnyActiveLevel ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {hasAnyActiveLevel ? 'Pause stream' : 'Launch stream'}
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteStreamSet(stream.id);
                }}
                disabled={hasAnyActiveLevel}
                className="h-6 w-6 shrink-0 min-w-[24px] text-muted-foreground hover:bg-destructive hover:text-destructive-foreground disabled:hover:bg-transparent"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasAnyActiveLevel ? 'Pause the stream to remove it' : 'Remove stream'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Missing Price Source Alert Banner */}
      {hasMissingPriceSourceError && (
        <div className="px-4 pb-2">
          <div
            role="alert"
            className="flex items-center justify-between gap-2 py-1.5 pl-[8px] pr-[8px] rounded-md bg-red-500/10 text-red-500 dark:text-red-400 text-[11px] min-h-[28px] h-[30px]"
            style={{ paddingLeft: '8px', paddingRight: '8px' }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate shrink-0">
                Cannot launch: Please select a Price Source (QF or Manual) before launching this stream.
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearMissingPriceSourceError(stream.id);
              }}
              className="text-red-400 hover:text-red-300 text-[10px] font-medium px-2 py-0.5 rounded hover:bg-red-500/20 transition-colors shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Validation Banner for halted streams */}
      {stream.state === 'halted' && stream.haltDetails && (
        <div className="px-4 pb-2">
          <ValidationBanner
            message={stream.haltDetails}
            onRelaunch={() => launchStream(stream.id)}
            isLaunching={launchingStreamIds.has(stream.id)}
          />
        </div>
      )}

      {/* Expanded Levels - compact editable table */}
      {isExpanded && (
        <ExpandedLevelsTable
          stream={stream}
          bidValue={bidValue}
          askValue={askValue}
          bidTimestamp={selectedFeed?.bidTimestamp}
          askTimestamp={selectedFeed?.askTimestamp}
          updateStreamSet={updateStreamSet}
          formatNumber={formatNumber}
          launchStream={launchStream}
          launchLevel={launchLevel}
          pauseLevel={pauseLevel}
          launchAllLevels={launchAllLevels}
          pauseAllLevels={pauseAllLevels}
          revertStagingChanges={revertStagingChanges}
          launchingStreamIds={launchingStreamIds}
          launchingLevelKeys={launchingLevelKeys}
        />
      )}
      </div>
    </div>
  );
}
