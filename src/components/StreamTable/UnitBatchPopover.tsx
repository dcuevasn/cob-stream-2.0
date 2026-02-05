import { useState, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { useStreamStore } from '../../hooks/useStreamStore';
import { BatchAffordanceMarker } from './BatchAffordanceMarker';
import { isUdiSecurity } from '../../lib/utils';

/** Subscribe to stable store values to avoid infinite re-renders (getFilteredStreamSets returns new array each call). */
export function UnitBatchPopover() {
  const [open, setOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const batchUpdatePriceMode = useStreamStore((s) => s.batchUpdatePriceMode);
  const getFilteredStreamSets = useStreamStore((s) => s.getFilteredStreamSets);
  const streamSets = useStreamStore((s) => s.streamSets);
  const activeTab = useStreamStore((s) => s.activeTab);
  const searchQuery = useStreamStore((s) => s.searchQuery);
  const preferences = useStreamStore((s) => s.preferences);

  const streams = useMemo(() => getFilteredStreamSets(), [getFilteredStreamSets, streamSets, activeTab, searchQuery, preferences]);

  const notionalLabel = useMemo(() => {
    if (streams.length === 0) return 'Notional';
    const allUdi = streams.every((s) => isUdiSecurity(s.securityType));
    return allUdi ? 'Trade Amt' : 'Notional';
  }, [streams]);

  const handleSelect = useCallback(
    (priceMode: 'quantity' | 'notional') => {
      if (isApplying) return;
      setIsApplying(true);
      batchUpdatePriceMode(priceMode);
      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsApplying(false);
          setOpen(false);
        }, 150);
      });
    },
    [batchUpdatePriceMode, isApplying]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'relative flex items-center justify-center gap-1.5 w-full text-left outline-none group',
                'hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset rounded px-0.5 -mx-0.5'
              )}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label="Unit - View batch actions"
            >
              UNIT
              <BatchAffordanceMarker />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>View batch actions</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="center"
        sideOffset={4}
        collisionPadding={8}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className={cn(
          'min-w-0 p-2 overflow-hidden',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
        )}
      >
        <div
          role="group"
          aria-label="Batch Unit"
          className="flex flex-col gap-2"
        >
          {isApplying ? (
            <div className="flex items-center justify-center gap-2 px-4 py-3 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin shrink-0" />
              Applying...
            </div>
          ) : (
            <div
              role="tablist"
              aria-label="Volume unit"
              className="segmented-control h-6"
            >
              <button
                type="button"
                role="tab"
                aria-selected={false}
                data-active={false}
                onClick={() => handleSelect('quantity')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect('notional');
                  }
                }}
                disabled={isApplying}
                className={cn(
                  'segmented-control-segment min-w-0 flex-1',
                  'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                  'disabled:opacity-50 disabled:pointer-events-none'
                )}
              >
                QTY
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={false}
                data-active={false}
                title={notionalLabel === 'Trade Amt' ? 'Trade Amount (UDI)' : 'Notional'}
                onClick={() => handleSelect('notional')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect('quantity');
                  }
                }}
                disabled={isApplying}
                className={cn(
                  'segmented-control-segment min-w-0 flex-1',
                  'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                  'disabled:opacity-50 disabled:pointer-events-none'
                )}
              >
                {notionalLabel}
              </button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
