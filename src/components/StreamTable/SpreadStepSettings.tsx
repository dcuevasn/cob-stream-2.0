import { useState } from 'react';
import { Settings, Info } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useSpreadStepSize } from '../../hooks/useSpreadStepSize';
import { useDefaultSpreads } from '../../hooks/useDefaultSpreads';

/**
 * Nested popover for configuring spread control settings:
 * - Spread step size (bps increment for +/- buttons)
 * - Default spread values (used when Reset button is clicked)
 */
export function SpreadStepSettings() {
  const { stepSize, updateStepSize } = useSpreadStepSize();
  const { defaultSpreads, updateDefaultSpreads } = useDefaultSpreads();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [bidSpreadValues, setBidSpreadValues] = useState<string[]>([]);
  const [askSpreadValues, setAskSpreadValues] = useState<string[]>([]);

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      // Initialize inputs from current persisted values when opening
      setInputValue(formatStep(stepSize));
      setBidSpreadValues(defaultSpreads.bid.map((v) => formatSpread(v)));
      setAskSpreadValues(defaultSpreads.ask.map((v) => formatSpread(v)));
    }
    setOpen(nextOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty, decimal-only sequences, and valid positive decimals up to 3 places
    if (raw !== '' && raw !== '.' && !/^\d*\.?\d{0,3}$/.test(raw)) return;
    setInputValue(raw);
  };

  const handleBidSpreadChange = (index: number, value: string) => {
    const newValues = [...bidSpreadValues];
    newValues[index] = value;
    setBidSpreadValues(newValues);
  };

  const handleAskSpreadChange = (index: number, value: string) => {
    const newValues = [...askSpreadValues];
    newValues[index] = value;
    setAskSpreadValues(newValues);
  };

  const handleSave = () => {
    const parsed = parseFloat(inputValue);
    const stepValid = !isNaN(parsed) && parsed >= 0.001 && parsed <= 10;

    // Parse and validate spread values
    const bidSpreads = bidSpreadValues.map((v) => parseFloat(v));
    const askSpreads = askSpreadValues.map((v) => parseFloat(v));
    const bidSpreadsValid = bidSpreads.every((v) => !isNaN(v));
    const askSpreadsValid = askSpreads.every((v) => !isNaN(v));

    if (stepValid && bidSpreadsValid && askSpreadsValid) {
      updateStepSize(parsed);
      updateDefaultSpreads(bidSpreads, askSpreads);
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
  const stepValid = !isNaN(parsed) && parsed >= 0.001 && parsed <= 10;

  const bidSpreads = bidSpreadValues.map((v) => parseFloat(v));
  const askSpreads = askSpreadValues.map((v) => parseFloat(v));
  const bidSpreadsValid = bidSpreads.every((v) => !isNaN(v));
  const askSpreadsValid = askSpreads.every((v) => !isNaN(v));

  const isValid = stepValid && bidSpreadsValid && askSpreadsValid;

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
        className="w-[360px] p-5"
      >
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-medium text-foreground">Spread Control Settings</h3>

          {/* Section 1: Spread Step Size */}
          <div className="flex flex-col gap-3">
            {/* Label row: "Spread step size" + info icon */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground leading-5">
                Spread step size
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
                  !stepValid && inputValue !== '' && 'border-red-500/60'
                )}
                aria-label="Step size in bps"
              />
              <span className="text-[10px] text-muted-foreground shrink-0">
                bps
              </span>
            </div>
          </div>

          {/* Section 2: Default Spread Values */}
          <div className="flex flex-col gap-2">
            {/* Label row: "Default spread values" + info icon */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground leading-5">
                Default spread values
              </span>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-[3px] h-4 w-4 text-zinc-500 hover:text-zinc-300 transition-colors"
                    aria-label="Default spread values info"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4} className="max-w-[200px] text-xs">
                  Values used when <strong>Default spread</strong> button is clicked
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Single combined table for BID and ASK */}
            <div className="rounded border border-border/50 overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/50">
                    <th className="text-center py-1 px-2 text-muted-foreground font-medium w-8">L</th>
                    <th className="text-right py-1 px-2 text-green-400 font-medium">BID</th>
                    <th className="text-right py-1 px-2 text-red-400 font-medium">ASK</th>
                  </tr>
                </thead>
                <tbody>
                  {bidSpreadValues.map((bidValue, index) => (
                    <tr key={index} className="border-b border-border/30 last:border-b-0">
                      <td className="text-center py-1 px-2 text-muted-foreground">L{index + 1}</td>
                      <td className="py-0.5 px-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={bidValue}
                          onChange={(e) => {
                            const raw = e.target.value;
                            // Allow negative, decimals, and empty
                            if (raw !== '' && raw !== '-' && raw !== '.' && raw !== '-.' && !/^-?\d*\.?\d{0,3}$/.test(raw)) return;
                            handleBidSpreadChange(index, raw);
                          }}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={handleKeyDown}
                          className={cn(
                            'w-full h-6 px-1 text-[11px] tabular-nums text-right rounded border border-transparent bg-transparent',
                            'focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50',
                            'hover:bg-muted/30 transition-colors'
                          )}
                          aria-label={`BID L${index + 1} spread value`}
                        />
                      </td>
                      <td className="py-0.5 px-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={askSpreadValues[index]}
                          onChange={(e) => {
                            const raw = e.target.value;
                            // Allow negative, decimals, and empty
                            if (raw !== '' && raw !== '-' && raw !== '.' && raw !== '-.' && !/^-?\d*\.?\d{0,3}$/.test(raw)) return;
                            handleAskSpreadChange(index, raw);
                          }}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={handleKeyDown}
                          className={cn(
                            'w-full h-6 px-1 text-[11px] tabular-nums text-right rounded border border-transparent bg-transparent',
                            'focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50',
                            'hover:bg-muted/30 transition-colors'
                          )}
                          aria-label={`ASK L${index + 1} spread value`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action row: Cancel + Save */}
          <div className="flex items-center justify-end gap-2 pt-1">
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

/** Format spread value for display, trimming trailing zeros */
function formatSpread(n: number): string {
  const s = n.toFixed(3);
  return s.replace(/\.?0+$/, '') || '0';
}
