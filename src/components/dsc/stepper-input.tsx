/**
 * StepperInput — Design System Companion (dark-mode), xs variant.
 *
 * CSS variable → exact dark-mode hex (oklch conversion):
 *   bg-secondary            oklch(0.269 0 0)           → #262626
 *   border-border           oklch(1 0 0 / 10%)         → white/10
 *   text-secondary-foreground oklch(0.985 0 0)         → #fafafa
 *   text-muted-foreground   oklch(0.708 0 0)           → #a1a1a1
 *   hover:bg-accent         oklch(0.269 0 0)           → #262626 (same as bg — only text changes)
 *   hover:text-accent-foreground oklch(0.985 0 0)      → #fafafa
 *   focus:ring-ring         oklch(0.623 0.214 259.815) → ~blue-500
 *
 * Controlled variant: accepts external handlers for the spread adjuster's
 * delta-based BPS logic (DSC's internal commit logic is not compatible).
 */
import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StepperInputProps {
  /** Controlled display string (allows partial inputs like "-", "0.") */
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onIncrement: () => void;
  onDecrement: () => void;
  incrementLabel?: string;
  decrementLabel?: string;
  disabled?: boolean;
  className?: string;
  /** Override the inner input's width class (default: w-[54px]) */
  inputClassName?: string;
}

const StepperInput = React.forwardRef<HTMLDivElement, StepperInputProps>(
  (
    {
      value,
      onChange,
      onBlur,
      onKeyDown,
      onFocus,
      onIncrement,
      onDecrement,
      incrementLabel = 'Increment',
      decrementLabel = 'Decrement',
      disabled,
      className,
      inputClassName,
    },
    ref
  ) => {
    // xs: "inline-flex items-center rounded-[var(--radius)] bg-secondary border border-border h-6"
    // --radius = 0.3rem, bg-secondary = #262626, border-border = white/10
    return (
      <div
        ref={ref}
        // Inline borderColor guarantees white/10 regardless of stream-scanner's
        // global "* { border-color: var(--border) }" (which can't override inline styles).
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
        className={cn(
          'inline-flex items-center rounded-[0.3rem] bg-[#262626] border-[1.5px] h-6',
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
      >
        {/* DSC xs input: bg-transparent tabular-nums font-medium text-center
         *               text-secondary-foreground outline-none focus:ring-1
         *               focus:ring-inset focus:ring-ring rounded-l-[var(--radius)]
         *               disabled:cursor-not-allowed h-6 w-10 px-1 text-[10px] */}
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          disabled={disabled}
          className={cn('bg-transparent tabular-nums font-medium text-center text-[#fafafa] outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 rounded-l-[0.3rem] disabled:cursor-not-allowed h-6 w-[54px] px-1 text-[10px]', inputClassName)}
          aria-label="Value"
        />

        {/* DSC xs btn column: flex flex-col border-l border-border rounded-r overflow-hidden h-6 w-5 */}
        <div
          style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
          className="flex flex-col border-l-[1.5px] rounded-r-[0.3rem] overflow-hidden h-6 w-5"
        >
          {/* DSC xs + btn: h-3 w-5 + border-b border-border */}
          <button
            type="button"
            onClick={onIncrement}
            disabled={disabled}
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
            className="flex items-center justify-center text-[#a1a1a1] transition-colors hover:bg-[#262626] hover:text-[#fafafa] disabled:pointer-events-none disabled:opacity-40 h-3 w-5 border-b-[1.5px]"
            aria-label={incrementLabel}
          >
            <Plus className="h-2 w-2" />
          </button>
          {/* DSC xs - btn: h-3 w-5 */}
          <button
            type="button"
            onClick={onDecrement}
            disabled={disabled}
            className="flex items-center justify-center text-[#a1a1a1] transition-colors hover:bg-[#262626] hover:text-[#fafafa] disabled:pointer-events-none disabled:opacity-40 h-3 w-5"
            aria-label={decrementLabel}
          >
            <Minus className="h-2 w-2" />
          </button>
        </div>
      </div>
    );
  }
);
StepperInput.displayName = 'DSCStepperInput';

export { StepperInput };
