import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, Check, Hand, Signal, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { useStreamStore } from '../../hooks/useStreamStore';
import { BatchAffordanceMarker } from './BatchAffordanceMarker';
import type { CompactSelectOption } from '../ui/compact-select';

/** Build batch options: Manual + unique Quote Feeds from all streams in current view.
 * Subscribes to stable store values to avoid infinite re-renders (getFilteredStreamSets returns new array each call). */
function useBatchPriceSourceOptions(): CompactSelectOption[] {
  const streamSets = useStreamStore((s) => s.streamSets);
  const activeTab = useStreamStore((s) => s.activeTab);
  const searchQuery = useStreamStore((s) => s.searchQuery);
  const preferences = useStreamStore((s) => s.preferences);

  return useMemo(() => {
    const streams = useStreamStore.getState().getFilteredStreamSets();
    const options: CompactSelectOption[] = [{ value: 'manual', label: 'Manual', group: '' }];
    const seen = new Set<string>(['manual']);

    streams.forEach((stream) => {
      stream.quoteFeeds?.forEach((feed) => {
        if (!seen.has(feed.feedId)) {
          seen.add(feed.feedId);
          options.push({
            value: feed.feedId,
            label: feed.feedName,
            group: 'Quote Feeds',
          });
        }
      });
    });

    return options;
  }, [streamSets, activeTab, searchQuery, preferences]);
}

function getOptionIcon(option: CompactSelectOption) {
  return option.value === 'manual' || !option.group ? (
    <Hand className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
  ) : (
    <Signal className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
  );
}

export function PriceSourceBatchPopover() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const options = useBatchPriceSourceOptions();
  const batchUpdatePriceSource = useStreamStore((s) => s.batchUpdatePriceSource);
  const streamSets = useStreamStore((s) => s.streamSets);
  const activeTab = useStreamStore((s) => s.activeTab);
  const searchQuery = useStreamStore((s) => s.searchQuery);
  const preferences = useStreamStore((s) => s.preferences);

  // Get dominant/consistent price source from filtered streams
  const dominantPriceSource = useMemo(() => {
    const streams = useStreamStore.getState().getFilteredStreamSets();
    if (streams.length === 0) return null;
    
    // Count occurrences of each price source
    const sourceCounts = new Map<string, number>();
    streams.forEach((stream) => {
      const source = stream.selectedPriceSource || 'manual';
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    });
    
    // Find the most common source (must be >50% to be considered "dominant")
    let maxCount = 0;
    let dominantSource: string | null = null;
    sourceCounts.forEach((count, source) => {
      if (count > maxCount) {
        maxCount = count;
        dominantSource = source;
      }
    });
    
    // Only return dominant if it's used by majority
    return maxCount >= streams.length / 2 ? dominantSource : null;
  }, [streamSets, activeTab, searchQuery, preferences]);
  
  // Get display label for dominant source
  const dominantLabel = useMemo(() => {
    if (!dominantPriceSource) return null;
    const option = options.find((o) => o.value === dominantPriceSource);
    return option?.label || null;
  }, [dominantPriceSource, options]);

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );
  const groupedOptions = filteredOptions.reduce((acc, option) => {
    const group = option.group || '';
    if (!acc[group]) acc[group] = [];
    acc[group].push(option);
    return acc;
  }, {} as Record<string, CompactSelectOption[]>);
  const flatOptions = Object.values(groupedOptions).flat();

  useEffect(() => {
    if (open) {
      setSearch('');
      setHighlightedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (open && listRef.current) {
      const highlighted = listRef.current.querySelector('[data-highlighted="true"]');
      highlighted?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  const handleSelect = useCallback(
    (option: CompactSelectOption) => {
      if (isApplying) return;
      setIsApplying(true);
      batchUpdatePriceSource(option.value);
      // Brief feedback then close
      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsApplying(false);
          setOpen(false);
        }, 150);
      });
    },
    [batchUpdatePriceSource, isApplying]
  );

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
          if (flatOptions[highlightedIndex]) {
            handleSelect(flatOptions[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [flatOptions, highlightedIndex, handleSelect]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'relative flex items-center gap-1.5 w-full text-left outline-none group',
                'hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset rounded px-0.5 -mx-0.5'
              )}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-label="Price Source - View batch actions"
            >
              <span className="truncate">
                {dominantLabel ? `Price Source: ${dominantLabel}` : 'Price Source'}
              </span>
              <BatchAffordanceMarker />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>View batch actions</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="start"
        sideOffset={4}
        collisionPadding={8}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className={cn(
          'min-w-[160px] max-w-[200px] p-0 overflow-hidden',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
        )}
      >
        <div
          role="listbox"
          aria-label="Batch Price Source"
          onKeyDown={handleKeyDown}
          className="flex flex-col"
        >
          {/* Search */}
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border bg-muted/50">
            <Search className="h-3 w-3 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              className="flex-1 min-w-0 h-5 px-1.5 text-[11px] bg-transparent border-none outline-none placeholder:text-muted-foreground"
              aria-label="Search price sources"
            />
          </div>

          {/* Options or loader */}
          <div ref={listRef} className="overflow-y-auto max-h-40">
            {isApplying ? (
              <div className="flex items-center justify-center gap-2 px-3 py-4 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                Applying...
              </div>
            ) : flatOptions.length === 0 ? (
              <div className="px-3 py-4 text-[11px] text-muted-foreground text-center">
                No sources found
              </div>
            ) : (
              Object.entries(groupedOptions).map(([group, groupOptions]) => (
                <div key={group || 'default'}>
                  {group && (
                    <div className="px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/30">
                      {group}
                    </div>
                  )}
                  {groupOptions.map((option) => {
                    const flatIndex = flatOptions.findIndex((o) => o.value === option.value);
                    const isHighlighted = flatIndex === highlightedIndex;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        data-highlighted={isHighlighted}
                        aria-selected={isHighlighted}
                        onClick={() => handleSelect(option)}
                        onMouseEnter={() => setHighlightedIndex(flatIndex)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-[11px] text-left',
                          'hover:bg-accent hover:text-accent-foreground',
                          'focus:outline-none focus:bg-accent focus:text-accent-foreground',
                          isHighlighted && 'bg-accent text-accent-foreground'
                        )}
                      >
                        <span className="shrink-0 [&>svg]:text-current">
                          {getOptionIcon(option)}
                        </span>
                        <span className="truncate flex-1 min-w-0">{option.label}</span>
                        {isHighlighted && (
                          <Check className="h-3 w-3 shrink-0 ml-auto" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
