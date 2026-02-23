import { useState, useCallback, useMemo, useEffect } from 'react';
import { Package } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn, formatQuantityFull } from '../../lib/utils';
import { useStreamStore } from '../../hooks/useStreamStore';

const MIN_QTY = 1;
const MAX_QTY = 50_000_000;

function parseQty(raw: string): number | null {
  const stripped = raw.replace(/[^0-9]/g, '');
  if (stripped === '') return null;
  const parsed = parseInt(stripped, 10);
  return isNaN(parsed) ? null : parsed;
}

function isValidQty(v: number | null): v is number {
  return v !== null && v >= MIN_QTY && v <= MAX_QTY;
}

/** Returns the modal (most-common) value from a list of numbers, falling back to the provided default */
function dominantValue(values: number[], fallback: number): number {
  if (values.length === 0) return fallback;
  const counts = new Map<number, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}

export function BatchSizePopover() {
  const [open, setOpen] = useState(false);
  const [bidInput, setBidInput] = useState('1000');
  const [askInput, setAskInput] = useState('1000');

  const batchUpdateQty = useStreamStore((s) => s.batchUpdateQty);
  const getFilteredStreamSets = useStreamStore((s) => s.getFilteredStreamSets);
  const streamSets = useStreamStore((s) => s.streamSets);
  const activeTab = useStreamStore((s) => s.activeTab);
  const searchQuery = useStreamStore((s) => s.searchQuery);
  const preferences = useStreamStore((s) => s.preferences);

  const streams = useMemo(
    () => getFilteredStreamSets(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getFilteredStreamSets, streamSets, activeTab, searchQuery, preferences]
  );
  const affectedCount = streams.length;

  // Initialize inputs from dominant L1 quantity of filtered streams on open
  useEffect(() => {
    if (open && streams.length > 0) {
      const bidQtys = streams.map((s) => s.bid.spreadMatrix[0]?.quantity ?? 1000);
      const askQtys = streams.map((s) => s.ask.spreadMatrix[0]?.quantity ?? 1000);
      setBidInput(String(dominantValue(bidQtys, 1000)));
      setAskInput(String(dominantValue(askQtys, 1000)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleBidChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBidInput(e.target.value.replace(/[^0-9]/g, ''));
  }, []);

  const handleAskChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAskInput(e.target.value.replace(/[^0-9]/g, ''));
  }, []);

  const bidParsed = parseQty(bidInput);
  const askParsed = parseQty(askInput);
  const bidValid = isValidQty(bidParsed);
  const askValid = isValidQty(askParsed);
  const canApply = affectedCount > 0 && bidValid && askValid;

  const handleApply = useCallback(() => {
    if (!canApply || bidParsed === null || askParsed === null) return;
    batchUpdateQty(bidParsed, askParsed);
    setOpen(false);
  }, [canApply, bidParsed, askParsed, batchUpdateQty]);

  const handleCancel = useCallback(() => setOpen(false), []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 shrink-0 px-3"
              aria-label="Set quantities for all streams"
            >
              <Package className="h-4 w-4" />
              Batch Size
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Set quantities for all streams</TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={6}
        collisionPadding={8}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className={cn(
          'min-w-[220px] p-4',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
        )}
      >
        <div role="group" aria-label="Set Quantity (Batch)" className="flex flex-col gap-4">
          <h3 className="text-sm font-medium">Set Size (Batch)</h3>

          <div className="flex flex-col gap-3">
            {/* BID QTY */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">BID</span>
              <input
                type="text"
                inputMode="numeric"
                value={bidInput}
                onChange={handleBidChange}
                onFocus={(e) => e.target.select()}
                placeholder={formatQuantityFull(1000)}
                className={cn(
                  'w-full h-8 px-3 text-[11px] tabular-nums rounded border border-border bg-background',
                  'focus:outline-none focus:ring-1 focus:ring-ring',
                  !bidValid && bidInput !== '' && 'border-red-500/50'
                )}
                aria-label="BID quantity"
              />
              {!bidValid && bidInput !== '' && (
                <span className="text-[10px] text-red-500">
                  Must be {MIN_QTY.toLocaleString()} – {MAX_QTY.toLocaleString()}
                </span>
              )}
            </label>

            {/* ASK QTY */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">ASK</span>
              <input
                type="text"
                inputMode="numeric"
                value={askInput}
                onChange={handleAskChange}
                onFocus={(e) => e.target.select()}
                placeholder={formatQuantityFull(1000)}
                className={cn(
                  'w-full h-8 px-3 text-[11px] tabular-nums rounded border border-border bg-background',
                  'focus:outline-none focus:ring-1 focus:ring-ring',
                  !askValid && askInput !== '' && 'border-red-500/50'
                )}
                aria-label="ASK quantity"
              />
              {!askValid && askInput !== '' && (
                <span className="text-[10px] text-red-500">
                  Must be {MIN_QTY.toLocaleString()} – {MAX_QTY.toLocaleString()}
                </span>
              )}
            </label>
          </div>

          {affectedCount > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Apply to {affectedCount} stream{affectedCount !== 1 ? 's' : ''}
            </p>
          )}

          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleApply} disabled={!canApply}>
              Apply Changes
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
