import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, Hand, Signal } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CompactSelectOption {
  value: string;
  label: string;
  group?: string;
  bid?: number;
  ask?: number;
}

interface CompactSelectProps {
  value: string;
  options: CompactSelectOption[];
  onChange: (value: string, option: CompactSelectOption) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CompactSelect({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className,
  disabled = false,
}: CompactSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  
  // When value exists but isn't in options (e.g., batch-assigned QF not in this stream's feeds),
  // create a display-only option to show the current value instead of placeholder
  const displayOption = selectedOption ?? (value && value !== '' ? {
    value,
    label: value, // Show the raw value (e.g., "QF-6") as the label
    group: 'Quote Feeds',
  } : null);

  // Icon per option: Manual = hand/edit, Quote feed = signal
  const getOptionIcon = (option: CompactSelectOption | null) =>
    !option || option.value === 'manual' || !option.group ? (
      <Hand className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
    ) : (
      <Signal className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
    );

  // Filter options based on search
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  // Group options
  const groupedOptions = filteredOptions.reduce((acc, option) => {
    const group = option.group || '';
    if (!acc[group]) acc[group] = [];
    acc[group].push(option);
    return acc;
  }, {} as Record<string, CompactSelectOption[]>);

  // Flatten for keyboard navigation
  const flatOptions = Object.values(groupedOptions).flat();

  // Close on outside click (trigger or dropdown)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Position dropdown and focus input when opened
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 128),
      });
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setDropdownRect(null);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlighted = listRef.current.querySelector('[data-highlighted="true"]');
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

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
            onChange(flatOptions[highlightedIndex].value, flatOptions[highlightedIndex]);
            setIsOpen(false);
            setSearch('');
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearch('');
          break;
      }
    },
    [isOpen, flatOptions, highlightedIndex, onChange]
  );

  const handleSelect = (option: CompactSelectOption) => {
    onChange(option.value, option);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      {/* Trigger - Cursor UI: [icon] label + chevron, compact */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 w-full min-w-0 h-5 px-2 text-[10px] rounded border border-border',
          'bg-background text-foreground shadow-sm',
          'hover:bg-muted/80 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background',
          isOpen && 'ring-1 ring-ring'
        )}
      >
        {displayOption ? getOptionIcon(displayOption) : (
          <Hand className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
        )}
        <span className="truncate text-left flex-1 min-w-0">
          {displayOption?.label || placeholder}
        </span>
        <ChevronDown className={cn('h-2.5 w-2.5 shrink-0 opacity-60 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown - portal to body to avoid clipping inside scrollable table */}
      {isOpen && dropdownRect && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] rounded overflow-hidden border border-border shadow-md"
          style={{
            background: 'var(--popover)',
            color: 'var(--popover-foreground)',
            top: dropdownRect.top,
            left: dropdownRect.left,
            width: dropdownRect.width,
            maxHeight: 192,
            boxShadow: '0 4px 6px -1px color-mix(in srgb, var(--border) 30%, transparent), 0 2px 4px -2px color-mix(in srgb, var(--border) 20%, transparent)',
          }}
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border bg-muted">
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
            />
          </div>

          {/* Options list - Manual first, then Quote Feeds group */}
          <div ref={listRef} className="overflow-y-auto max-h-40">
            {flatOptions.length === 0 ? (
              <div className="px-3 py-4 text-[11px] text-muted-foreground text-center leading-relaxed">
                No sources found
              </div>
            ) : (
              Object.entries(groupedOptions).map(([group, groupOptions]) => (
                <div key={group || 'default'}>
                  {group && (
                    <div className="px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted">
                      {group}
                    </div>
                  )}
                  {groupOptions.map((option) => {
                    const flatIndex = flatOptions.findIndex((o) => o.value === option.value);
                    const isHighlighted = flatIndex === highlightedIndex;
                    const isSelected = option.value === value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        data-highlighted={isHighlighted}
                        onClick={() => handleSelect(option)}
                        onMouseEnter={() => setHighlightedIndex(flatIndex)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-[11px] text-left leading-relaxed cursor-pointer',
                          'transition-colors duration-150 ease-out',
                          'hover:bg-accent hover:text-accent-foreground',
                          'active:bg-accent active:text-accent-foreground',
                          isHighlighted && 'bg-accent text-accent-foreground',
                          isSelected && 'bg-accent text-accent-foreground font-medium'
                        )}
                      >
                        <span className="shrink-0 [&>svg]:text-current">
                          {getOptionIcon(option)}
                        </span>
                        <span className="truncate flex-1 min-w-0">{option.label}</span>
                        {isSelected && (
                          <Check className="h-3 w-3 shrink-0 ml-auto" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
