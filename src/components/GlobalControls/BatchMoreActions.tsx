import { useState, useRef, useCallback } from 'react';
import { MoreHorizontal, ChevronDown, Activity, Package, Ruler } from 'lucide-react';
import { Button as DSCButton } from '../dsc/button';
import { Popover, PopoverTrigger, PopoverContent } from '../dsc/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { BatchPriceSourcePopover } from './BatchPriceSourcePopover';
import { BatchSizePopover } from './BatchSizePopover';
import { BatchUnitPopover } from './BatchUnitPopover';

type ActiveAction = 'priceSource' | 'size' | 'unit' | null;

interface MenuItem {
  key: Exclude<ActiveAction, null>;
  label: string;
  Icon: typeof Activity;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'priceSource', label: 'Price Source', Icon: Activity },
  { key: 'size', label: 'Size', Icon: Package },
  { key: 'unit', label: 'Unit', Icon: Ruler },
];

/**
 * Aggregates low-usage batch actions (Price Source, Size, Unit) behind a single
 * "More" trigger. The menu itself is a DSC Popover (not Radix DropdownMenu) so
 * the menu → form transition uses the same primitive pipeline and avoids the
 * modal/focus-trap conflicts that block nested popovers.
 */
export function BatchMoreActions() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState<ActiveAction>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectAction = useCallback((next: Exclude<ActiveAction, null>) => {
    setMenuOpen(false);
    // Defer by one tick so the menu finishes unmounting before the batch
    // popover mounts at the same anchor — prevents visual jump and any
    // lingering outside-click from the same pointer event.
    setTimeout(() => setActive(next), 0);
  }, []);

  const handleClose = useCallback(
    (which: Exclude<ActiveAction, null>) => (open: boolean) => {
      if (!open) setActive((curr) => (curr === which ? null : curr));
    },
    []
  );

  /** Back-to-menu: close the current batch popover and reopen the More menu. */
  const handleBack = useCallback(() => {
    setActive(null);
    setTimeout(() => setMenuOpen(true), 0);
  }, []);

  return (
    <>
      <div ref={wrapperRef} className="inline-flex shrink-0">
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <DSCButton
                  variant="outline"
                  size="sm"
                  className="gap-1 shrink-0"
                  style={{ paddingLeft: '12px', paddingRight: '12px' }}
                  aria-label="More batch actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  More
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </DSCButton>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>More batch actions</TooltipContent>
          </Tooltip>

          <PopoverContent
            align="end"
            sideOffset={6}
            collisionPadding={8}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            style={{ padding: '4px' }}
            className="min-w-[180px]"
          >
            <div role="menu" aria-label="More batch actions" className="flex flex-col gap-[1px]">
              {MENU_ITEMS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="menuitem"
                  onClick={() => selectAction(key)}
                  className="flex items-center gap-[8px] px-[10px] py-[6px] text-[11px] text-left rounded-[0.25rem] text-[#d4d4d4] hover:bg-white/[0.07] hover:text-[#fafafa] transition-colors outline-none focus-visible:bg-white/[0.07]"
                >
                  <Icon className="h-3.5 w-3.5 text-[#a1a1a1] shrink-0" aria-hidden />
                  <span className="flex-1 min-w-0">{label}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Controlled batch popovers anchored to the wrapper (same position as the More button) */}
      <BatchPriceSourcePopover
        open={active === 'priceSource'}
        onOpenChange={handleClose('priceSource')}
        anchorRef={wrapperRef}
        onBack={handleBack}
      />
      <BatchSizePopover
        open={active === 'size'}
        onOpenChange={handleClose('size')}
        anchorRef={wrapperRef}
        onBack={handleBack}
      />
      <BatchUnitPopover
        open={active === 'unit'}
        onOpenChange={handleClose('unit')}
        anchorRef={wrapperRef}
        onBack={handleBack}
      />
    </>
  );
}
