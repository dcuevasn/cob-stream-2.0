import { useCallback, useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Clock, Hand, Loader2, Minus, Pause, Play, Plus, RotateCcw, Trash2, Zap } from 'lucide-react';
import type { StreamSet, StreamSide, StreamState, Level, StagingSnapshot } from '../../types/streamSet';
import { getActiveLevelCount, getBestActiveLevel, getBestConfiguredLevel } from '../../lib/utils';

import { useStreamStore } from '../../hooks/useStreamStore';
import { useSpreadStepSize } from '../../hooks/useSpreadStepSize';
import { useDefaultSpreads } from '../../hooks/useDefaultSpreads';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { PriceSourceCombobox } from './PriceSourceCombobox';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { SidedStatusBadge } from '../StateIndicators/StatusBadge';
import { ValidationBanner } from '../StateIndicators/ValidationBanner';
import { SpreadStepSettings } from './SpreadStepSettings';
import { cn, formatNumber, formatQuantity, formatQuantityFull, isUdiSecurity, getVolumeLabel, getNotionalToggleLabel } from '../../lib/utils';
import { ACTIONS_COLUMN_WIDTH, useTableGridStyle } from './StreamTableHeader';
import { useSettingsStore } from '../../hooks/useSettingsStore';

/** Yield Crossing Alert with context-aware icon based on auto-relaunch setting */
function YieldCrossingAlert({ bidYield1, askYield1 }: { bidYield1: number; askYield1: number }) {
  const autoRelaunch = useSettingsStore((s) => s.autoRelaunchSettings.autoRelaunchYieldCrossing);
  const Icon = autoRelaunch ? Zap : Hand;
  const tooltipText = autoRelaunch
    ? 'Auto-relaunch enabled: Stream will relaunch automatically when yield crossing resolves'
    : 'Manual relaunch required: You must manually relaunch after resolving yield crossing';

  return (
    <div
      role="alert"
      className="flex items-center gap-2 mb-2 py-2.5 pl-[8px] pr-[8px] rounded-md bg-yellow-500/10 text-yellow-500 dark:text-yellow-400 text-[11px] min-h-[34px]"
      style={{ paddingLeft: '8px', paddingRight: '8px' }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className="h-3.5 w-3.5 shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipText}</TooltipContent>
      </Tooltip>
      <span className="truncate shrink-0">
        Yield Crossing: Ask value ({formatNumber(askYield1)}) exceeds Bid value ({formatNumber(bidYield1)}) at level 1
      </span>
    </div>
  );
}

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
      if (!isLevelValueStaged(n, bidVal)) return;
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
      if (!isLevelValueStaged(n, askVal)) return;
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
    <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Manual price source">
      <div className="flex items-center gap-1.5">
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
      <div className="flex items-center gap-1.5">
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
    <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Live price source">
      <div className="flex items-center gap-1.5">
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
      <div className="flex items-center gap-1.5">
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
  const oppositeSide = side === 'bid' ? 'ask' : 'bid';
  const matrix = side === 'bid' ? stream.bid.spreadMatrix : stream.ask.spreadMatrix;
  const oppositeMatrix = side === 'bid' ? stream.ask.spreadMatrix : stream.bid.spreadMatrix;
  const currentQty = matrix[0]?.quantity ?? 1000;
  const [inputValue, setInputValue] = useState(currentQty.toString());
  const [applyToBoth, setApplyToBoth] = useState(false);

  useEffect(() => {
    if (open) {
      setInputValue(currentQty.toString());
      setApplyToBoth(false);
    }
  }, [open, currentQty]);

  const parsed = parseInt(inputValue.replace(/[^0-9]/g, ''), 10);
  const isValid = !isNaN(parsed) && parsed >= MIN_QUANTITY && parsed <= MAX_QUANTITY;
  const wouldChangeSide = matrix.some((l) => l.quantity !== parsed);
  const wouldChangeOppSide = oppositeMatrix.some((l) => l.quantity !== parsed);
  const wouldChange = applyToBoth ? wouldChangeSide || wouldChangeOppSide : wouldChangeSide;
  const canApply = isValid && wouldChange;

  const handleApply = () => {
    if (!canApply) return;
    onBatchApply(side, parsed);
    if (applyToBoth) onBatchApply(oppositeSide, parsed);
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
            'flex items-center gap-0.5 w-full text-left py-1 px-1 text-muted-foreground font-medium text-[11px]',
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
          {/* Title */}
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Set {volumeLabel} (All Levels)
          </h3>

          {/* Input section */}
          <label className="flex flex-col gap-2 mb-4">
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

          {/* Opposite-side checkbox */}
          <div
            className="flex items-center gap-2 mb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              id={`apply-both-${side}`}
              checked={applyToBoth}
              onCheckedChange={(checked) => setApplyToBoth(checked === true)}
            />
            <label
              htmlFor={`apply-both-${side}`}
              className="text-[11px] text-muted-foreground cursor-pointer select-none"
            >
              Also apply to {oppositeSide.toUpperCase()} side
            </label>
          </div>

          {/* Button section */}
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
}: {
  side: 'bid' | 'ask';
  stream: StreamSet;
  onBatchAdjust: (side: 'bid' | 'ask', baseSpreads: number[], adjustmentBps: number) => void;
  onResetToDefault: (side: 'bid' | 'ask') => void;
}) {
  const [open, setOpen] = useState(false);
  const matrix = side === 'bid' ? stream.bid.spreadMatrix : stream.ask.spreadMatrix;
  const [baseSpreads, setBaseSpreads] = useState<number[]>([]);
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [inputStr, setInputStr] = useState('0');
  const { stepSize } = useSpreadStepSize();
  const { defaultSpreads } = useDefaultSpreads();

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
    const newVal = roundBps(adjustmentValue + stepSize);
    applyAdjustment(newVal);
  };

  const handleMinus = () => {
    const newVal = roundBps(adjustmentValue - stepSize);
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
      ? defaultSpreads.ask
      : defaultSpreads.bid;
    setBaseSpreads(defaults);
    setAdjustmentValue(0);
    setInputStr('0');
    onResetToDefault(side);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex items-center gap-0.5 w-full text-left py-1 px-1 text-muted-foreground font-medium text-[11px]',
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
              aria-label={`Decrease by ${stepSize} bps`}
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
              aria-label={`Increase by ${stepSize} bps`}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {/* Action Buttons - Reset and Settings */}
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleResetToDefault();
              }}
              className="!h-[22px] !min-h-[22px] !px-2 !py-1 rounded-md text-[11px] font-medium bg-zinc-600 text-zinc-200 hover:bg-zinc-500 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 border-0 shrink-0 whitespace-nowrap gap-1"
              aria-label="Reset all level spreads to default spread values"
            >
              <RotateCcw className="h-2.5 w-2.5 shrink-0" />
              Default spread
            </Button>
            <SpreadStepSettings />
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
        'relative z-0 box-border w-full min-w-0 h-6 px-1 text-[11px] tabular-nums rounded-none border border-transparent bg-transparent shadow-none appearance-none',
        'focus:z-20 focus:outline-none focus:bg-blue-500/10 focus:text-white',
        'focus:border-blue-500 focus:ring-1 focus:ring-inset focus:ring-blue-500/60 focus:ring-offset-0',
        'transition-colors',
        // Blue highlight for staged/changed values (readable on dark background)
        isStaged && 'text-blue-400 bg-blue-500/10 ring-1 ring-inset ring-blue-500/30',
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
  applyChanges: (id: string) => Promise<void>;
  launchLevel: (streamId: string, side: 'bid' | 'ask', levelIndex: number) => Promise<void>;
  pauseLevel: (streamId: string, side: 'bid' | 'ask', levelIndex: number) => void;
  launchAllLevels: (streamId: string, side: 'bid' | 'ask') => Promise<void>;
  pauseAllLevels: (streamId: string, side: 'bid' | 'ask') => Promise<void>;
  revertStagingChanges: (id: string) => void;
  deleteStreamSet: (id: string) => void;
  launchingStreamIds: Set<string>;
  launchingLevelKeys: Set<string>;
  hideIndividualLevelControls: boolean;
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
  applyChanges,
  launchLevel,
  pauseLevel,
  launchAllLevels,
  pauseAllLevels,
  revertStagingChanges,
  deleteStreamSet,
  launchingStreamIds,
  launchingLevelKeys,
  hideIndividualLevelControls,
}: ExpandedLevelsTableProps) {
  const { defaultSpreads } = useDefaultSpreads();

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
        ? defaultSpreads.ask.map((bps) => roundBps(bps))
        : defaultSpreads.bid.map((bps) => roundBps(bps));
      const newMatrix = streamSide.spreadMatrix.map((l, i) => ({
        ...l,
        deltaBps: defaultBps[i] ?? l.deltaBps,
      }));
      updateStreamSet(stream.id, {
        [side]: { ...streamSide, spreadMatrix: newMatrix },
      });
    },
    [stream, updateStreamSet, defaultSpreads]
  );

  const isUdi = isUdiSecurity(stream.securityType);
  const volumeLabel = getVolumeLabel(stream.priceMode, stream.securityType);
  const notionalToggleLabel = getNotionalToggleLabel(stream.securityType);
  const bidActiveCount = getActiveLevelCount(stream.bid.spreadMatrix, stream.bid);
  const askActiveCount = getActiveLevelCount(stream.ask.spreadMatrix, stream.ask);
  const hasAnyActiveLevel = bidActiveCount > 0 || askActiveCount > 0;
  const priceAndVolumeSectionClassName = 'flex items-center justify-between gap-2 mb-2 flex-wrap';

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
        'pt-0',
        'bg-muted/20'
      )}
      style={{ paddingLeft: '12px', paddingRight: '12px', paddingBottom: '12px' }}
      onClick={(e) => e.stopPropagation()}
    >
      {stream.hasStagingChanges && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 mb-2 py-1.5 pl-[8px] pr-[8px] rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] min-h-[28px] h-[30px]"
          style={{ paddingLeft: '8px', paddingRight: '8px' }}
        >
          <span className="truncate shrink-0">Applies staged changes. Relaunches active streams only.</span>
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
                applyChanges(stream.id);
              }}
              disabled={launchingStreamIds.has(stream.id)}
              className="!h-[22px] !min-h-[22px] !px-2 !py-1 rounded-md text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 shrink-0 w-fit min-w-0"
              title="Apply changes"
            >
              {launchingStreamIds.has(stream.id) ? (
                <Loader2 className="h-3 w-3 animate-spin shrink-0" aria-hidden />
              ) : (
                'Apply changes'
              )}
            </Button>
          </div>
        </div>
      )}
      {/* Yield Crossing Alert - only show when NOT already displayed via ValidationBanner (halted with yield_crossing reason) */}
      {hasYieldCrossing && !(stream.state === 'halted' && stream.haltReason === 'yield_crossing') && (
        <YieldCrossingAlert bidYield1={bidYield1!} askYield1={askYield1!} />
      )}
      {/* Manual Bid/Ask or Live Bid/Ask; Volume mode - shown for all with type-specific labels */}
      <div
        className={priceAndVolumeSectionClassName}
        style={{ paddingTop: '12px', paddingLeft: '12px', paddingBottom: '12px', paddingRight: '0' }}
        role="group"
        aria-label="Price and volume settings"
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {stream.selectedPriceSource === 'manual' && (
            <ManualBidAskInputs
              stream={stream}
              updateStreamSet={updateStreamSet}
              formatNumber={formatNumber}
            />
          )}
          {stream.selectedPriceSource && stream.selectedPriceSource !== 'manual' && (
            <LiveBidAskDisplay
              bidValue={bidValue}
              askValue={askValue}
              bidTimestamp={bidTimestamp}
              askTimestamp={askTimestamp}
              formatNumber={formatNumber}
            />
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto flex-wrap justify-end">
          <div
            role="tablist"
            aria-label="Volume unit"
            className="segmented-control h-6 shrink-0"
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
              {hasAnyActiveLevel ? 'Stop the stream to remove it' : 'Remove stream'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Tables container - side by side with minimal gap, horizontal scroll when needed */}
      <div className="overflow-x-auto">
        <div className="flex flex-col md:flex-row gap-2">
          {/* Bid Levels - columns: Qty/Notional, Spread, Yield */}
          <div className="flex-1 min-w-0 md:min-w-[220px]">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-medium text-green-400 uppercase tracking-wider whitespace-nowrap">
                Bid Levels ({bidActiveCount})
              </span>
              <div className="flex items-center gap-0.5">
                <label className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                  <span>Max</span>
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
                      'w-12 h-6 px-1 text-center text-[10px] tabular-nums rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring focus:text-foreground',
                      stream.lastLaunchedSnapshot && (stream.bid.maxLvls ?? 1) !== (stream.lastLaunchedSnapshot.bid.maxLvls ?? 1) && 'text-blue-400 bg-blue-500/10'
                    )}
                  />
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        pauseAllLevels(stream.id, 'bid');
                      }}
                      disabled={bidActiveCount === 0 || launchingLevelKeys.has(`${stream.id}-bid-launch-all`) || launchingLevelKeys.has(`${stream.id}-bid-pause-all`)}
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      {launchingLevelKeys.has(`${stream.id}-bid-pause-all`) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pause className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Stop all bid levels</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        launchAllLevels(stream.id, 'bid');
                      }}
                      disabled={bidActiveCount > 0 || launchingLevelKeys.has(`${stream.id}-bid-launch-all`) || launchingLevelKeys.has(`${stream.id}-bid-pause-all`)}
                      className="h-6 w-6 shrink-0 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                    >
                      {launchingLevelKeys.has(`${stream.id}-bid-launch-all`) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Launch all bid levels</TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="rounded border border-border/50 overflow-x-auto">
              <table className="w-full text-[11px] tabular-nums border-collapse border-spacing-0 min-w-[200px]">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/50">
                    <th className="text-left py-0 px-0 text-muted-foreground font-medium whitespace-nowrap">
                      <BatchQtyHeader volumeLabel={volumeLabel} side="bid" stream={stream} onBatchApply={batchUpdateQty} />
                    </th>
                    <th className="text-left py-0 px-0 text-muted-foreground font-medium whitespace-nowrap">
                      <BatchSpreadHeader side="bid" stream={stream} onBatchAdjust={batchUpdateSpread} onResetToDefault={batchResetToDefaultSpread} />
                    </th>
                    <th className="text-left py-1 px-1 text-muted-foreground font-medium whitespace-nowrap">Yield</th>
                    <th className="text-center py-1 px-1 text-muted-foreground font-medium w-6 whitespace-nowrap">L</th>
                    {!hideIndividualLevelControls && (
                      <th className="text-center py-1 px-1 text-muted-foreground font-medium w-8 whitespace-nowrap" aria-label="Level actions" />
                    )}
                    <th className="text-center py-1 px-1 text-muted-foreground font-medium w-4 whitespace-nowrap">S</th>
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
                    snapshot={stream.lastLaunchedSnapshot}
                    hideIndividualLevelControls={hideIndividualLevelControls}
                  />
                ))}
              </tbody>
            </table>
          </div>
          </div>

          {/* Ask Levels - mirrored: Status/Actions/L/Yield/Spread/Qty */}
          <div className="flex-1 min-w-0 md:min-w-[220px]">
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        launchAllLevels(stream.id, 'ask');
                      }}
                      disabled={askActiveCount > 0 || launchingLevelKeys.has(`${stream.id}-ask-launch-all`) || launchingLevelKeys.has(`${stream.id}-ask-pause-all`)}
                      className="h-6 w-6 shrink-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      {launchingLevelKeys.has(`${stream.id}-ask-launch-all`) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
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
                      disabled={askActiveCount === 0 || launchingLevelKeys.has(`${stream.id}-ask-launch-all`) || launchingLevelKeys.has(`${stream.id}-ask-pause-all`)}
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      {launchingLevelKeys.has(`${stream.id}-ask-pause-all`) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pause className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Stop all ask levels</TooltipContent>
                </Tooltip>
                <label className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                  <span>Max</span>
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
                      'w-12 h-6 px-1 text-center text-[10px] tabular-nums rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring focus:text-foreground',
                      stream.lastLaunchedSnapshot && (stream.ask.maxLvls ?? 1) !== (stream.lastLaunchedSnapshot.ask.maxLvls ?? 1) && 'text-blue-400 bg-blue-500/10'
                    )}
                  />
                </label>
              </div>
              <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider whitespace-nowrap">
                Ask Levels ({askActiveCount})
              </span>
            </div>
          <div className="rounded border border-border/50 overflow-x-auto">
            <table className="w-full text-[11px] tabular-nums border-collapse border-spacing-0 min-w-[200px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  <th className="text-center py-1 px-1 text-muted-foreground font-medium w-4 whitespace-nowrap">S</th>
                  {!hideIndividualLevelControls && (
                    <th className="text-center py-1 px-1 text-muted-foreground font-medium w-8 whitespace-nowrap" aria-label="Level actions" />
                  )}
                  <th className="text-center py-1 px-1 text-muted-foreground font-medium w-6 whitespace-nowrap">L</th>
                  <th className="text-left py-1 px-1 text-muted-foreground font-medium whitespace-nowrap">Yield</th>
                  <th className="text-left py-0 px-0 text-muted-foreground font-medium whitespace-nowrap">
                    <BatchSpreadHeader side="ask" stream={stream} onBatchAdjust={batchUpdateSpread} onResetToDefault={batchResetToDefaultSpread} />
                  </th>
                  <th className="text-left py-0 px-0 text-muted-foreground font-medium whitespace-nowrap">
                    <BatchQtyHeader volumeLabel={volumeLabel} side="ask" stream={stream} onBatchApply={batchUpdateQty} />
                  </th>
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
                    snapshot={stream.lastLaunchedSnapshot}
                    hideIndividualLevelControls={hideIndividualLevelControls}
                  />
                ))}
              </tbody>
            </table>
          </div>
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
  snapshot?: StagingSnapshot; // For staging comparison
  hideIndividualLevelControls?: boolean;
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
  snapshot,
  hideIndividualLevelControls,
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
    if (!isNaN(n) && n >= 0) {
      if (!isLevelValueStaged(n, level.quantity, 0)) return;
      onUpdate({ quantity: n });
      return;
    }
    setQtyInput(formatQuantityFull(level.quantity));
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
      if (!isLevelValueStaged(deltaBps, level.deltaBps)) {
        setSpreadInput(formatSpreadBps(level.deltaBps));
        return;
      }
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
      const normalizedDelta = side === 'ask' ? -Math.abs(deltaBps) : deltaBps;
      if (isLevelValueStaged(normalizedDelta, level.deltaBps)) {
        onUpdate({ deltaBps: normalizedDelta });
      }
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

  const statusCell = (
    <td className="py-0.5 px-1 w-4 text-center">
      {isLevelLoading ? (
        <Loader2 className="h-2 w-2 animate-spin shrink-0 text-muted-foreground inline-block" aria-hidden />
      ) : (
        <span
          className={cn(
            'w-2 h-2 rounded-md shrink-0 inline-block',
            isLevelActive ? (side === 'bid' ? 'bg-[var(--status-active)]' : 'bg-red-400') : 'bg-muted-foreground/60'
          )}
          aria-hidden
        />
      )}
    </td>
  );

  const actionCell = (
    <td className="py-0.5 px-1 w-8 text-center">
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
            ? 'Stop level'
            : !canLaunch
              ? (maxLvls === 0 ? 'MAX Lvls is 0' : level.levelNumber > maxLvls ? `Level exceeds MAX Lvls (${maxLvls})` : `MAX Lvls limit reached (${maxLvls})`)
              : 'Launch level'}
        </TooltipContent>
      </Tooltip>
    </td>
  );

  if (side === 'ask') {
    return (
      <tr className="border-b border-border/30 last:border-0 hover:bg-muted/30">
        {statusCell}
        {!hideIndividualLevelControls && actionCell}
        <td className={cn("py-0.5 px-1 tabular-nums text-[11px] text-center", level.levelNumber > maxLvls ? "text-muted-foreground/40" : "text-red-400/90")}>L{level.levelNumber}</td>
        <td className="py-0.5 px-1 tabular-nums text-red-400/90">
          <LevelCellInput
            value={yieldInput}
            onChange={handleYieldChange}
            onKeyDown={(e) => handleKeyDown(e, commitYield)}
            onBlur={commitYield}
            side={side}
            isStaged={isYieldStaged}
          />
        </td>
        <td className="py-0.5 px-1">
          <LevelCellInput
            value={spreadInput}
            onChange={handleSpreadChange}
            onKeyDown={(e) => handleKeyDown(e, commitSpread)}
            onBlur={commitSpread}
            side={side}
            isStaged={isSpreadStaged}
          />
        </td>
        <td className="py-0.5 px-1">
          <LevelCellInput
            value={qtyInput}
            onChange={(v) => setQtyInput(v)}
            onKeyDown={(e) => handleKeyDown(e, commitQty)}
            onBlur={commitQty}
            side={side}
            isStaged={isQtyStaged}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border/30 last:border-0 hover:bg-muted/30">
      <td className="py-0.5 px-1">
        <LevelCellInput
          value={qtyInput}
          onChange={(v) => setQtyInput(v)}
          onKeyDown={(e) => handleKeyDown(e, commitQty)}
          onBlur={commitQty}
          side={side}
          isStaged={isQtyStaged}
        />
      </td>
      <td className="py-0.5 px-1">
        <LevelCellInput
          value={spreadInput}
          onChange={handleSpreadChange}
          onKeyDown={(e) => handleKeyDown(e, commitSpread)}
          onBlur={commitSpread}
          side={side}
          isStaged={isSpreadStaged}
        />
      </td>
      <td className="py-0.5 px-1 tabular-nums text-green-400/90">
        <LevelCellInput
          value={yieldInput}
          onChange={handleYieldChange}
          onKeyDown={(e) => handleKeyDown(e, commitYield)}
          onBlur={commitYield}
          side={side}
          isStaged={isYieldStaged}
        />
      </td>
      <td className={cn("py-0.5 px-1 tabular-nums text-[11px] text-center", level.levelNumber > maxLvls ? "text-muted-foreground/40" : "text-green-400/90")}>L{level.levelNumber}</td>
      {!hideIndividualLevelControls && actionCell}
      {statusCell}
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
    applyChanges,
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
    manualPriceErrors,
    launchProgress,
    pauseProgress,
    preferences,
  } = useStreamStore();

  const { defaultSpreads } = useDefaultSpreads();
  const gridStyle = useTableGridStyle();
  const vis = useSettingsStore((s) => s.columnVisibility);

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
  const bidBestActiveLevel = getBestActiveLevel(stream.bid.spreadMatrix, stream.bid);
  const askBestActiveLevel = getBestActiveLevel(stream.ask.spreadMatrix, stream.ask);

  // Best/innermost configured level per side (for display when stopped)
  const bidBestConfiguredLevel = getBestConfiguredLevel(stream.bid.spreadMatrix);
  const askBestConfiguredLevel = getBestConfiguredLevel(stream.ask.spreadMatrix);

  const bidActiveCount = getActiveLevelCount(stream.bid.spreadMatrix, stream.bid);
  const askActiveCount = getActiveLevelCount(stream.ask.spreadMatrix, stream.ask);

  // Use active level when stream has active levels, otherwise use configured level
  const bidBestLevel = bidActiveCount > 0 ? bidBestActiveLevel : bidBestConfiguredLevel;
  const askBestLevel = askActiveCount > 0 ? askBestActiveLevel : askBestConfiguredLevel;

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

  // Yield crossing check for ValidationBanner descriptive message
  const bidLevel1 = stream.bid.spreadMatrix[0];
  const askLevel1 = stream.ask.spreadMatrix[0];
  const bidYield1 = bidLevel1 ? bidValue + bidLevel1.deltaBps / 100 : null;
  const askYield1 = askLevel1 ? askValue + askLevel1.deltaBps / 100 : null;
  const hasYieldCrossing = bidYield1 !== null && askYield1 !== null && askYield1 > bidYield1;

  /** Global status indicator: Active (green) if any level active; Paused (gray) when none.
   *  For FFCH/yield_crossing halts, show active/paused based on level activity (alert banners handle the warning).
   *  Other halts (user_stop, execution_error), cancelled, and unconfigured show their own state. */
  const hasAnyActiveLevel = bidActiveCount > 0 || askActiveCount > 0;
  const isAlertHalt = stream.state === 'halted' && (stream.haltReason === 'ffch' || stream.haltReason === 'yield_crossing');
  const statusDisplayState: StreamState =
    (stream.state === 'halted' && !isAlertHalt) || stream.state === 'cancelled' || stream.state === 'unconfigured'
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

  /** Pulse the alert banner when a launch attempt is blocked by any active alert condition */
  const [alertPulse, setAlertPulse] = useState(false);
  const handleAlertPulse = useCallback(() => {
    setAlertPulse(true);
    setTimeout(() => setAlertPulse(false), 600);
  }, []);

  /**
   * Wrapped launchAllLevels: checks all blocking conditions before proceeding.
   * On repeat attempts while an alert is already visible → pulse + abort.
   * On first attempt → delegates to the store action (which sets the error state).
   */
  const handleLaunchAllLevels = useCallback(async (id: string, side: 'bid' | 'ask') => {
    const blockedByHalt = stream.state === 'halted' && (stream.haltReason === 'ffch' || stream.haltReason === 'yield_crossing');
    const blockedByMissingSource = missingPriceSourceStreamIds.has(id);
    const blockedByManualPrice = manualPriceErrors.get(id) === side;
    if (blockedByHalt || blockedByMissingSource || blockedByManualPrice) {
      handleAlertPulse();
      return;
    }
    await launchAllLevels(id, side);
  }, [stream, missingPriceSourceStreamIds, manualPriceErrors, handleAlertPulse, launchAllLevels]);

  /** Check if this stream has the missing price source error */
  const hasMissingPriceSourceError = missingPriceSourceStreamIds.has(stream.id);
  /** Which side failed to launch due to a missing manual price (undefined = no error) */
  const manualPriceErrorSide = manualPriceErrors.get(stream.id);

  const handlePriceSourceChange = (value: string) => {
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
      // Manual: when switching FROM a QF feed, seed manual inputs with the current live
      // QF prices so the user starts from market values. Otherwise (re-selecting manual
      // or no prior source) preserve snapshot/stored values to avoid spurious staging.
      let currentBid: number | undefined;
      let currentAsk: number | undefined;

      if (selectedFeed) {
        // Coming from a QF: use live prices as starting point
        currentBid = selectedFeed.bid;
        currentAsk = selectedFeed.ask;
      } else {
        const snapshotBid = snapshot?.referencePrice.manualBid ?? snapshot?.referencePrice.value;
        const snapshotAsk = snapshot?.referencePrice.manualAsk ?? snapshot?.referencePrice.value;
        currentBid = snapshotBid ?? stream.referencePrice.manualBid ?? stream.referencePrice.value;
        currentAsk = snapshotAsk ?? stream.referencePrice.manualAsk ?? stream.referencePrice.value;
      }

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
          'flex items-center cursor-pointer text-sm group',
          'table-row-hover'
        )}
        onClick={() => {
          toggleExpanded(stream.id);
          selectStream(stream.id === selectedStreamId ? null : stream.id);
        }}
      >
        {/* Scrollable columns */}
        <div className={cn('grid gap-2 px-4 py-2 items-center flex-1 min-w-0')} style={gridStyle}>
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
            <SidedStatusBadge
                state={stream.state}
                haltReason={stream.haltReason}
                haltDetails={stream.haltDetails}
                bidActiveCount={bidActiveCount}
                askActiveCount={askActiveCount}
                isLoading={isStreamProcessing}
              />
          </div>

          {/* Name - color coded by state: yellow for alerts, blue for staged, default otherwise */}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div className={cn(
                'truncate font-medium',
                (stream.state === 'halted' || hasMissingPriceSourceError || hasYieldCrossing)
                  ? 'text-yellow-500'
                  : stream.hasStagingChanges
                    ? 'text-blue-400'
                    : undefined
              )}>
                {stream.securityAlias}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs" sideOffset={4}>
              <div className="space-y-1">
                <div className="font-mono">{stream.securityName}</div>
                <div className="font-mono text-muted-foreground">{stream.securityISIN}</div>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Price Source / QF */}
          {vis.priceSource && (
            <div onClick={(e) => e.stopPropagation()}>
              <PriceSourceCombobox
                value={stream.state === 'unconfigured' ? undefined : (stream.selectedPriceSource || 'manual')}
                quoteFeeds={stream.quoteFeeds ?? []}
                onValueChange={handlePriceSourceChange}
                placeholder={stream.state === 'unconfigured' ? '-' : 'Select...'}
                className={cn(isPriceSourceStaged && 'text-blue-400 bg-blue-500/10')}
              />
            </div>
          )}

          {/* BLVL - count of active bid levels */}
          {vis.blvl && (
            <span className={cn(
              'text-center tabular-nums text-xs',
              stream.state !== 'unconfigured' && bidActiveCount > 0 ? 'text-green-400' : 'text-muted-foreground'
            )}>
              {stream.state === 'unconfigured' ? '-' : (bidActiveCount > 0 ? bidActiveCount : '-')}
            </span>
          )}

          {/* BSIZ - L1 (innermost) level only */}
          {vis.bsiz && (
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
          )}

          {/* BSP - spread from best bid level */}
          {vis.bsp && (
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
          )}

          {/* BID - calculated yield from best level */}
          {vis.bid && (
            <span className={cn(
              'text-right tabular-nums text-xs px-1 py-0.5 rounded',
              stream.state === 'unconfigured' ? 'text-muted-foreground' :
              (bidValue != null && bidValue !== 0 && bidBestLevel
                ? (isBidSpreadStaged ? 'text-blue-400 bg-blue-500/10' : 'text-green-400')
                : 'text-muted-foreground')
            )}>
              {stream.state === 'unconfigured' ? '-' :
                (bidValue != null && bidValue !== 0 && bidBestLevel ? formatNumber(bidYield) : '-')}
            </span>
          )}

          {/* Live Bid */}
          {vis.liveBid && (
            <span className={cn(
              'text-center px-1 py-0.5 rounded tabular-nums text-xs',
              stream.state === 'unconfigured' ? 'text-muted-foreground' :
              (bidValue != null && bidValue !== 0 ? 'text-live-bid' : 'text-muted-foreground')
            )}>
              {stream.state === 'unconfigured' ? '-' :
                (bidValue != null && bidValue !== 0 ? formatNumber(bidValue) : '-')}
            </span>
          )}

          {/* Live Ask */}
          {vis.liveAsk && (
            <span className={cn(
              'text-center px-1 py-0.5 rounded tabular-nums text-xs',
              stream.state === 'unconfigured' ? 'text-muted-foreground' :
              (askValue != null && askValue !== 0 ? 'text-live-ask' : 'text-muted-foreground')
            )}>
              {stream.state === 'unconfigured' ? '-' :
                (askValue != null && askValue !== 0 ? formatNumber(askValue) : '-')}
            </span>
          )}

          {/* ASK - calculated yield from best level */}
          {vis.ask && (
            <span className={cn(
              'text-right tabular-nums text-xs px-1 py-0.5 rounded',
              stream.state === 'unconfigured' ? 'text-muted-foreground' :
              (askValue != null && askValue !== 0 && askBestLevel
                ? (isAskSpreadStaged ? 'text-blue-400 bg-blue-500/10' : 'text-red-400')
                : 'text-muted-foreground')
            )}>
              {stream.state === 'unconfigured' ? '-' :
                (askValue != null && askValue !== 0 && askBestLevel ? formatNumber(askYield) : '-')}
            </span>
          )}

          {/* ASP - spread from best ask level */}
          {vis.asp && (
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
          )}

          {/* ASIZ - L1 (innermost) level only */}
          {vis.asiz && (
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
          )}

          {/* ALVL - count of active ask levels */}
          {vis.alvl && (
            <span className={cn(
              'text-center tabular-nums text-xs',
              stream.state !== 'unconfigured' && askActiveCount > 0 ? 'text-red-400' : 'text-muted-foreground'
            )}>
              {stream.state === 'unconfigured' ? '-' : (askActiveCount > 0 ? askActiveCount : '-')}
            </span>
          )}

          {/* UNIT - volume mode */}
          {vis.unit && (
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
          )}
        </div>

        {/* Sticky Actions column */}
        <div 
          className={cn(
            'sticky right-0 z-10 px-2 py-2 flex items-center justify-end gap-1 overflow-visible',
            'border-l border-border/30',
            'shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)]',
            'group-hover:bg-[color-mix(in_srgb,var(--muted)_50%,transparent)]',
            ACTIONS_COLUMN_WIDTH,
            // Match row background state
            isExpanded ? 'bg-[color-mix(in_srgb,var(--muted)_25%,transparent)]' :
            stream.state === 'paused' ? 'bg-[color-mix(in_srgb,var(--status-paused)_10%,transparent)]' :
            stream.state === 'halted' ? 'bg-[color-mix(in_srgb,var(--status-halted)_10%,transparent)]' :
            'bg-background'
          )}
          onClick={(e) => e.stopPropagation()}
        >
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
                  applyChanges(stream.id);
                }}
                disabled={launchingStreamIds.has(stream.id)}
                className="!h-[22px] !min-h-[22px] !px-2 !py-1 rounded-md text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 shrink-0 whitespace-nowrap"
                title="Apply changes"
              >
                {launchingStreamIds.has(stream.id) ? (
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" aria-hidden />
                ) : (
                  'Apply changes'
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
                      await handleLaunchAllLevels(stream.id, 'bid');
                      await handleLaunchAllLevels(stream.id, 'ask');
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
                {hasAnyActiveLevel ? 'Stop stream' : 'Launch stream'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Missing Price Source Alert Banner */}
      {hasMissingPriceSourceError && (
        <div className="px-4 pb-2">
          <ValidationBanner
            message="Cannot launch: Please select a Price Source (QF or Manual) before launching this stream."
            pulsing={alertPulse}
          />
        </div>
      )}

      {/* Manual price missing banner - shown when user tries to launch a side without manual price set */}
      {manualPriceErrorSide && (
        <div className="px-4 pb-2">
          <ValidationBanner
            message={`Cannot launch ${manualPriceErrorSide.toUpperCase()}: Enter a manual ${manualPriceErrorSide} price to launch this side.`}
            pulsing={alertPulse}
          />
        </div>
      )}

      {/* Validation Banner for halted streams */}
      {stream.state === 'halted' && stream.haltDetails && (
        <div className="px-4 pb-2">
          <ValidationBanner
            message={
              stream.haltReason === 'yield_crossing' && hasYieldCrossing
                ? `Yield Crossing: Ask value (${formatNumber(askYield1!)}) exceeds Bid value (${formatNumber(bidYield1!)}) at level 1`
                : stream.haltDetails
            }
            haltReason={stream.haltReason}
            onRelaunch={stream.haltReason !== 'ffch' && stream.haltReason !== 'yield_crossing' ? () => launchStream(stream.id) : undefined}
            isLaunching={launchingStreamIds.has(stream.id)}
            pulsing={alertPulse}
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
          applyChanges={applyChanges}
          launchLevel={launchLevel}
          pauseLevel={pauseLevel}
          launchAllLevels={handleLaunchAllLevels}
          pauseAllLevels={pauseAllLevels}
          revertStagingChanges={revertStagingChanges}
          deleteStreamSet={deleteStreamSet}
          launchingStreamIds={launchingStreamIds}
          launchingLevelKeys={launchingLevelKeys}
          hideIndividualLevelControls={preferences.hideIndividualLevelControls}
        />
      )}
      </div>
    </div>
  );
}
