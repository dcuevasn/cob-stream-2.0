import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useStreamStore } from '../../hooks/useStreamStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';

const SEARCH_DEBOUNCE_MS = 80;

export function SearchBar() {
  const { searchQuery, setSearchQuery, isLoading, getFilteredStreamSets } = useStreamStore();
  const [inputValue, setInputValue] = useState(searchQuery);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCount = getFilteredStreamSets().length;
  const hasSearch = searchQuery.trim().length > 0;
  const noResults = hasSearch && filteredCount === 0;

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
    setIsFocused(true);
    if (inputValue) {
      (e.target as HTMLInputElement).select();
    }
  }, [inputValue]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <div className="flex items-center gap-[6px]">
      <div
        className={cn('relative shrink-0', isLoading && 'pointer-events-none opacity-50')}
        style={{ width: '220px' }}
      >
        {/* Search icon */}
        <Search
          className="absolute left-[8px] top-1/2 -translate-y-1/2 pointer-events-none z-10"
          style={{ width: '11px', height: '11px', color: noResults ? '#f87171' : '#a1a1a1' }}
          aria-hidden="true"
        />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search streams..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={isLoading}
          aria-label="Search streams"
          aria-describedby={hasSearch ? 'search-results-hint' : undefined}
          style={{
            height: '28px',
            width: '100%',
            backgroundColor: '#262626',
            borderWidth: '1.5px',
            borderStyle: 'solid',
            borderColor: noResults
              ? 'rgba(248,113,113,0.5)'
              : isFocused
              ? 'rgba(99,102,241,0.6)'
              : 'rgba(255,255,255,0.1)',
            borderRadius: '0.3rem',
            paddingLeft: '26px',
            paddingRight: inputValue ? '26px' : '8px',
            fontSize: '11px',
            fontWeight: 500,
            color: '#fafafa',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          className="tabular-nums placeholder:text-[#555]"
        />

        {/* Clear button */}
        {inputValue && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.2rem',
                  color: '#a1a1a1',
                  transition: 'color 0.1s',
                }}
                className="hover:text-[#fafafa] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 z-10"
              >
                <X style={{ width: '10px', height: '10px' }} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Clear search (Esc)</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Results count */}
      {hasSearch && (
        <span
          id="search-results-hint"
          className="shrink-0 tabular-nums transition-opacity"
          style={{
            fontSize: '10px',
            fontWeight: 500,
            color: noResults ? '#f87171' : '#a1a1a1',
            whiteSpace: 'nowrap',
          }}
          aria-live="polite"
        >
          {noResults ? 'No matches' : `${filteredCount} result${filteredCount !== 1 ? 's' : ''}`}
        </span>
      )}
    </div>
  );
}
