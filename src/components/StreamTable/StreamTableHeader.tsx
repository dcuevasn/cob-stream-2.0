import { useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PriceSourceBatchPopover } from './PriceSourceBatchPopover';
import { SpreadStepSettings } from './SpreadStepSettings';
import { UnitBatchPopover } from './UnitBatchPopover';
import { useStreamStore } from '../../hooks/useStreamStore';
import { useSpreadStepSize } from '../../hooks/useSpreadStepSize';
import { useSettingsStore, type ColumnVisibility, type ToggleableColumn } from '../../hooks/useSettingsStore';
import { Button } from '../dsc/button';
import { StepperInput } from '../dsc/stepper-input';
import { Popover, PopoverTrigger, PopoverContent } from '../dsc/popover';
import type { SecurityType } from '../../types/streamSet';

/** Static fallback grid (all columns visible) */
export const STREAM_TABLE_COL_GRID =
  'grid-cols-[40px_100px_90px_40px_55px_50px_55px_55px_55px_55px_50px_55px_40px_45px]';

/** Width of the sticky actions column */
export const ACTIONS_COLUMN_WIDTH = 'w-[32px]';

/**
 * Column width definitions ordered to match the grid.
 * First two (expand icon, name) are always visible.
 */
const COLUMN_WIDTHS: { key: ToggleableColumn | null; width: string }[] = [
  { key: null, width: '40px' },      // expand/status - always visible
  { key: null, width: '100px' },     // name - always visible
  { key: 'priceSource', width: '90px' },
  { key: 'blvl', width: '40px' },
  { key: 'bsiz', width: '55px' },
  { key: 'bsp', width: '50px' },
  { key: 'bid', width: '55px' },
  { key: 'liveBid', width: '55px' },
  { key: 'liveAsk', width: '55px' },
  { key: 'ask', width: '55px' },
  { key: 'asp', width: '50px' },
  { key: 'asiz', width: '55px' },
  { key: 'alvl', width: '40px' },
  { key: 'unit', width: '45px' },
];

/** Build a CSS gridTemplateColumns value based on column visibility */
export function getStreamTableGridStyle(visibility: ColumnVisibility): React.CSSProperties {
  const widths = COLUMN_WIDTHS
    .filter((c) => c.key === null || visibility[c.key])
    .map((c) => c.width);
  return { gridTemplateColumns: widths.join(' ') };
}

/** Hook to get the dynamic grid style from the settings store */
export function useTableGridStyle(): React.CSSProperties {
  const visibility = useSettingsStore((s) => s.columnVisibility);
  return useMemo(() => getStreamTableGridStyle(visibility), [visibility]);
}

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
  const { stepSize } = useSpreadStepSize();

  const {
    adjustSpreadForType,
    resetSpreadsForType,
  } = useStreamStore();

  // Reset adjustment when popover opens
  useEffect(() => {
    if (open) {
      setAdjustmentValue(0);
      setInputStr('0');
    }
  }, [open]);

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
    if (raw !== '' && raw !== '-' && raw !== '.' && raw !== '-.' && !/^-?\d*\.?\d{0,3}$/.test(raw)) return;
    setInputStr(raw === '' ? '0' : raw);
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return;
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

  const handlePlus = () => applyAdjustment(roundBps(adjustmentValue + stepSize));
  const handleMinus = () => applyAdjustment(roundBps(adjustmentValue - stepSize));

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
    setOpen(false);
  };

  // Revert any adjustment made during this session and close
  const handleCancel = () => {
    if (Math.abs(adjustmentValue) > 0.0001) {
      adjustSpreadForType(side, -adjustmentValue, securityType);
    }
    setAdjustmentValue(0);
    setInputStr('0');
    setOpen(false);
  };

  const label = side === 'bid' ? 'BSP' : 'ASP';
  const sideLabel = side === 'bid' ? 'Bid' : 'Ask';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>

      <PopoverContent
        align="center"
        side="top"
        collisionPadding={8}
        avoidCollisions
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '8px' }}
        className="w-[165px] text-[10px] leading-tight shadow-sm"
      >
        <div
          role="group"
          aria-label={`Adjust ${sideLabel} Spread (Batch)`}
          className="flex flex-col gap-1.5"
        >
          {/* ── Title ── */}
          <p className="text-[10px] font-semibold text-[#fafafa] leading-none pb-0.5">
            Adjust Spread (All Levels)
          </p>

          {/* ── BPS · Stepper · Settings ── */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-medium text-[#a1a1a1] shrink-0 leading-none">BPS</span>
              <StepperInput
                value={inputStr}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onFocus={(e) => e.currentTarget.select()}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                onIncrement={() => handlePlus()}
                onDecrement={() => handleMinus()}
                incrementLabel={`Increase by ${stepSize} bps`}
                decrementLabel={`Decrease by ${stepSize} bps`}
              />
            </div>
            <SpreadStepSettings />
          </div>

          {/* ── Divider ── */}
          <div className="-mx-2 h-px bg-white/10" />

          {/* ── Footer ── */}
          <div className="flex items-center justify-end gap-1">
            <Button
              size="xs"
              variant="secondary"
              onClick={(e) => { e.stopPropagation(); handleReset(); }}
              className="whitespace-nowrap"
              aria-label="Reset to default spread"
              style={{ paddingLeft: '8px', paddingRight: '8px' }}
            >
              Default SPRD.
            </Button>
            <Button
              size="xs"
              variant="secondary"
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
              aria-label="Cancel and revert adjustment"
              style={{ paddingLeft: '8px', paddingRight: '8px' }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface StreamTableHeaderProps {
  securityType?: SecurityType;
}

export function StreamTableHeader({ securityType }: StreamTableHeaderProps) {
  const gridStyle = useTableGridStyle();
  const vis = useSettingsStore((s) => s.columnVisibility);

  return (
    <div className="flex border-b border-border/50 bg-muted/30">
      {/* Scrollable columns */}
      <div className="grid gap-2 px-4 py-2 text-xs font-medium text-muted-foreground flex-1 min-w-0" style={gridStyle}>
        <div className="text-center"></div>
        <div>Name</div>
        {vis.priceSource && (
          <div className="min-w-0">
            <PriceSourceBatchPopover securityType={securityType} />
          </div>
        )}
        {vis.blvl && <span className="text-center">BLVL</span>}
        {vis.bsiz && <span className="text-right">BSIZ</span>}
        {vis.bsp && (
          <div className="text-right">
            <BatchSpreadColumnPopover side="bid" securityType={securityType} />
          </div>
        )}
        {vis.bid && <span className="text-right text-green-400">BID</span>}
        {vis.liveBid && <span className="text-center text-muted-foreground">Live Bid</span>}
        {vis.liveAsk && <span className="text-center text-muted-foreground">Live Ask</span>}
        {vis.ask && <span className="text-right text-red-400">ASK</span>}
        {vis.asp && (
          <div className="text-right">
            <BatchSpreadColumnPopover side="ask" securityType={securityType} />
          </div>
        )}
        {vis.asiz && <span className="text-right">ASIZ</span>}
        {vis.alvl && <span className="text-center">ALVL</span>}
        {vis.unit && (
          <div className="text-center min-w-0">
            <UnitBatchPopover securityType={securityType} />
          </div>
        )}
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
