import { useState, useCallback, useEffect } from 'react';
import { ChevronDown, Minus, Plus, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PriceSourceBatchPopover } from './PriceSourceBatchPopover';
import { UnitBatchPopover } from './UnitBatchPopover';
import { SpreadStepSettings } from './SpreadStepSettings';
import { useStreamStore } from '../../hooks/useStreamStore';
import { useSpreadStepSize } from '../../hooks/useSpreadStepSize';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import type { SecurityType, StreamSet } from '../../types/streamSet';

/** Grid columns for main scrollable content (excludes sticky Actions column) */
export const STREAM_TABLE_COL_GRID =
  'grid-cols-[40px_100px_90px_40px_55px_50px_55px_55px_55px_55px_50px_55px_40px_45px]';

/** Width of the sticky actions column */
export const ACTIONS_COLUMN_WIDTH = 'w-[32px]';

/** Round to 3 decimal places for bps values */
function roundBps(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Format spread value, trimming unnecessary trailing zeros */
function formatSpreadBps(n: number): string {
  const s = n.toFixed(3);
  return s.replace(/\.?0+$/, '') || '0';
}

interface BatchSpreadColumnPopoverProps {
  side: 'bid' | 'ask';
  securityType?: SecurityType;
}

/**
 * Batch spread adjuster popover for column headers.
 * Adjusts spreads for all streams in the current view/section.
 */
function BatchSpreadColumnPopover({ side, securityType }: BatchSpreadColumnPopoverProps) {
  const [open, setOpen] = useState(false);
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [inputStr, setInputStr] = useState('0');
  const [affectedCount, setAffectedCount] = useState(0);
  const { stepSize } = useSpreadStepSize();

  const {
    adjustSpreadForType,
    resetSpreadsForType,
    getStreamsForBatchSpread,
  } = useStreamStore();

  // Update affected count when popover opens
  useEffect(() => {
    if (open) {
      const streams = getStreamsForBatchSpread(securityType);
      setAffectedCount(streams.length);
      setAdjustmentValue(0);
      setInputStr('0');
    }
  }, [open, securityType, getStreamsForBatchSpread]);

  const applyAdjustment = useCallback(
    (adj: number) => {
      const rounded = roundBps(adj);
      const delta = rounded - adjustmentValue;
      if (Math.abs(delta) > 0.0001) {
        adjustSpreadForType(side, delta, securityType);
      }
      setAdjustmentValue(rounded);
      setInputStr(rounded === 0 ? '0' : formatSpreadBps(rounded));
    },
    [adjustmentValue, side, securityType, adjustSpreadForType]
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
      const delta = rounded - adjustmentValue;
      if (Math.abs(delta) > 0.0001) {
        adjustSpreadForType(side, delta, securityType);
      }
      setAdjustmentValue(rounded);
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
    applyAdjustment(rounded);
    setInputStr(rounded === 0 ? '0' : formatSpreadBps(rounded));
  };

  const handleReset = () => {
    resetSpreadsForType(side, securityType);
    setAdjustmentValue(0);
    setInputStr('0');
  };

  const label = side === 'bid' ? 'BSP' : 'ASP';
  const sideLabel = side === 'bid' ? 'Bid' : 'Ask';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center justify-end gap-0.5 w-full text-right py-0.5 px-1 -mx-1',
            'hover:text-foreground hover:bg-muted/50 rounded transition-colors',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset'
          )}
          aria-label={`Batch adjust ${sideLabel} spreads`}
        >
          {label}
          <ChevronDown className="h-3 w-3 opacity-70 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        side="top"
        sideOffset={4}
        collisionPadding={8}
        avoidCollisions={true}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'min-w-[220px] w-[240px] max-w-[260px] p-3',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
        )}
      >
        <div role="group" aria-label={`Adjust ${sideLabel} Spread (Batch)`} className="flex flex-col">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">
            Adjust Spread (Batch - {sideLabel})
          </h3>
          <p className="text-[10px] text-muted-foreground/70 mb-2">
            Adjusting {affectedCount} stream{affectedCount !== 1 ? 's' : ''}
          </p>
          
          {/* Adjustment Controls */}
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
                handleReset();
              }}
              className="!h-[22px] !min-h-[22px] !px-2 !py-1 rounded-md text-[11px] font-medium bg-zinc-600 text-zinc-200 hover:bg-zinc-500 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 border-0 shrink-0 whitespace-nowrap gap-1"
              aria-label="Reset all spreads to default spread values"
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

interface StreamTableHeaderProps {
  securityType?: SecurityType;
}

export function StreamTableHeader({ securityType }: StreamTableHeaderProps) {
  return (
    <div className="flex border-b border-border/50 bg-muted/30">
      {/* Scrollable columns */}
      <div className={cn('grid gap-2 px-4 py-2 text-xs font-medium text-muted-foreground flex-1 min-w-0', STREAM_TABLE_COL_GRID)}>
        <div className="text-center"></div>
        <div>Name</div>
        <div className="min-w-0">
          <PriceSourceBatchPopover securityType={securityType} />
        </div>
        <span className="text-center">BLVL</span>
        <span className="text-right">BSIZ</span>
        <div className="text-right">
          <BatchSpreadColumnPopover side="bid" securityType={securityType} />
        </div>
        <span className="text-right text-green-400">BID</span>
        <span className="text-center text-muted-foreground">Live Bid</span>
        <span className="text-center text-muted-foreground">Live Ask</span>
        <span className="text-right text-red-400">ASK</span>
        <div className="text-right">
          <BatchSpreadColumnPopover side="ask" securityType={securityType} />
        </div>
        <span className="text-right">ASIZ</span>
        <span className="text-center">ALVL</span>
        <div className="text-center min-w-0">
          <UnitBatchPopover securityType={securityType} />
        </div>
      </div>
      {/* Sticky Actions column - empty header */}
      <div className={cn(
        'sticky right-0 z-20 px-2 py-2',
        'bg-muted/30 border-l border-border/30',
        'shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)]',
        ACTIONS_COLUMN_WIDTH
      )} />
    </div>
  );
}
