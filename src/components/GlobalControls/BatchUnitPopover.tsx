import { useState, useCallback, useMemo, useEffect } from 'react';
import { Ruler, Loader2, ChevronLeft } from 'lucide-react';
import { Button as DSCButton } from '../dsc/button';
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from '../dsc/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn, isUdiSecurity } from '../../lib/utils';
import { useStreamStore } from '../../hooks/useStreamStore';

type PriceMode = 'quantity' | 'notional';

interface BatchUnitPopoverProps {
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

export function BatchUnitPopover({
  streamId,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  anchorRef,
  onBack,
}: BatchUnitPopoverProps = {}) {
  const isScoped = !!streamId;
  const isControlled = externalOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const setOpen = useCallback((next: boolean) => {
    if (externalOnOpenChange) externalOnOpenChange(next);
    if (!isControlled) setInternalOpen(next);
  }, [externalOnOpenChange, isControlled]);
  const [value, setValue] = useState<PriceMode | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const batchUpdatePriceMode = useStreamStore((s) => s.batchUpdatePriceMode);
  const batchApplyChanges = useStreamStore((s) => s.batchApplyChanges);
  const batchRevertStagingChanges = useStreamStore((s) => s.batchRevertStagingChanges);
  const applyChanges = useStreamStore((s) => s.applyChanges);
  const revertStagingChanges = useStreamStore((s) => s.revertStagingChanges);
  const updateStreamSet = useStreamStore((s) => s.updateStreamSet);
  const hasStagedStreamsInView = useStreamStore((s) => s.hasStagedStreamsInView);
  const getFilteredStreamSets = useStreamStore((s) => s.getFilteredStreamSets);
  const streamSets = useStreamStore((s) => s.streamSets);
  const activeTab = useStreamStore((s) => s.activeTab);
  const searchQuery = useStreamStore((s) => s.searchQuery);
  const preferences = useStreamStore((s) => s.preferences);

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

  /** Label for the Notional option — "Trade Amt" when all affected streams are UDI. */
  const notionalLabel = useMemo(() => {
    if (streams.length === 0) return 'Notional';
    const allUdi = streams.every((s) => isUdiSecurity(s.securityType));
    return allUdi ? 'Trade Amt' : 'Notional';
  }, [streams]);

  /** Reset to unselected state — user must explicitly pick from the segmented control. */
  const initFromStore = useCallback(() => {
    setValue(null);
  }, []);

  // On open, re-init only when there are no staged changes. When staged,
  // preserve the last selection so close/reopen keeps the pending toggle.
  useEffect(() => {
    if (!open) return;
    if (!hasStagedChanges) initFromStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applyToStore = useCallback((mode: PriceMode) => {
    if (affectedCount === 0) return;
    if (isScoped && scopedStream) {
      // Skip if snapshot already matches — avoids transient staging flash.
      const snapMode = scopedStream.lastLaunchedSnapshot?.priceMode ?? scopedStream.priceMode;
      if (mode === snapMode) return;
      updateStreamSet(scopedStream.id, { priceMode: mode });
    } else {
      batchUpdatePriceMode(mode);
    }
  }, [affectedCount, isScoped, scopedStream, batchUpdatePriceMode, updateStreamSet]);

  const handleSelect = useCallback((mode: PriceMode) => {
    setValue(mode);
    applyToStore(mode);
  }, [applyToStore]);

  const canApply = affectedCount > 0 && hasStagedChanges;

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
                  aria-label="Set unit type for this stream"
                >
                  <Ruler className="h-3.5 w-3.5" />
                </DSCButton>
              ) : (
                <DSCButton
                  variant="outline"
                  size="sm"
                  className="gap-1 shrink-0"
                  style={{ paddingLeft: '12px', paddingRight: '12px' }}
                  aria-label="Set unit type for all streams"
                >
                  <Ruler className="h-4 w-4" />
                  Unit
                </DSCButton>
              )}
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {isScoped ? 'Set unit type for this stream' : 'Set unit type for all streams'}
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
        <div role="group" aria-label={isScoped ? 'Set Unit (stream)' : 'Set Unit (batch)'} className="flex flex-col gap-[6px]">

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
              Set Unit ({isScoped ? 'stream' : 'batch'})
            </p>
          </div>

          {affectedCount > 0 && (
            <p className="text-[9px] font-medium text-[#a1a1a1]">
              {isScoped
                ? 'Apply to this stream'
                : `Apply to ${affectedCount} stream${affectedCount !== 1 ? 's' : ''} (current view)`}
            </p>
          )}

          {/* Segmented control */}
          <div
            role="tablist"
            aria-label="Volume unit"
            className="segmented-control h-6"
            style={{ marginTop: '2px' }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={value === 'quantity'}
              data-active={value === 'quantity'}
              onClick={() => handleSelect('quantity')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect('notional');
                }
              }}
              className={cn(
                'segmented-control-segment min-w-0 flex-1',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background'
              )}
            >
              QTY
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={value === 'notional'}
              data-active={value === 'notional'}
              title={notionalLabel === 'Trade Amt' ? 'Trade Amount (UDI)' : 'Notional'}
              onClick={() => handleSelect('notional')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect('quantity');
                }
              }}
              className={cn(
                'segmented-control-segment min-w-0 flex-1',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background'
              )}
            >
              {notionalLabel}
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-[rgba(255,255,255,0.1)]" style={{ marginTop: '2px' }} />

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
