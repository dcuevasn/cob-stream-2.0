import { useState } from 'react';
import { Settings, Info, ChevronUp } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '../dsc/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Button } from '../dsc/button';
import { StepperInput } from '../dsc/stepper-input';
import { cn } from '../../lib/utils';
import { useSpreadStepSize } from '../../hooks/useSpreadStepSize';
import { useDefaultSpreads } from '../../hooks/useDefaultSpreads';

const ARROW_STEP = 0.05;
const MIN_STEP = 0.001;
const MAX_STEP = 10;

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
  const [defaultSpreadsExpanded, setDefaultSpreadsExpanded] = useState(true);

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      setInputValue(formatStep(stepSize));
      setBidSpreadValues(defaultSpreads.bid.map((v) => formatSpread(v)));
      setAskSpreadValues(defaultSpreads.ask.map((v) => formatSpread(v)));
      setDefaultSpreadsExpanded(false);
    }
    setOpen(nextOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw !== '' && raw !== '.' && !/^\d*\.?\d{0,3}$/.test(raw)) return;
    setInputValue(raw);
  };

  const handleStepperIncrement = () => {
    const current = parseFloat(inputValue) || 0;
    const next = Math.min(MAX_STEP, Math.round((current + ARROW_STEP) * 1000) / 1000);
    setInputValue(formatStep(next));
  };

  const handleStepperDecrement = () => {
    const current = parseFloat(inputValue) || 0;
    const next = Math.max(MIN_STEP, Math.round((current - ARROW_STEP) * 1000) / 1000);
    setInputValue(formatStep(next));
  };

  const handleStepperBlur = () => {
    const n = parseFloat(inputValue);
    if (!isNaN(n)) {
      const clamped = Math.min(MAX_STEP, Math.max(MIN_STEP, Math.round(n * 1000) / 1000));
      setInputValue(formatStep(clamped));
    }
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
    const stepValid = !isNaN(parsed) && parsed >= MIN_STEP && parsed <= MAX_STEP;
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

  const handleCancel = () => setOpen(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
    if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
  };

  const parsed = parseFloat(inputValue);
  const stepValid = !isNaN(parsed) && parsed >= MIN_STEP && parsed <= MAX_STEP;
  const bidSpreads = bidSpreadValues.map((v) => parseFloat(v));
  const askSpreads = askSpreadValues.map((v) => parseFloat(v));
  const bidSpreadsValid = bidSpreads.every((v) => !isNaN(v));
  const askSpreadsValid = askSpreads.every((v) => !isNaN(v));
  const isValid = stepValid && bidSpreadsValid && askSpreadsValid;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
              aria-label="Spread control settings"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          Spread control settings
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={6}
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => e.stopPropagation()}
        onInteractOutside={(e) => e.stopPropagation()}
        className="w-[182px]"
        style={{ padding: '8px' }}
      >
        <div className="flex flex-col gap-[6px]">

          {/* Title */}
          <p className="text-[10px] font-semibold text-[#fafafa] leading-[10px]">
            Spread control settings
          </p>

          <div className="flex flex-col gap-3">

            {/* Section 1: Spread step size */}
            <div className="flex flex-col gap-3">
              {/* Label + info tooltip */}
              <div className="flex items-center gap-1">
                <span className="text-[10.5px] font-medium text-[#a1a1a1] leading-[9px]">
                  Spread step size
                </span>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center size-3 text-[#a1a1a1] hover:text-[#fafafa] transition-colors"
                      aria-label="Step size info"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={4} className="max-w-[200px] text-xs">
                    This value controls the <strong>bps</strong> increment applied to
                    the spread on every <strong>+/−</strong> click.
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* BPS label + stepper input */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-medium text-[#a1a1a1] shrink-0">BPS</span>
                <StepperInput
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleStepperBlur}
                  onFocus={(e) => e.currentTarget.select()}
                  onKeyDown={handleKeyDown}
                  onIncrement={handleStepperIncrement}
                  onDecrement={handleStepperDecrement}
                  incrementLabel="Increase step size"
                  decrementLabel="Decrease step size"
                  className={cn(!stepValid && inputValue !== '' && 'border-red-500/60')}
                />
              </div>
            </div>

            {/* Section 2: Default spread values */}
            <div className="border border-[rgba(255,255,255,0.1)] rounded-[5.2px] overflow-hidden">
              {/* Collapsible header */}
              <button
                type="button"
                onClick={() => setDefaultSpreadsExpanded((v) => !v)}
                style={{ paddingLeft: '8px', paddingRight: '8px', paddingTop: '3px', paddingBottom: '3px' }}
                className="w-full flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-[10.5px] font-medium text-[#a1a1a1] leading-[9px]">
                  Default spread values
                </span>
                <ChevronUp
                  className={cn(
                    'size-4 text-[#a1a1a1] transition-transform duration-150',
                    !defaultSpreadsExpanded && 'rotate-180'
                  )}
                />
              </button>

              {/* Rows */}
              {defaultSpreadsExpanded && (
                <div className="flex flex-col gap-1 pr-2" style={{ paddingLeft: '8px', paddingTop: '8px', paddingBottom: '8px' }}>
                  {/* Info tooltip icon */}
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center size-3 text-[#a1a1a1] hover:text-[#fafafa] transition-colors self-start"
                        aria-label="Default spread values info"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="size-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={4} className="max-w-[200px] text-xs">
                      Values used when <strong>Default spread</strong> button is clicked
                    </TooltipContent>
                  </Tooltip>

                  {bidSpreadValues.map((bidValue, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <span className="text-[9px] font-medium text-[#a1a1a1] w-[12px] shrink-0">
                        L{index + 1}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={bidValue}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw !== '' && raw !== '-' && raw !== '.' && raw !== '-.' && !/^-?\d*\.?\d{0,3}$/.test(raw)) return;
                          handleBidSpreadChange(index, raw);
                        }}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={handleKeyDown}
                        style={{ paddingLeft: '8px', paddingRight: '8px' }}
                        className="w-[64px] h-[20px] text-[10px] text-[#55b467] focus:text-[#fafafa] bg-transparent border border-[rgba(255,255,255,0.1)] rounded-[4.8px] focus:outline-none focus:border-[#2b7fff] focus:ring-1 focus:ring-inset focus:ring-[#2b7fff]/40 tabular-nums shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow,color]"
                        aria-label={`BID L${index + 1} spread value`}
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={askSpreadValues[index]}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw !== '' && raw !== '-' && raw !== '.' && raw !== '-.' && !/^-?\d*\.?\d{0,3}$/.test(raw)) return;
                          handleAskSpreadChange(index, raw);
                        }}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={handleKeyDown}
                        style={{ paddingLeft: '8px', paddingRight: '8px' }}
                        className="w-[64px] h-[20px] text-[10px] text-[#d97573] focus:text-[#fafafa] bg-transparent border border-[rgba(255,255,255,0.1)] rounded-[4.8px] focus:outline-none focus:border-[#2b7fff] focus:ring-1 focus:ring-inset focus:ring-[#2b7fff]/40 tabular-nums shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow,color]"
                        aria-label={`ASK L${index + 1} spread value`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[rgba(255,255,255,0.1)] shrink-0" />

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="secondary"
              size="xs"
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
              style={{ paddingLeft: '8px', paddingRight: '8px' }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="xs"
              disabled={!isValid}
              onClick={(e) => { e.stopPropagation(); handleSave(); }}
              style={{ paddingLeft: '8px', paddingRight: '8px' }}
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
