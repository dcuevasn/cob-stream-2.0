import { useState, useCallback, useMemo, useEffect } from 'react';
import { Layers, Loader2 } from 'lucide-react';
import { Button as DSCButton } from '../dsc/button';
import { Popover, PopoverTrigger, PopoverContent } from '../dsc/popover';
import { Slider } from '../dsc/slider';
import { Checkbox } from '../dsc/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useStreamStore } from '../../hooks/useStreamStore';

const MIN_LVLS = 0;
const MAX_LVLS = 5;

function clampMaxLvls(v: number): number {
  return Math.min(MAX_LVLS, Math.max(MIN_LVLS, v));
}

const LEVEL_LABELS = ['0', '1', '2', '3', '4', '5'];

interface BatchMaxLevelsPopoverProps {
  /** When provided, scopes the popover to a single stream instead of the filtered view. */
  streamId?: string;
}

export function BatchMaxLevelsPopover({ streamId }: BatchMaxLevelsPopoverProps = {}) {
  const isScoped = !!streamId;
  const [open, setOpen] = useState(false);
  const [bidValue, setBidValue] = useState(1);
  const [askValue, setAskValue] = useState(1);
  const [isApplying, setIsApplying] = useState(false);

  const batchUpdateMaxLvls = useStreamStore((s) => s.batchUpdateMaxLvls);
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

  const mirror = preferences.batchMaxLvlsMirror ?? true;

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
  const hasStagedChanges = useMemo(
    () => (isScoped ? !!scopedStream?.hasStagingChanges : hasStagedStreamsInView()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isScoped, scopedStream, hasStagedStreamsInView, streamSets]
  );

  // Read scoped stream values (scoped) or dominant value across view (batch)
  const initFromStore = useCallback(() => {
    if (isScoped && scopedStream) {
      setBidValue(clampMaxLvls(scopedStream.bid.maxLvls ?? 1));
      setAskValue(clampMaxLvls(scopedStream.ask.maxLvls ?? 1));
      return;
    }
    if (streams.length > 0) {
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
      setBidValue(clampMaxLvls(dominantBid));
      setAskValue(clampMaxLvls(dominantAsk));
    }
  }, [isScoped, scopedStream, streams]);

  // On open, re-init only when there are no staged changes. When staged,
  // preserve the last slider position so close/reopen keeps the pending delta.
  useEffect(() => {
    if (!open) return;
    if (!hasStagedChanges) initFromStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applyToStore = useCallback((bid: number, ask: number) => {
    if (affectedCount === 0) return;
    if (isScoped && scopedStream) {
      updateStreamSet(scopedStream.id, {
        bid: { ...scopedStream.bid, maxLvls: bid },
        ask: { ...scopedStream.ask, maxLvls: ask },
      });
    } else {
      batchUpdateMaxLvls(bid, ask);
    }
  }, [affectedCount, isScoped, scopedStream, batchUpdateMaxLvls, updateStreamSet]);

  const handleBidChange = useCallback((value: number[]) => {
    const v = clampMaxLvls(value[0] ?? 1);
    setBidValue(v);
    if (mirror) {
      setAskValue(v);
      applyToStore(v, v);
    } else {
      applyToStore(v, askValue);
    }
  }, [mirror, askValue, applyToStore]);

  const handleAskChange = useCallback((value: number[]) => {
    const v = clampMaxLvls(value[0] ?? 1);
    setAskValue(v);
    if (mirror) {
      setBidValue(v);
      applyToStore(v, v);
    } else {
      applyToStore(bidValue, v);
    }
  }, [mirror, bidValue, applyToStore]);

  const handleMirrorChange = useCallback((checked: boolean) => {
    setPreferences({ batchMaxLvlsMirror: checked });
    if (checked) {
      setAskValue(bidValue);
      applyToStore(bidValue, bidValue);
    }
  }, [bidValue, applyToStore, setPreferences]);

  const handleApply = useCallback(async () => {
    if (!hasStagedChanges || isApplying) return;
    setIsApplying(true);
    try {
      if (isScoped && streamId) await applyChanges(streamId);
      else await batchApplyChanges();
      initFromStore();
    } finally {
      setIsApplying(false);
    }
    setOpen(false);
  }, [hasStagedChanges, isApplying, isScoped, streamId, applyChanges, batchApplyChanges, initFromStore]);

  const handleCancel = useCallback(() => {
    if (isScoped && streamId) revertStagingChanges(streamId);
    else batchRevertStagingChanges();
    initFromStore();
    setOpen(false);
  }, [isScoped, streamId, revertStagingChanges, batchRevertStagingChanges, initFromStore]);

  const canApply = affectedCount > 0 && hasStagedChanges;

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
                aria-label="Set max levels for this stream"
              >
                <Layers className="h-3.5 w-3.5" />
              </DSCButton>
            ) : (
              <DSCButton
                variant="outline"
                size="sm"
                className="gap-1 shrink-0"
                style={{ paddingLeft: '12px', paddingRight: '12px' }}
                aria-label="Set max levels for all streams"
              >
                <Layers className="h-4 w-4" />
                Max Lvls
              </DSCButton>
            )}
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {isScoped ? 'Set max levels for this stream' : 'Set max levels for all streams'}
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
        className="w-[210px]"
      >
        <div role="group" aria-label={isScoped ? 'Set MAX Levels (stream)' : 'Set MAX Levels (batch)'} className="flex flex-col gap-[6px]">

          {/* Title */}
          <p className="text-[10px] font-semibold text-[#fafafa] leading-[10px]">
            Set MAX Levels ({isScoped ? 'stream' : 'batch'})
          </p>

          {affectedCount > 0 && (
            <p className="text-[9px] font-medium text-[#a1a1a1]">
              {isScoped
                ? 'Apply to this stream'
                : `Apply to ${affectedCount} stream${affectedCount !== 1 ? 's' : ''} (current view)`}
            </p>
          )}

          {/* Sliders */}
          <div className="flex flex-col gap-[10px] pt-[4px]">

            {/* BID MAX */}
            <div className="flex flex-col gap-[5px]">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold text-[#a1a1a1] uppercase tracking-wide">BID MAX</span>
                <span className="text-[9px] font-semibold text-[#fafafa] tabular-nums">
                  {bidValue} {bidValue === 1 ? 'level' : 'levels'}
                </span>
              </div>
              <Slider
                value={[bidValue]}
                onValueChange={handleBidChange}
                min={MIN_LVLS}
                max={MAX_LVLS}
                step={1}
                aria-label="BID MAX levels"
              />
              <div className="flex justify-between">
                {LEVEL_LABELS.map((l) => (
                  <span key={l} className="text-[8px] text-[#606060] w-3 text-center">{l}</span>
                ))}
              </div>
            </div>

            {/* ASK MAX */}
            <div className="flex flex-col gap-[5px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-semibold text-[#a1a1a1] uppercase tracking-wide">ASK MAX</span>
                  {mirror && <span className="text-[8px] text-[#606060] italic">(mirrored)</span>}
                </div>
                <span className="text-[9px] font-semibold text-[#fafafa] tabular-nums">
                  {askValue} {askValue === 1 ? 'level' : 'levels'}
                </span>
              </div>
              <Slider
                value={[askValue]}
                onValueChange={handleAskChange}
                min={MIN_LVLS}
                max={MAX_LVLS}
                step={1}
                aria-label="ASK MAX levels"
              />
              <div className="flex justify-between">
                {LEVEL_LABELS.map((l) => (
                  <span key={l} className="text-[8px] text-[#606060] w-3 text-center">{l}</span>
                ))}
              </div>
            </div>

          </div>

          {/* Mirror checkbox */}
          <div className="flex items-center gap-[6px] pt-[2px]">
            <Checkbox
              id="batch-max-lvls-mirror"
              checked={mirror}
              onCheckedChange={handleMirrorChange}
            />
            <label
              htmlFor="batch-max-lvls-mirror"
              className="text-[9px] font-medium text-[#a1a1a1] cursor-pointer select-none"
            >
              Mirror Bid → Ask
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
