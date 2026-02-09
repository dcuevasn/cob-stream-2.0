import { useState } from 'react';
import { Settings, Info } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useSpreadStepSize } from '../../hooks/useSpreadStepSize';

/**
 * Nested popover for configuring the spread step size (bps increment).
 * Rendered inside the spread adjuster button row as a gear icon button.
 * Matches the Figma design at node 10665:43303.
 */
export function SpreadStepSettings() {
  const { stepSize, updateStepSize } = useSpreadStepSize();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      // Initialise input from current persisted value when opening
      setInputValue(formatStep(stepSize));
    }
    setOpen(nextOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty, decimal-only sequences, and valid positive decimals up to 3 places
    if (raw !== '' && raw !== '.' && !/^\d*\.?\d{0,3}$/.test(raw)) return;
    setInputValue(raw);
  };

  const handleSave = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed >= 0.001 && parsed <= 10) {
      updateStepSize(parsed);
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const parsed = parseFloat(inputValue);
  const isValid = !isNaN(parsed) && parsed >= 0.001 && parsed <= 10;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          onClick={(e) => e.stopPropagation()}
          className="!h-[22px] !min-h-[22px] !w-[22px] !min-w-[22px] !p-0 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-600 shrink-0"
          aria-label="Spread step size settings"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={6}
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => {
          // Prevent closing the parent DropdownMenu when clicking inside
          e.stopPropagation();
        }}
        onInteractOutside={(e) => {
          e.stopPropagation();
        }}
        className="w-[240px] p-5"
      >
        <div className="flex flex-col gap-3">
          {/* Label row: "Spread steps" + info icon */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground leading-5">
              Spread steps
            </span>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-[3px] h-4 w-4 text-zinc-500 hover:text-zinc-300 transition-colors"
                  aria-label="Step size info"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4} className="max-w-[200px] text-xs">
                This value controls the <strong>bps</strong> increment applied to
                the spread on every <strong>+/−</strong> click.
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Input + bps label */}
          <div className="flex items-end justify-center gap-1.5">
            <input
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={(e) => e.target.select()}
              onKeyDown={handleKeyDown}
              className={cn(
                'w-[72px] h-6 px-1.5 py-1 text-[11px] tabular-nums text-center rounded border border-border bg-background',
                'focus:outline-none focus:ring-1 focus:ring-ring',
                !isValid && inputValue !== '' && 'border-red-500/60'
              )}
              aria-label="Step size in bps"
            />
            <span className="text-[10px] text-muted-foreground shrink-0">
              bps
            </span>
          </div>

          {/* Action row: Cancel + Save */}
          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              className="!h-[22px] !min-h-[22px] !px-2 !py-1 rounded-md text-[11px] font-medium bg-zinc-600 text-zinc-200 hover:bg-zinc-500 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 border-0 shrink-0"
            >
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              disabled={!isValid}
              className="!h-[22px] !min-h-[22px] !px-2 !py-1 rounded-md text-[11px] font-medium bg-zinc-600 text-zinc-200 hover:bg-zinc-500 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 border-0 shrink-0 disabled:opacity-40"
            >
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Format step size for display, trimming trailing zeros */
function formatStep(n: number): string {
  const s = n.toFixed(3);
  return s.replace(/\.?0+$/, '') || '0';
}
