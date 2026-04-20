import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { Button as DSCButton } from '../dsc/button';
import { Popover, PopoverTrigger, PopoverContent } from '../dsc/popover';
import { Checkbox } from '../dsc/checkbox';
import { Slider } from '../dsc/slider';
import { StepperInput } from '../dsc/stepper-input';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useStreamStore } from '../../hooks/useStreamStore';
import { useSpreadStepSize } from '../../hooks/useSpreadStepSize';
import { useDefaultSpreads } from '../../hooks/useDefaultSpreads';
import { SpreadStepSettings } from '../StreamTable/SpreadStepSettings';
const DEFAULT_SLIDER_RANGE = 10;

function roundBps(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function formatDelta(v: number): string {
  if (v === 0) return '0 bps';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(Math.abs(v) < 0.1 ? 3 : Math.abs(v) < 1 ? 2 : 1)} bps`;
}

function formatInputBps(v: number): string {
  if (v === 0) return '0';
  const s = v.toFixed(3);
  return s.replace(/\.?0+$/, '');
}

interface BatchSpreadPopoverProps {
  /** When provided, scopes the popover to a single stream instead of the filtered view. */
  streamId?: string;
}

export function BatchSpreadPopover({ streamId }: BatchSpreadPopoverProps = {}) {
  const isScoped = !!streamId;
  const [open, setOpen] = useState(false);
  const [bidDelta, setBidDelta] = useState(0);
  const [askDelta, setAskDelta] = useState(0);
  const [bidInputStr, setBidInputStr] = useState('0');
  const [askInputStr, setAskInputStr] = useState('0');
  const [isApplying, setIsApplying] = useState(false);

  // Track last committed values to compute incremental diffs for additive store actions
  const committedBid = useRef(0);
  const committedAsk = useRef(0);

  const adjustSpreadBid = useStreamStore((s) => s.adjustSpreadBid);
  const adjustSpreadAsk = useStreamStore((s) => s.adjustSpreadAsk);
  const batchApplyChanges = useStreamStore((s) => s.batchApplyChanges);
  const batchRevertStagingChanges = useStreamStore((s) => s.batchRevertStagingChanges);
  const applyChanges = useStreamStore((s) => s.applyChanges);
  const revertStagingChanges = useStreamStore((s) => s.revertStagingChanges);
  const updateStreamSet = useStreamStore((s) => s.updateStreamSet);
  const hasStagedStreamsInView = useStreamStore((s) => s.hasStagedStreamsInView);
  const getFilteredStreamSets = useStreamStore((s) => s.getFilteredStreamSets);
  const resetSpreadsForType = useStreamStore((s) => s.resetSpreadsForType);
  const setPreferences = useStreamStore((s) => s.setPreferences);
  const streamSets = useStreamStore((s) => s.streamSets);
  const activeTab = useStreamStore((s) => s.activeTab);
  const searchQuery = useStreamStore((s) => s.searchQuery);
  const preferences = useStreamStore((s) => s.preferences);

  const mirror = preferences.batchSpreadMirror ?? true;

  const { stepSize } = useSpreadStepSize();
  const { defaultSpreads } = useDefaultSpreads();

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
  const stagedCount = useMemo(
    () => streams.filter((s) => s.hasStagingChanges).length,
    [streams]
  );
  const hasStagedChanges = isScoped ? !!scopedStream?.hasStagingChanges : hasStagedStreamsInView();

  /** Per-stream incremental bid delta: add diff to each level's deltaBps. */
  const applyScopedBidDelta = useCallback((diff: number) => {
    if (!scopedStream || diff === 0) return;
    updateStreamSet(scopedStream.id, {
      bid: {
        ...scopedStream.bid,
        spreadMatrix: scopedStream.bid.spreadMatrix.map((l) => ({
          ...l,
          deltaBps: roundBps(l.deltaBps + diff),
        })),
      },
    });
  }, [scopedStream, updateStreamSet]);

  /** Per-stream incremental ask delta: ASK storage is negative, so widen (UI +) → store (-). */
  const applyScopedAskDelta = useCallback((diff: number) => {
    if (!scopedStream || diff === 0) return;
    updateStreamSet(scopedStream.id, {
      ask: {
        ...scopedStream.ask,
        spreadMatrix: scopedStream.ask.spreadMatrix.map((l) => ({
          ...l,
          deltaBps: roundBps(l.deltaBps + diff),
        })),
      },
    });
  }, [scopedStream, updateStreamSet]);

  // Dynamic slider range: expands symmetrically when input exceeds default
  const sliderRange = useMemo(() => {
    const maxAbs = Math.max(DEFAULT_SLIDER_RANGE, Math.abs(bidDelta), Math.abs(askDelta));
    return { min: -maxAbs, max: maxAbs };
  }, [bidDelta, askDelta]);

  // On open, reset session state only when there are no staged changes.
  // Preserving state when staging is live lets the user close/reopen the popover
  // and continue adjusting from the last delta (instead of snapping back to 0).
  useEffect(() => {
    if (!open) return;
    if (!hasStagedChanges) {
      setBidDelta(0);
      setAskDelta(0);
      setBidInputStr('0');
      setAskInputStr('0');
      committedBid.current = 0;
      committedAsk.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Push incremental bid diff to store and update committed ref
  const pushBidToStore = useCallback((newValue: number) => {
    if (affectedCount === 0) return;
    const diff = newValue - committedBid.current;
    if (diff !== 0) {
      if (isScoped) applyScopedBidDelta(diff);
      else adjustSpreadBid(diff);
      committedBid.current = newValue;
    }
  }, [affectedCount, isScoped, adjustSpreadBid, applyScopedBidDelta]);

  // Push incremental ask diff to store and update committed ref
  // ask widen = positive slider = negative store delta (sign inversion)
  const pushAskToStore = useCallback((newValue: number) => {
    if (affectedCount === 0) return;
    const diff = newValue - committedAsk.current;
    if (diff !== 0) {
      if (isScoped) applyScopedAskDelta(-diff);
      else adjustSpreadAsk(-diff);
      committedAsk.current = newValue;
    }
  }, [affectedCount, isScoped, adjustSpreadAsk, applyScopedAskDelta]);

  // Shared helper: apply a new bid delta value to all state + store
  const applyBidDelta = useCallback((v: number) => {
    setBidDelta(v);
    setBidInputStr(formatInputBps(v));
    pushBidToStore(v);
  }, [pushBidToStore]);

  // Shared helper: apply a new ask delta value to all state + store
  const applyAskDelta = useCallback((v: number) => {
    setAskDelta(v);
    setAskInputStr(formatInputBps(v));
    pushAskToStore(v);
  }, [pushAskToStore]);

  // Snap to zero when the slider value is within half a step of 0
  const snapToZero = useCallback((v: number) => Math.abs(v) < stepSize / 2 ? 0 : v, [stepSize]);

  const handleBidChange = useCallback(
    (value: number[]) => {
      const v = snapToZero(value[0] ?? 0);
      applyBidDelta(v);
      if (mirror) applyAskDelta(v);
    },
    [mirror, applyBidDelta, applyAskDelta, snapToZero]
  );

  const handleAskChange = useCallback(
    (value: number[]) => {
      if (mirror) return;
      applyAskDelta(snapToZero(value[0] ?? 0));
    },
    [mirror, applyAskDelta, snapToZero]
  );

  // --- Bid stepper input handlers ---
  const handleBidInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw !== '' && raw !== '-' && raw !== '.' && raw !== '-.' && !/^-?\d*\.?\d{0,3}$/.test(raw)) return;
    setBidInputStr(raw);
  }, []);

  const handleBidInputBlur = useCallback(() => {
    const n = parseFloat(bidInputStr);
    const value = !isNaN(n) ? roundBps(n) : 0;
    applyBidDelta(value);
    if (mirror) applyAskDelta(value);
  }, [bidInputStr, mirror, applyBidDelta, applyAskDelta]);

  const handleBidStepperIncrement = useCallback(() => {
    const next = roundBps(bidDelta + stepSize);
    applyBidDelta(next);
    if (mirror) applyAskDelta(next);
  }, [bidDelta, stepSize, mirror, applyBidDelta, applyAskDelta]);

  const handleBidStepperDecrement = useCallback(() => {
    const next = roundBps(bidDelta - stepSize);
    applyBidDelta(next);
    if (mirror) applyAskDelta(next);
  }, [bidDelta, stepSize, mirror, applyBidDelta, applyAskDelta]);

  // --- Ask stepper input handlers ---
  const handleAskInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (mirror) return;
    const raw = e.target.value;
    if (raw !== '' && raw !== '-' && raw !== '.' && raw !== '-.' && !/^-?\d*\.?\d{0,3}$/.test(raw)) return;
    setAskInputStr(raw);
  }, [mirror]);

  const handleAskInputBlur = useCallback(() => {
    if (mirror) return;
    const n = parseFloat(askInputStr);
    const value = !isNaN(n) ? roundBps(n) : 0;
    applyAskDelta(value);
  }, [askInputStr, mirror, applyAskDelta]);

  const handleAskStepperIncrement = useCallback(() => {
    if (mirror) return;
    const next = roundBps(askDelta + stepSize);
    applyAskDelta(next);
  }, [askDelta, stepSize, mirror, applyAskDelta]);

  const handleAskStepperDecrement = useCallback(() => {
    if (mirror) return;
    const next = roundBps(askDelta - stepSize);
    applyAskDelta(next);
  }, [askDelta, stepSize, mirror, applyAskDelta]);

  const handleMirrorChange = useCallback(
    (checked: boolean) => {
      setPreferences({ batchSpreadMirror: checked });
      if (checked) {
        applyAskDelta(bidDelta);
      }
    },
    [bidDelta, applyAskDelta, setPreferences]
  );

  const canApply = affectedCount > 0 && hasStagedChanges;

  // Reset all UI delta state (used after apply/cancel when staging is cleared)
  const resetDeltaState = useCallback(() => {
    setBidDelta(0);
    setAskDelta(0);
    setBidInputStr('0');
    setAskInputStr('0');
    committedBid.current = 0;
    committedAsk.current = 0;
  }, []);

  const handleApply = useCallback(async () => {
    if (!canApply || isApplying) return;
    setIsApplying(true);
    try {
      if (isScoped && streamId) await applyChanges(streamId);
      else await batchApplyChanges();
      resetDeltaState();
    } finally {
      setIsApplying(false);
    }
    setOpen(false);
  }, [canApply, isApplying, isScoped, streamId, applyChanges, batchApplyChanges, resetDeltaState]);

  const handleCancel = useCallback(() => {
    if (isScoped && streamId) revertStagingChanges(streamId);
    else batchRevertStagingChanges();
    resetDeltaState();
    setOpen(false);
  }, [isScoped, streamId, revertStagingChanges, batchRevertStagingChanges, resetDeltaState]);

  const handleDefaultSpread = useCallback(() => {
    if (affectedCount === 0) return;
    if (isScoped && scopedStream) {
      // Per-stream reset: overwrite spreadMatrix.deltaBps with defaults
      const newBidMatrix = scopedStream.bid.spreadMatrix.map((l, i) => ({
        ...l,
        deltaBps: roundBps(defaultSpreads.bid[i] ?? l.deltaBps),
      }));
      const newAskMatrix = scopedStream.ask.spreadMatrix.map((l, i) => ({
        ...l,
        deltaBps: roundBps(defaultSpreads.ask[i] ?? l.deltaBps),
      }));
      updateStreamSet(scopedStream.id, {
        bid: { ...scopedStream.bid, spreadMatrix: newBidMatrix },
        ask: { ...scopedStream.ask, spreadMatrix: newAskMatrix },
      });
    } else {
      resetSpreadsForType('bid');
      resetSpreadsForType('ask');
    }
    // Reset slider state since spreads are now absolute defaults, not relative adjustments
    setBidDelta(0);
    setAskDelta(0);
    setBidInputStr('0');
    setAskInputStr('0');
    committedBid.current = 0;
    committedAsk.current = 0;
  }, [affectedCount, isScoped, scopedStream, defaultSpreads, updateStreamSet, resetSpreadsForType]);

  // Dynamic range color: green for widen (+), amber for narrow (-), neutral for 0
  const bidRangeClass =
    bidDelta > 0 ? 'bg-green-500/80' : bidDelta < 0 ? 'bg-amber-500/80' : 'bg-[#525252]';
  const askRangeClass =
    askDelta > 0 ? 'bg-green-500/80' : askDelta < 0 ? 'bg-amber-500/80' : 'bg-[#525252]';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            {isScoped ? (
              <DSCButton
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 shrink-0 min-w-[24px] text-[#a1a1a1]"
                onClick={(e) => e.stopPropagation()}
                aria-label="Adjust spread for this stream"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </DSCButton>
            ) : (
              <DSCButton
                variant="outline"
                size="sm"
                className="gap-1 shrink-0"
                style={{ paddingLeft: '12px', paddingRight: '12px' }}
                aria-label="Adjust spread for all streams"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Spread
              </DSCButton>
            )}
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {isScoped ? 'Adjust spread for this stream' : 'Adjust spread for all streams'}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        sideOffset={6}
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '8px' }}
        className="w-[290px]"
      >
        <div role="group" aria-label={isScoped ? 'Adjust Spread (stream)' : 'Adjust Spread (batch)'} className="flex flex-col gap-[6px]">

          {/* Title */}
          <p className="text-[10px] font-semibold text-[#fafafa] leading-[10px]">
            Adjust Spread ({isScoped ? 'stream' : 'batch'})
          </p>

          {affectedCount > 0 && (
            isScoped ? (
              stagedCount > 0 ? (
                <p className="text-[9px] font-medium text-[#a1a1a1]">Pending changes — apply to commit</p>
              ) : (
                <p className="text-[9px] font-medium text-[#606060]">No pending changes</p>
              )
            ) : stagedCount > 0 ? (
              <p className="text-[9px] font-medium text-[#a1a1a1]">
                Will apply to{' '}
                <span className="text-[#fafafa] font-semibold">{stagedCount}</span>{' '}
                staged stream{stagedCount !== 1 ? 's' : ''}
              </p>
            ) : (
              <p className="text-[9px] font-medium text-[#606060]">
                {affectedCount} stream{affectedCount !== 1 ? 's' : ''} in current view — no pending changes
              </p>
            )
          )}

          {/* Sliders */}
          <div className="flex flex-col gap-[10px] pt-[4px]">

            {/* BID */}
            <div className="flex flex-col gap-[5px]">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold text-[#a1a1a1] uppercase tracking-wide">BID</span>
                <div className="flex items-center gap-[6px]">
                  <span
                    className={
                      bidDelta === 0
                        ? 'text-[9px] font-medium text-[#606060]'
                        : bidDelta > 0
                        ? 'text-[9px] font-semibold text-green-400'
                        : 'text-[9px] font-semibold text-amber-400'
                    }
                  >
                    {formatDelta(bidDelta)}
                  </span>
                  <StepperInput
                    value={bidInputStr}
                    onChange={handleBidInputChange}
                    onBlur={handleBidInputBlur}
                    onFocus={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    onIncrement={handleBidStepperIncrement}
                    onDecrement={handleBidStepperDecrement}
                    incrementLabel={`Increase by ${stepSize} bps`}
                    decrementLabel={`Decrease by ${stepSize} bps`}
                    inputClassName="w-[44px]"
                  />
                </div>
              </div>
              <Slider
                value={[bidDelta]}
                onValueChange={handleBidChange}
                min={sliderRange.min}
                max={sliderRange.max}
                step={stepSize}
                rangeClassName={bidRangeClass}
                aria-label="Bid spread adjustment"
              />
              <div className="flex justify-between">
                <span className="text-[8px] text-[#606060]">Narrow</span>
                <span className="text-[8px] text-[#606060]">Widen</span>
              </div>
            </div>

            {/* ASK */}
            <div className={`flex flex-col gap-[5px] ${mirror ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-semibold text-[#a1a1a1] uppercase tracking-wide">ASK</span>
                  {mirror && (
                    <span className="text-[8px] text-[#606060] italic">(mirrored)</span>
                  )}
                </div>
                <div className="flex items-center gap-[6px]">
                  <span
                    className={
                      askDelta === 0
                        ? 'text-[9px] font-medium text-[#606060]'
                        : askDelta > 0
                        ? 'text-[9px] font-semibold text-green-400'
                        : 'text-[9px] font-semibold text-amber-400'
                    }
                  >
                    {formatDelta(askDelta)}
                  </span>
                  <StepperInput
                    value={askInputStr}
                    onChange={handleAskInputChange}
                    onBlur={handleAskInputBlur}
                    onFocus={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    onIncrement={handleAskStepperIncrement}
                    onDecrement={handleAskStepperDecrement}
                    incrementLabel={`Increase by ${stepSize} bps`}
                    decrementLabel={`Decrease by ${stepSize} bps`}
                    disabled={mirror}
                    inputClassName="w-[44px]"
                  />
                </div>
              </div>
              <Slider
                value={[askDelta]}
                onValueChange={handleAskChange}
                min={sliderRange.min}
                max={sliderRange.max}
                step={stepSize}
                disabled={mirror}
                rangeClassName={askRangeClass}
                aria-label="Ask spread adjustment"
              />
              <div className="flex justify-between">
                <span className="text-[8px] text-[#606060]">Narrow</span>
                <span className="text-[8px] text-[#606060]">Widen</span>
              </div>
            </div>
          </div>

          {/* Mirror checkbox */}
          <div className="flex items-center gap-[6px] pt-[2px]">
            <Checkbox
              id="batch-spread-mirror"
              checked={mirror}
              onCheckedChange={handleMirrorChange}
            />
            <label
              htmlFor="batch-spread-mirror"
              className="text-[9px] font-medium text-[#a1a1a1] cursor-pointer select-none"
            >
              Mirror Bid → Ask
            </label>
          </div>

          {/* Divider */}
          <div className="h-px bg-[rgba(255,255,255,0.1)]" />

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[4px]">
              <SpreadStepSettings />
              <DSCButton
                size="xs"
                variant="secondary"
                onClick={handleDefaultSpread}
                disabled={affectedCount === 0}
                style={{ paddingLeft: '8px', paddingRight: '8px' }}
              >
                Default SPRD.
              </DSCButton>
            </div>
            <div className="flex items-center gap-[4px]">
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

        </div>
      </PopoverContent>
    </Popover>
  );
}
