import { useState, useRef, useEffect, useCallback } from 'react';
import { Activity, ArrowLeftRight, Check, ChevronDown, Pencil, Search } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { StreamQuoteFeed } from '../../types/streamSet';
import { cn } from '../../lib/utils';

interface PriceSourceOption {
  value: string;
  label: string;
  group: 'manual' | 'feeds';
}

export interface MixedSourceState {
  bidLabel: string;
  askLabel: string;
}

interface PriceSourceComboboxProps {
  value: string | undefined;
  quoteFeeds: StreamQuoteFeed[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  mixedState?: MixedSourceState;
}

function getIcon(group: 'manual' | 'feeds') {
  return group === 'manual'
    ? <Pencil className="size-3 shrink-0 text-muted-foreground" aria-hidden />
    : <Activity className="size-3 shrink-0 text-muted-foreground" aria-hidden />;
}

export function PriceSourceCombobox({
  value,
  quoteFeeds,
  onValueChange,
  placeholder = 'Select...',
  disabled = false,
  className,
  mixedState,
}: PriceSourceComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build options list
  const allOptions: PriceSourceOption[] = [
    { value: 'manual', label: 'Manual', group: 'manual' },
    ...(quoteFeeds ?? []).map((f) => ({
      value: f.feedId,
      label: f.feedName,
      group: 'feeds' as const,
    })),
  ];

  // Filter
  const filtered = search
    ? allOptions.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : allOptions;

  const manualGroup = filtered.filter((o) => o.group === 'manual');
  const feedsGroup = filtered.filter((o) => o.group === 'feeds');

  // Selected option for trigger display
  const selected = allOptions.find((o) => o.value === value);

  // Reset state on open/close
  useEffect(() => {
    if (open) {
      setSearch('');
      setHighlightedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Scroll highlighted into view
  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.querySelector('[data-highlighted="true"]');
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  const select = useCallback((option: PriceSourceOption) => {
    onValueChange(option.value);
    setOpen(false);
  }, [onValueChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightedIndex]) select(filtered[highlightedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  }, [filtered, highlightedIndex, select]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'border-border bg-background hover:bg-muted/80 focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-1',
            'flex h-5 w-24 items-center gap-2 rounded border px-4 text-[10px] transition-colors',
            'whitespace-nowrap outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            open && 'ring-1 ring-ring',
            className
          )}
        >
          {selected ? (
            <>
              {getIcon(selected.group)}
              <span className="truncate flex-1 text-left">{selected.label}</span>
            </>
          ) : mixedState ? (
            <>
              <ArrowLeftRight className="size-3 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate flex-1 text-left">
                <span className="text-live-bid">{mixedState.bidLabel}</span>
                <span className="text-muted-foreground mx-px">/</span>
                <span className="text-live-ask">{mixedState.askLabel}</span>
              </span>
            </>
          ) : (
            <span className="truncate flex-1 text-left text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className={cn(
            'size-2.5 shrink-0 text-muted-foreground opacity-60 transition-transform',
            open && 'rotate-180'
          )} />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            'z-[100] rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10',
            'w-[var(--radix-popover-trigger-width)] min-w-[160px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          )}
        >
          {/* Search */}
          <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
            <Search className="size-3 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setHighlightedIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              className="h-5 flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Options */}
          <div ref={listRef} className="max-h-48 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-center text-[11px] text-muted-foreground">
                No sources found
              </div>
            ) : (
              <>
                {manualGroup.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Manual Entry
                    </div>
                    {manualGroup.map((option) => {
                      const flatIdx = filtered.indexOf(option);
                      return (
                        <OptionItem
                          key={option.value}
                          option={option}
                          isSelected={option.value === value}
                          isHighlighted={flatIdx === highlightedIndex}
                          onSelect={() => select(option)}
                          onMouseEnter={() => setHighlightedIndex(flatIdx)}
                        />
                      );
                    })}
                  </div>
                )}
                {manualGroup.length > 0 && feedsGroup.length > 0 && (
                  <div className="-mx-1.5 my-1 h-px bg-border/50" />
                )}
                {feedsGroup.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Quote Feeds
                    </div>
                    {feedsGroup.map((option) => {
                      const flatIdx = filtered.indexOf(option);
                      return (
                        <OptionItem
                          key={option.value}
                          option={option}
                          isSelected={option.value === value}
                          isHighlighted={flatIdx === highlightedIndex}
                          onSelect={() => select(option)}
                          onMouseEnter={() => setHighlightedIndex(flatIdx)}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function OptionItem({
  option,
  isSelected,
  isHighlighted,
  onSelect,
  onMouseEnter,
}: {
  option: PriceSourceOption;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <button
      type="button"
      data-highlighted={isHighlighted}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={cn(
        'flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-[11px] text-left min-h-5',
        'cursor-default select-none transition-colors',
        isHighlighted && 'bg-muted text-foreground',
        isSelected && !isHighlighted && 'text-foreground',
      )}
    >
      {getIcon(option.group)}
      <span className="truncate flex-1">{option.label}</span>
      {isSelected && <Check className="size-3 shrink-0" />}
    </button>
  );
}
