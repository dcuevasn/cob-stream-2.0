import { useState, useCallback, useMemo, useEffect } from 'react';
import { Layers } from 'lucide-react';
import { Button as DSCButton } from '../dsc/button';
import { Popover, PopoverTrigger, PopoverContent } from '../dsc/popover';
import { StepperInput } from '../dsc/stepper-input';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
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
    if (raw === '') { setBidInput(''); return; }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) setBidInput(String(clampMaxLvls(parsed)));
  }, []);

  const handleAskChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') { setAskInput(''); return; }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) setAskInput(String(clampMaxLvls(parsed)));
  }, []);

  const handleBidBlur = useCallback(() => setBidInput(String(parseMaxLvls(bidInput))), [bidInput]);
  const handleAskBlur = useCallback(() => setAskInput(String(parseMaxLvls(askInput))), [askInput]);

  const handleBidIncrement = useCallback(() => setBidInput((v) => String(clampMaxLvls(parseMaxLvls(v) + 1))), []);
  const handleBidDecrement = useCallback(() => setBidInput((v) => String(clampMaxLvls(parseMaxLvls(v) - 1))), []);
  const handleAskIncrement = useCallback(() => setAskInput((v) => String(clampMaxLvls(parseMaxLvls(v) + 1))), []);
  const handleAskDecrement = useCallback(() => setAskInput((v) => String(clampMaxLvls(parseMaxLvls(v) - 1))), []);

  const handleApply = useCallback(() => {
    const bidVal = parseMaxLvls(bidInput);
    const askVal = parseMaxLvls(askInput);
    batchUpdateMaxLvls(bidVal, askVal);
    setOpen(false);
  }, [bidInput, askInput, batchUpdateMaxLvls]);

  const handleCancel = useCallback(() => setOpen(false), []);

  const canApply = affectedCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <DSCButton
              variant="outline"
              size="sm"
              className="gap-1 shrink-0"
              style={{ paddingLeft: '12px', paddingRight: '12px' }}
              aria-label="Set max levels for all streams"
            >
              <Layers className="h-4 w-4" />
              Batch Max Lvls
            </DSCButton>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Set max levels for all streams</TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        sideOffset={6}
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '8px' }}
        className="w-[190px]"
      >
        <div role="group" aria-label="Set MAX Levels (batch)" className="flex flex-col gap-[6px]">

          {/* Title */}
          <p className="text-[10px] font-semibold text-[#fafafa] leading-[10px]">
            Set MAX Levels (batch)
          </p>

          {/* Rows */}
          <div className="flex flex-col pt-[2px]">
            {affectedCount > 0 && (
              <p className="text-[9px] font-medium text-[#a1a1a1]" style={{ marginBottom: '10px' }}>
                Apply to {affectedCount} stream{affectedCount !== 1 ? 's' : ''} (current view)
              </p>
            )}

            {/* BID MAX */}
            <div className="flex items-center gap-[4px]" style={{ paddingTop: '2px', paddingBottom: '6px' }}>
              <span className="text-[9px] font-medium text-[#a1a1a1] w-[42px] shrink-0">BID MAX</span>
              <StepperInput
                value={bidInput}
                onChange={handleBidChange}
                onBlur={handleBidBlur}
                onFocus={(e) => e.currentTarget.select()}
                onIncrement={handleBidIncrement}
                onDecrement={handleBidDecrement}
                incrementLabel="Increase BID MAX"
                decrementLabel="Decrease BID MAX"
                inputClassName="w-[80px]"
              />
            </div>

            {/* ASK MAX */}
            <div className="flex items-center gap-[4px]" style={{ paddingTop: '2px', paddingBottom: '2px' }}>
              <span className="text-[9px] font-medium text-[#a1a1a1] w-[42px] shrink-0">ASK MAX</span>
              <StepperInput
                value={askInput}
                onChange={handleAskChange}
                onBlur={handleAskBlur}
                onFocus={(e) => e.currentTarget.select()}
                onIncrement={handleAskIncrement}
                onDecrement={handleAskDecrement}
                incrementLabel="Increase ASK MAX"
                decrementLabel="Decrease ASK MAX"
                inputClassName="w-[80px]"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[rgba(255,255,255,0.1)]" />

          {/* Footer */}
          <div className="flex items-center justify-end gap-[4px]">
            <DSCButton
              size="xs"
              variant="secondary"
              onClick={handleCancel}
              style={{ paddingLeft: '8px', paddingRight: '8px' }}
            >
              Cancel
            </DSCButton>
            <DSCButton
              size="xs"
              variant="default"
              onClick={handleApply}
              disabled={!canApply}
              style={{ paddingLeft: '8px', paddingRight: '8px' }}
            >
              Apply
            </DSCButton>
          </div>

        </div>
      </PopoverContent>
    </Popover>
  );
}
