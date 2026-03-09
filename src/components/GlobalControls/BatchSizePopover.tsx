import { useState, useCallback, useMemo, useEffect } from 'react';
import { Package } from 'lucide-react';
import { Button as DSCButton } from '../dsc/button';
import { Popover, PopoverTrigger, PopoverContent } from '../dsc/popover';
import { StepperInput } from '../dsc/stepper-input';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useStreamStore } from '../../hooks/useStreamStore';

const MIN_QTY = 1;
const MAX_QTY = 50_000_000;
const STEP_QTY = 1_000;

function parseQty(raw: string): number | null {
  const stripped = raw.replace(/[^0-9]/g, '');
  if (stripped === '') return null;
  const parsed = parseInt(stripped, 10);
  return isNaN(parsed) ? null : parsed;
}

function isValidQty(v: number | null): v is number {
  return v !== null && v >= MIN_QTY && v <= MAX_QTY;
}

function clampQty(v: number): number {
  return Math.min(MAX_QTY, Math.max(MIN_QTY, v));
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

  const handleBidBlur = useCallback(() => {
    const parsed = parseQty(bidInput);
    if (parsed !== null) setBidInput(String(clampQty(parsed)));
  }, [bidInput]);

  const handleAskBlur = useCallback(() => {
    const parsed = parseQty(askInput);
    if (parsed !== null) setAskInput(String(clampQty(parsed)));
  }, [askInput]);

  const handleBidIncrement = useCallback(() => {
    setBidInput((v) => String(clampQty((parseQty(v) ?? 0) + STEP_QTY)));
  }, []);
  const handleBidDecrement = useCallback(() => {
    setBidInput((v) => String(clampQty((parseQty(v) ?? 0) - STEP_QTY)));
  }, []);
  const handleAskIncrement = useCallback(() => {
    setAskInput((v) => String(clampQty((parseQty(v) ?? 0) + STEP_QTY)));
  }, []);
  const handleAskDecrement = useCallback(() => {
    setAskInput((v) => String(clampQty((parseQty(v) ?? 0) - STEP_QTY)));
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
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <DSCButton
              variant="outline"
              size="sm"
              className="gap-1 shrink-0"
              style={{ paddingLeft: '12px', paddingRight: '12px' }}
              aria-label="Set quantities for all streams"
            >
              <Package className="h-4 w-4" />
              Batch Size
            </DSCButton>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Set quantities for all streams</TooltipContent>
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
        <div role="group" aria-label="Set Size (batch)" className="flex flex-col gap-[6px]">

          {/* Title */}
          <p className="text-[10px] font-semibold text-[#fafafa] leading-[10px]">
            Set Size (batch)
          </p>

          {/* Rows */}
          <div className="flex flex-col pt-[2px]">
            {affectedCount > 0 && (
              <p className="text-[9px] font-medium text-[#a1a1a1]" style={{ marginBottom: '10px' }}>
                Apply to {affectedCount} stream{affectedCount !== 1 ? 's' : ''} (current view)
              </p>
            )}

            {/* BID */}
            <div className="flex items-center gap-[4px]" style={{ paddingTop: '2px', paddingBottom: '6px' }}>
              <span className="text-[9px] font-medium text-[#a1a1a1] w-[24px] shrink-0">BID</span>
              <StepperInput
                value={bidInput}
                onChange={handleBidChange}
                onBlur={handleBidBlur}
                onFocus={(e) => e.currentTarget.select()}
                onIncrement={handleBidIncrement}
                onDecrement={handleBidDecrement}
                incrementLabel={`Increase by ${STEP_QTY.toLocaleString()}`}
                decrementLabel={`Decrease by ${STEP_QTY.toLocaleString()}`}
                inputClassName="w-[80px]"
              />
            </div>

            {/* ASK */}
            <div className="flex items-center gap-[4px]" style={{ paddingTop: '2px', paddingBottom: '2px' }}>
              <span className="text-[9px] font-medium text-[#a1a1a1] w-[24px] shrink-0">ASK</span>
              <StepperInput
                value={askInput}
                onChange={handleAskChange}
                onBlur={handleAskBlur}
                onFocus={(e) => e.currentTarget.select()}
                onIncrement={handleAskIncrement}
                onDecrement={handleAskDecrement}
                incrementLabel={`Increase by ${STEP_QTY.toLocaleString()}`}
                decrementLabel={`Decrease by ${STEP_QTY.toLocaleString()}`}
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
