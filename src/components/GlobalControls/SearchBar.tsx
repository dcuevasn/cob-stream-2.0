import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useStreamStore } from '../../hooks/useStreamStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';

const SEARCH_DEBOUNCE_MS = 80;

export function SearchBar() {
  const { searchQuery, setSearchQuery, isLoading, getFilteredStreamSets } = useStreamStore();
  const [inputValue, setInputValue] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCount = getFilteredStreamSets().length;
  const hasSearch = searchQuery.trim().length > 0;

  // Sync local state when store resets (e.g. tab change)
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // Debounced update to store
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setSearchQuery(inputValue);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, setSearchQuery]);

  // Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = useCallback(() => {
    setInputValue('');
    setSearchQuery('');
    inputRef.current?.focus();
  }, [setSearchQuery]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClear();
        (e.target as HTMLInputElement).blur();
      }
    },
    [handleClear]
  );

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (inputValue) {
      (e.target as HTMLInputElement).select();
    }
  }, [inputValue]);

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'relative flex w-64 min-w-0 items-center rounded-md border border-input bg-background shadow-sm transition-colors',
          'hover:border-muted-foreground/40 hover:bg-muted/30',
          'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
          hasSearch && filteredCount === 0 && 'border-destructive/50 focus-within:border-destructive/70',
          isLoading && 'pointer-events-none opacity-50'
        )}
      >
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by name, alias, or ID…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          disabled={isLoading}
          className={cn(
            'flex h-8 w-full flex-1 rounded-md bg-transparent pl-9 pr-9 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium'
          )}
          aria-label="Search streams"
          aria-describedby={hasSearch ? 'search-results-hint' : undefined}
        />
        {inputValue && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                className={cn(
                  'absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm',
                  'text-muted-foreground hover:bg-muted hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  'transition-colors'
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Clear search (Esc)</TooltipContent>
          </Tooltip>
        )}
      </div>
      {hasSearch && (
        <span
          id="search-results-hint"
          className={cn(
            'shrink-0 text-xs tabular-nums transition-opacity',
            filteredCount === 0
              ? 'text-destructive/90'
              : 'text-muted-foreground'
          )}
          aria-live="polite"
        >
          {filteredCount === 0 ? 'No matches' : `${filteredCount} result${filteredCount !== 1 ? 's' : ''}`}
        </span>
      )}
    </div>
  );
}
