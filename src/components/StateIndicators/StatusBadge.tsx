import { Circle, AlertTriangle, Settings, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { StreamState } from '../../types/streamSet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../ui/tooltip';

interface StatusBadgeProps {
  state: StreamState;
  haltDetails?: string;
  className?: string;
  showLabel?: boolean;
  /** Show loading spinner instead of status icon (during launch/pause operations) */
  isLoading?: boolean;
}

const stateConfig: Record<StreamState, {
  icon: typeof Circle;
  color: string;
  bgColor: string;
  label: string;
  /** Use circle (like Active) instead of icon - for stopped/inactive states */
  useCircle?: boolean;
}> = {
  unconfigured: {
    icon: Settings,
    color: 'text-[var(--status-unconfigured)]',
    bgColor: 'bg-[var(--status-unconfigured)]',
    label: 'Not Configured',
  },
  staging: {
    icon: Circle,
    color: 'text-[var(--status-staging)]',
    bgColor: 'bg-[var(--status-staging)]',
    label: 'Staging',
    useCircle: true,
  },
  active: {
    icon: Circle,
    color: 'text-[var(--status-active)]',
    bgColor: 'bg-[var(--status-active)]',
    label: 'Active',
  },
  paused: {
    icon: Circle,
    color: 'text-[var(--status-paused)]',
    bgColor: 'bg-[var(--status-paused)]',
    label: 'Stopped',
    useCircle: true,
  },
  halted: {
    icon: AlertTriangle,
    color: 'text-[var(--status-halted)]',
    bgColor: 'bg-[var(--status-halted)]',
    label: 'Halted',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-[var(--status-cancelled)]',
    bgColor: 'bg-[var(--status-cancelled)]',
    label: 'Cancelled',
  },
};

// ── SidedStatusBadge ─────────────────────────────────────────────────────────
// Two-dot variant: one dot for BID side, one for ASK side.
// Falls back to icon rendering for halted / cancelled / unconfigured states.

interface SidedStatusBadgeProps {
  state: StreamState;
  haltReason?: string;
  haltDetails?: string;
  bidActiveCount: number;
  askActiveCount: number;
  isLoading?: boolean;
  className?: string;
}

export function SidedStatusBadge({
  state,
  haltReason,
  haltDetails,
  bidActiveCount,
  askActiveCount,
  isLoading = false,
  className,
}: SidedStatusBadgeProps) {
  if (isLoading) {
    return (
      <div className={cn('flex items-center', className)}>
        <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
      </div>
    );
  }

  const isAlertHalt = state === 'halted' && (haltReason === 'ffch' || haltReason === 'yield_crossing');
  const showIconState =
    (state === 'halted' && !isAlertHalt) || state === 'cancelled' || state === 'unconfigured';

  if (showIconState) {
    const config = stateConfig[state];
    const Icon = config.icon;
    const badge = (
      <div className={cn('flex items-center', className)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>
    );
    if (state === 'halted' && haltDetails) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent className="max-w-xs bg-[var(--status-halted)] text-black">
            <p className="font-medium">Stream Halted</p>
            <p className="text-xs mt-1">{haltDetails}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return badge;
  }

  // Running states (staging / active / paused / alert-halt): show two side dots
  const bidActive = bidActiveCount > 0;
  const askActive = askActiveCount > 0;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* BID dot — green when active */}
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          bidActive
            ? 'bg-[var(--status-bid-active)] pulse-active'
            : 'bg-[var(--status-paused)] opacity-40'
        )}
      />
      {/* ASK dot — red when active */}
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          askActive
            ? 'bg-[var(--status-ask-active)] pulse-active'
            : 'bg-[var(--status-paused)] opacity-40'
        )}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function StatusBadge({ state, haltDetails, className, showLabel = false, isLoading = false }: StatusBadgeProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  const badge = (
    <div className={cn('flex items-center gap-1.5', className)}>
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
      ) : state === 'active' ? (
        <span className={cn('w-2 h-2 rounded-full pulse-active', config.bgColor)} />
      ) : config.useCircle ? (
        <span className={cn('w-2 h-2 rounded-full', config.bgColor)} />
      ) : (
        <Icon className={cn('h-4 w-4', config.color)} />
      )}
      {showLabel && (
        <span className={cn('text-xs', config.color)}>
          {isLoading ? 'Processing...' : config.label}
        </span>
      )}
    </div>
  );

  if (state === 'halted' && haltDetails) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs bg-[var(--status-halted)] text-black">
          <p className="font-medium">Stream Halted</p>
          <p className="text-xs mt-1">{haltDetails}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}
