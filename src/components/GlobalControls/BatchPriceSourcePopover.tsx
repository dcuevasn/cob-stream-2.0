import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Activity, Loader2, Search, Check, Pencil, X, ChevronLeft } from 'lucide-react';
import { Button as DSCButton } from '../dsc/button';
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from '../dsc/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { useStreamStore } from '../../hooks/useStreamStore';

interface SourceOption {
  value: string;
  label: string;
  group: 'Manual Entry' | 'Quote Feeds';
}

interface BatchPriceSourcePopoverProps {
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

export function BatchPriceSourcePopover({
  streamId,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  anchorRef,
  onBack,
}: BatchPriceSourcePopoverProps = {}) {
  const isScoped = !!streamId;
  const isControlled = externalOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const setOpen = useCallback((next: boolean) => {
    if (externalOnOpenChange) externalOnOpenChange(next);
    if (!isControlled) setInternalOpen(next);
  }, [externalOnOpenChange, isControlled]);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const batchUpdatePriceSource = useStreamStore((s) => s.batchUpdatePriceSource);
  const batchApplyChanges = useStreamStore((s) => s.batchApplyChanges);
  const batchRevertStagingChanges = useStreamStore((s) => s.batchRevertStagingChanges);
  const applyChanges = useStreamStore((s) => s.applyChanges);
  const revertStagingChanges = useStreamStore((s) => s.revertStagingChanges);
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

  /** Build the list: Manual + unique Quote Feeds from affected streams. */
  const options: SourceOption[] = useMemo(() => {
    const opts: SourceOption[] = [{ value: 'manual', label: 'Manual', group: 'Manual Entry' }];
    const seen = new Set<string>(['manual']);
    streams.forEach((stream) => {
      stream.quoteFeeds?.forEach((feed) => {
        if (!seen.has(feed.feedId)) {
          seen.add(feed.feedId);
          opts.push({ value: feed.feedId, label: feed.feedName, group: 'Quote Feeds' });
        }
      });
    });
    return opts;
  }, [streams]);

  const filteredOptions = useMemo(
    () =>
      options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      ),
    [options, search]
  );

  const groupedOptions = useMemo(() => {
    return filteredOptions.reduce((acc, option) => {
      if (!acc[option.group]) acc[option.group] = [];
      acc[option.group].push(option);
      return acc;
    }, {} as Record<string, SourceOption[]>);
  }, [filteredOptions]);

  const flatOptions = useMemo(
    () => [...(groupedOptions['Manual Entry'] ?? []), ...(groupedOptions['Quote Feeds'] ?? [])],
    [groupedOptions]
  );

  /** Reset to unselected state — user must explicitly pick a source. */
  const initFromStore = useCallback(() => {
    setSelected(null);
    setSearch('');
    setHighlightedIndex(0);
  }, []);

  // On open: re-init only when no staged changes; focus the search input.
  useEffect(() => {
    if (!open) return;
    if (!hasStagedChanges) initFromStore();
    requestAnimationFrame(() => inputRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the highlighted option scrolled into view on arrow navigation
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector('[data-highlighted="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  const applyToStore = useCallback((value: string) => {
    if (affectedCount === 0) return;
    batchUpdatePriceSource(value, undefined, isScoped ? streamId : undefined);
  }, [affectedCount, batchUpdatePriceSource, isScoped, streamId]);

  const handleSelect = useCallback((option: SourceOption) => {
    setSelected(option.value);
    applyToStore(option.value);
  }, [applyToStore]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => Math.min(prev + 1, flatOptions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatOptions[highlightedIndex]) handleSelect(flatOptions[highlightedIndex]);
          break;
      }
    },
    [flatOptions, highlightedIndex, handleSelect]
  );

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
                  aria-label="Set price source for this stream"
                >
                  <Activity className="h-3.5 w-3.5" />
                </DSCButton>
              ) : (
                <DSCButton
                  variant="outline"
                  size="sm"
                  className="gap-1 shrink-0"
                  style={{ paddingLeft: '12px', paddingRight: '12px' }}
                  aria-label="Set price source for all streams"
                >
                  <Activity className="h-4 w-4" />
                  Price Src
                </DSCButton>
              )}
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {isScoped ? 'Set price source for this stream' : 'Set price source for all streams'}
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
        className="w-[220px]"
      >
        <div role="group" aria-label={isScoped ? 'Set Price Source (stream)' : 'Set Price Source (batch)'} className="flex flex-col gap-[6px]">

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
              Set Price Source ({isScoped ? 'stream' : 'batch'})
            </p>
          </div>

          {affectedCount > 0 && (
            <p className="text-[9px] font-medium text-[#a1a1a1]">
              {isScoped
                ? 'Apply to this stream'
                : `Apply to ${affectedCount} stream${affectedCount !== 1 ? 's' : ''} (current view)`}
            </p>
          )}

          {/* Search input */}
          <div className="flex items-center gap-[6px] bg-[#262626] border border-white/10 rounded-[0.25rem] px-[6px]" style={{ height: '24px', marginTop: '2px' }}>
            <Search className="h-3 w-3 text-[#a1a1a1] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setHighlightedIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Search sources…"
              className="flex-1 min-w-0 h-full text-[10px] bg-transparent outline-none text-[#fafafa] placeholder:text-[#606060]"
              aria-label="Search price sources"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setHighlightedIndex(0);
                  inputRef.current?.focus();
                }}
                className="flex items-center justify-center h-3.5 w-3.5 rounded-full text-[#a1a1a1] hover:text-[#fafafa] hover:bg-white/[0.1] transition-colors shrink-0"
                aria-label="Clear search"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div ref={listRef} className="overflow-y-auto max-h-[160px] flex flex-col">
            {flatOptions.length === 0 ? (
              <div className="text-[10px] text-[#606060] text-center py-2">No sources found</div>
            ) : (
              (['Manual Entry', 'Quote Feeds'] as const).map((group) => {
                const groupItems = groupedOptions[group];
                if (!groupItems || groupItems.length === 0) return null;
                return (
                  <div key={group} className="flex flex-col">
                    <div className="text-[9px] font-medium text-[#606060] uppercase tracking-wider px-[6px] pt-[6px] pb-[2px]">
                      {group}
                    </div>
                    {groupItems.map((option) => {
                      const flatIndex = flatOptions.findIndex((o) => o.value === option.value);
                      const isHighlighted = flatIndex === highlightedIndex;
                      const isSelected = selected === option.value;
                      const Icon = option.group === 'Manual Entry' ? Pencil : Activity;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          data-highlighted={isHighlighted}
                          aria-selected={isSelected}
                          onClick={() => handleSelect(option)}
                          onMouseEnter={() => setHighlightedIndex(flatIndex)}
                          className={cn(
                            'flex items-center gap-[6px] px-[6px] py-[4px] text-[10px] text-left rounded-[0.25rem] transition-colors',
                            'text-[#d4d4d4] hover:bg-white/[0.07]',
                            isHighlighted && 'bg-white/[0.07]',
                            isSelected && 'text-[#fafafa]'
                          )}
                        >
                          <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                          <span className="truncate flex-1 min-w-0">{option.label}</span>
                          {isSelected && <Check className="h-3 w-3 shrink-0 text-blue-400" aria-hidden />}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
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
