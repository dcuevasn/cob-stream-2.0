import { useState, useCallback, useMemo, useEffect } from 'react';
import { Layers } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { useStreamStore } from '../../hooks/useStreamStore';

/** Clamp value to 0-5, same as per-stream MAX Lvls inputs */
function clampMaxLvls(v: number): number {
  return Math.min(5, Math.max(0, v));
}

/** Parse and clamp from raw input - used when Apply is clicked */
function parseMaxLvls(raw: string): number {
  if (raw === '') return 0;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? 0 : clampMaxLvls(parsed);
}

export function BatchMaxLevelsPopover() {
  const [open, setOpen] = useState(false);
  const [bidInput, setBidInput] = useState('1');
  const [askInput, setAskInput] = useState('1');

  const batchUpdateMaxLvls = useStreamStore((s) => s.batchUpdateMaxLvls);
  const getFilteredStreamSets = useStreamStore((s) => s.getFilteredStreamSets);
  const streamSets = useStreamStore((s) => s.streamSets);
  const activeTab = useStreamStore((s) => s.activeTab);
  const searchQuery = useStreamStore((s) => s.searchQuery);
  const preferences = useStreamStore((s) => s.preferences);

  const streams = useMemo(() => getFilteredStreamSets(), [getFilteredStreamSets, streamSets, activeTab, searchQuery, preferences]);
  const affectedCount = streams.length;

  // Initialize inputs from dominant/modal values when opening
  // IMPORTANT: Only run on open state change, NOT when streams change (prevents input reset while typing)
  useEffect(() => {
    if (open && streams.length > 0) {
      const bidCounts = new Map<number, number>();
      const askCounts = new Map<number, number>();
      streams.forEach((s) => {
        const b = s.bid.maxLvls ?? 1;
        const a = s.ask.maxLvls ?? 1;
        bidCounts.set(b, (bidCounts.get(b) ?? 0) + 1);
        askCounts.set(a, (askCounts.get(a) ?? 0) + 1);
      });
      const dominantBid = [...bidCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 1;
      const dominantAsk = [...askCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 1;
      setBidInput(String(dominantBid));
      setAskInput(String(dominantAsk));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleBidChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow empty string (user is clearing input)
    if (raw === '') {
      setBidInput('');
      return;
    }

    // Parse and clamp to valid range 0-5
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(5, Math.max(0, parsed));
      setBidInput(String(clamped));
    }
  }, []);

  const handleAskChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow empty string (user is clearing input)
    if (raw === '') {
      setAskInput('');
      return;
    }

    // Parse and clamp to valid range 0-5
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(5, Math.max(0, parsed));
      setAskInput(String(clamped));
    }
  }, []);

  const handleApply = useCallback(() => {
    const bidVal = parseMaxLvls(bidInput);
    const askVal = parseMaxLvls(askInput);
    batchUpdateMaxLvls(bidVal, askVal);
    setOpen(false);
  }, [bidInput, askInput, batchUpdateMaxLvls]);

  const handleCancel = useCallback(() => {
    setOpen(false);
  }, []);

  const canApply = affectedCount > 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 shrink-0 px-3"
              aria-label="Set max levels for all streams"
            >
              <Layers className="h-4 w-4" />
              Batch Max Lvls
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Set max levels for all streams</TooltipContent>
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
        <div role="group" aria-label="Set Max Levels (Batch)" className="flex flex-col gap-4">
          <h3 className="text-sm font-medium">Set Max Levels (Batch)</h3>

          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium text-muted-foreground">BID MAX Lvls</span>
              <input
                type="number"
                min={0}
                max={5}
                value={bidInput}
                onChange={handleBidChange}
                onFocus={(e) => e.target.select()}
                className={cn(
                  'w-14 h-7 px-2 text-center text-[11px] tabular-nums rounded border border-border bg-background',
                  'focus:outline-none focus:ring-1 focus:ring-ring'
                )}
                aria-label="BID MAX Lvls"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium text-muted-foreground">ASK MAX Lvls</span>
              <input
                type="number"
                min={0}
                max={5}
                value={askInput}
                onChange={handleAskChange}
                onFocus={(e) => e.target.select()}
                className={cn(
                  'w-14 h-7 px-2 text-center text-[11px] tabular-nums rounded border border-border bg-background',
                  'focus:outline-none focus:ring-1 focus:ring-ring'
                )}
                aria-label="ASK MAX Lvls"
              />
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
