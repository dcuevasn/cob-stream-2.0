import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useStreamStore } from '../../hooks/useStreamStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Input } from '../ui/input';
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
          'relative w-[300px] min-w-0',
          isLoading && 'pointer-events-none opacity-50'
        )}
      >
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search streams..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          disabled={isLoading}
          className={cn(
            'pl-9 pr-9',
            hasSearch && filteredCount === 0 && 'border-destructive/50 focus-visible:border-destructive/70 focus-visible:ring-destructive/30'
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
                  'absolute right-3 top-1/2 -translate-y-1/2 z-10',
                  'flex items-center justify-center h-5 w-5 rounded-sm',
                  'text-muted-foreground hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  'transition-colors'
                )}
              >
                <X className="h-4 w-4" />
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
