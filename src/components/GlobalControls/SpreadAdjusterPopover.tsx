import { Plus, Minus, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';

interface SpreadAdjusterPopoverProps {
  onAdjustBid: (delta: number) => void;
  onAdjustAsk: (delta: number) => void;
}

/** Cursor-style popover: solid dark charcoal background, rounded, subtle elevation */
const POPOVER_CONTENT_CLASS = cn(
  'min-w-[160px] p-1.5 text-popover-foreground',
  'popover-surface',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
  'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
  'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'
);

export function SpreadAdjusterPopover({ onAdjustBid, onAdjustAsk }: SpreadAdjusterPopoverProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 shrink-0 px-3"
              aria-label="Adjust bid and ask spreads"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Spread
              <ChevronDown className="h-3 w-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Adjust bid and ask spreads</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        collisionPadding={8}
        className={POPOVER_CONTENT_CLASS}
      >
        <DropdownMenuLabel className="px-2.5 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Bid spread
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onAdjustBid(-0.5)}>
          <Minus className="h-4 w-4" />
          −0.5 bps
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAdjustBid(0.5)}>
          <Plus className="h-4 w-4" />
          +0.5 bps
        </DropdownMenuItem>
        <DropdownMenuLabel className="px-2.5 py-1 mt-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Ask spread
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onAdjustAsk(-0.5)}>
          <Minus className="h-4 w-4" />
          −0.5 bps
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAdjustAsk(0.5)}>
          <Plus className="h-4 w-4" />
          +0.5 bps
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
