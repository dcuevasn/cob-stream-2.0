import { useState, useCallback, useMemo, useEffect } from 'react';
import { Package, Loader2, ChevronLeft } from 'lucide-react';
import { Button as DSCButton } from '../dsc/button';
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from '../dsc/popover';
import { StepperInput } from '../dsc/stepper-input';
import { Checkbox } from '../dsc/checkbox';
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

interface BatchSizePopoverProps {
  /** When provided, scopes the popover to a single stream instead of the filtered view. */
  streamId?: string;
  /** Controlled open state (for nesting inside a parent like More Actions). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When provided, positions the popover relative to this ref instead of rendering its own trigger. */
  anchorRef?: React.RefObject<HTMLElement | null>;
  /** When provided, shows a back button in the title that closes this popover and invokes the handler. */
  onBack?: () => void;
}

export function BatchSizePopover({
  streamId,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  anchorRef,
  onBack,
}: BatchSizePopoverProps = {}) {
  const isScoped = !!streamId;
  const isControlled = externalOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const setOpen = useCallback((next: boolean) => {
    if (externalOnOpenChange) externalOnOpenChange(next);
    if (!isControlled) setInternalOpen(next);
  }, [externalOnOpenChange, isControlled]);
  const initialBid = useStreamStore.getState().preferences.batchSizeBid ?? 1000;
  const initialAsk = useStreamStore.getState().preferences.batchSizeAsk ?? 1000;
  const [bidInput, setBidInput] = useState(String(initialBid));
  const [askInput, setAskInput] = useState(String(initialAsk));
  const [isApplying, setIsApplying] = useState(false);

  const batchUpdateQty = useStreamStore((s) => s.batchUpdateQty);
  const batchApplyChanges = useStreamStore((s) => s.batchApplyChanges);
  const batchRevertStagingChanges = useStreamStore((s) => s.batchRevertStagingChanges);
  const applyChanges = useStreamStore((s) => s.applyChanges);
  const revertStagingChanges = useStreamStore((s) => s.revertStagingChanges);
  const updateStreamSet = useStreamStore((s) => s.updateStreamSet);
  const hasStagedStreamsInView = useStreamStore((s) => s.hasStagedStreamsInView);
  const getFilteredStreamSets = useStreamStore((s) => s.getFilteredStreamSets);
  const setPreferences = useStreamStore((s) => s.setPreferences);
  const streamSets = useStreamStore((s) => s.streamSets);
  const activeTab = useStreamStore((s) => s.activeTab);
  const searchQuery = useStreamStore((s) => s.searchQuery);
  const preferences = useStreamStore((s) => s.preferences);

  const mirror = preferences.batchSizeMirror ?? true;

  const scopedStream = useMemo(
    () => (streamId ? streamSets.find((s) => s.id === streamId) : null),
    [streamId, streamSets]
  );

  const streams = useMemo(
    () => (isScoped ? (scopedStream ? [scopedStream] : []) : getFilteredStreamSets()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isScoped, scopedStream, getFilteredStreamSets, streamSets, activeTab, searchQuery, preferences]
  );
  const affectedCount = streams.length;
  const hasStagedChanges = isScoped ? !!scopedStream?.hasStagingChanges : hasStagedStreamsInView();

  // Read scoped stream's L1 qty (scoped) or last-used values from preferences (batch)
  const initFromStore = useCallback(() => {
    if (isScoped && scopedStream) {
      const bidQ = scopedStream.bid.spreadMatrix[0]?.quantity ?? 1000;
      const askQ = scopedStream.ask.spreadMatrix[0]?.quantity ?? 1000;
      setBidInput(String(bidQ));
      setAskInput(String(askQ));
      return;
    }
    setBidInput(String(preferences.batchSizeBid ?? 1000));
    setAskInput(String(preferences.batchSizeAsk ?? 1000));
  }, [isScoped, scopedStream, preferences.batchSizeBid, preferences.batchSizeAsk]);

  // On open, re-init only when there are no staged changes. When staged,
  // preserve the last input values so close/reopen keeps the pending edit.
  useEffect(() => {
    if (!open) return;
    if (!hasStagedChanges) initFromStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Apply to store immediately on valid value (real-time staging). In batch mode,
  // also persist last-used values to user preferences.
  const applyToStore = useCallback((bid: string, ask: string) => {
    const bidVal = parseQty(bid);
    const askVal = parseQty(ask);
    if (!isValidQty(bidVal) || !isValidQty(askVal)) return;
    if (isScoped && scopedStream) {
      const newBidMatrix = scopedStream.bid.spreadMatrix.map((l) => ({ ...l, quantity: bidVal }));
      const newAskMatrix = scopedStream.ask.spreadMatrix.map((l) => ({ ...l, quantity: askVal }));
      updateStreamSet(scopedStream.id, {
        bid: { ...scopedStream.bid, spreadMatrix: newBidMatrix },
        ask: { ...scopedStream.ask, spreadMatrix: newAskMatrix },
      });
    } else {
      setPreferences({ batchSizeBid: bidVal, batchSizeAsk: askVal });
      if (affectedCount > 0) batchUpdateQty(bidVal, askVal);
    }
  }, [affectedCount, isScoped, scopedStream, batchUpdateQty, updateStreamSet, setPreferences]);

  const handleBidChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setBidInput(raw);
    if (mirror) setAskInput(raw);
  }, [mirror]);

  const handleAskChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAskInput(raw);
    if (mirror) setBidInput(raw);
  }, [mirror]);

  const handleBidBlur = useCallback(() => {
    const parsed = parseQty(bidInput);
    if (parsed !== null) {
      const clamped = String(clampQty(parsed));
      setBidInput(clamped);
      const nextAsk = mirror ? clamped : askInput;
      if (mirror) setAskInput(clamped);
      applyToStore(clamped, nextAsk);
    }
  }, [bidInput, askInput, mirror, applyToStore]);

  const handleAskBlur = useCallback(() => {
    const parsed = parseQty(askInput);
    if (parsed !== null) {
      const clamped = String(clampQty(parsed));
      setAskInput(clamped);
      const nextBid = mirror ? clamped : bidInput;
      if (mirror) setBidInput(clamped);
      applyToStore(nextBid, clamped);
    }
  }, [bidInput, askInput, mirror, applyToStore]);

  const handleBidIncrement = useCallback(() => {
    setBidInput((v) => {
      const next = String(clampQty((parseQty(v) ?? 0) + STEP_QTY));
      const nextAsk = mirror ? next : askInput;
      if (mirror) setAskInput(next);
      applyToStore(next, nextAsk);
      return next;
    });
  }, [askInput, mirror, applyToStore]);

  const handleBidDecrement = useCallback(() => {
    setBidInput((v) => {
      const next = String(clampQty((parseQty(v) ?? 0) - STEP_QTY));
      const nextAsk = mirror ? next : askInput;
      if (mirror) setAskInput(next);
      applyToStore(next, nextAsk);
      return next;
    });
  }, [askInput, mirror, applyToStore]);

  const handleAskIncrement = useCallback(() => {
    setAskInput((v) => {
      const next = String(clampQty((parseQty(v) ?? 0) + STEP_QTY));
      const nextBid = mirror ? next : bidInput;
      if (mirror) setBidInput(next);
      applyToStore(nextBid, next);
      return next;
    });
  }, [bidInput, mirror, applyToStore]);

  const handleAskDecrement = useCallback(() => {
    setAskInput((v) => {
      const next = String(clampQty((parseQty(v) ?? 0) - STEP_QTY));
      const nextBid = mirror ? next : bidInput;
      if (mirror) setBidInput(next);
      applyToStore(nextBid, next);
      return next;
    });
  }, [bidInput, mirror, applyToStore]);

  const handleMirrorChange = useCallback(
    (checked: boolean) => {
      setPreferences({ batchSizeMirror: checked });
      if (checked) {
        setAskInput(bidInput);
        applyToStore(bidInput, bidInput);
      }
    },
    [bidInput, applyToStore, setPreferences]
  );

  const bidParsed = parseQty(bidInput);
  const askParsed = parseQty(askInput);
  const bidValid = isValidQty(bidParsed);
  const askValid = isValidQty(askParsed);
  const canApply = affectedCount > 0 && bidValid && askValid && hasStagedChanges;

  const handleApply = useCallback(async () => {
    if (!canApply || isApplying) return;
    setIsApplying(true);
    try {
      if (isScoped && streamId) await applyChanges(streamId);
      else await batchApplyChanges();
      initFromStore();
    } finally {
      setIsApplying(false);
    }
    setOpen(false);
  }, [canApply, isApplying, isScoped, streamId, applyChanges, batchApplyChanges, initFromStore]);

  const handleCancel = useCallback(() => {
    if (isScoped && streamId) revertStagingChanges(streamId);
    else batchRevertStagingChanges();
    initFromStore();
    setOpen(false);
  }, [isScoped, streamId, revertStagingChanges, batchRevertStagingChanges, initFromStore]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {anchorRef ? (
        <PopoverAnchor virtualRef={anchorRef} />
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              {isScoped ? (
                <DSCButton
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 shrink-0 min-w-[24px] text-[#a1a1a1]"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Set quantities for this stream"
                >
                  <Package className="h-3.5 w-3.5" />
                </DSCButton>
              ) : (
                <DSCButton
                  variant="outline"
                  size="sm"
                  className="gap-1 shrink-0"
                  style={{ paddingLeft: '12px', paddingRight: '12px' }}
                  aria-label="Set quantities for all streams"
                >
                  <Package className="h-4 w-4" />
                  Size
                </DSCButton>
              )}
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {isScoped ? 'Set quantities for this stream' : 'Set quantities for all streams'}
          </TooltipContent>
        </Tooltip>
      )}

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
        <div role="group" aria-label={isScoped ? 'Set Size (stream)' : 'Set Size (batch)'} className="flex flex-col gap-[6px]">

          {/* Title */}
          <div className="flex items-center gap-[6px]">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to menu"
                className="flex items-center justify-center h-4 w-4 rounded-[0.2rem] text-[#a1a1a1] hover:text-[#fafafa] hover:bg-white/[0.07] transition-colors shrink-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
            )}
            <p className="text-[10px] font-semibold text-[#fafafa] leading-[10px]">
              Set Size ({isScoped ? 'stream' : 'batch'})
            </p>
          </div>

          {/* Rows */}
          <div className="flex flex-col pt-[2px]">
            {affectedCount > 0 && (
              <p className="text-[9px] font-medium text-[#a1a1a1]" style={{ marginBottom: '10px' }}>
                {isScoped
                  ? 'Apply to this stream'
                  : `Apply to ${affectedCount} stream${affectedCount !== 1 ? 's' : ''} (current view)`}
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
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
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
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                onIncrement={handleAskIncrement}
                onDecrement={handleAskDecrement}
                incrementLabel={`Increase by ${STEP_QTY.toLocaleString()}`}
                decrementLabel={`Decrease by ${STEP_QTY.toLocaleString()}`}
                inputClassName="w-[80px]"
              />
            </div>
          </div>

          {/* Mirror checkbox */}
          <div className="flex items-center gap-[6px]" style={{ paddingTop: '2px', paddingBottom: '2px' }}>
            <Checkbox
              id="batch-size-mirror"
              checked={mirror}
              onCheckedChange={handleMirrorChange}
            />
            <label
              htmlFor="batch-size-mirror"
              className="text-[9px] font-medium text-[#a1a1a1] cursor-pointer select-none"
            >
              Mirror
            </label>
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
              disabled={!canApply || isApplying}
              style={{ paddingLeft: '8px', paddingRight: '8px' }}
            >
              {isApplying ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Apply changes'}
            </DSCButton>
          </div>

        </div>
      </PopoverContent>
    </Popover>
  );
}
