import { Circle, AlertTriangle, Settings, XCircle } from 'lucide-react';
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
}

const stateConfig: Record<StreamState, {
  icon: typeof Circle;
  color: string;
  bgColor: string;
  label: string;
  /** Use circle (like Active) instead of icon - for paused/inactive states */
  useCircle?: boolean;
}> = {
  unconfigured: {
    icon: Settings,
    color: 'text-[hsl(var(--status-unconfigured))]',
    bgColor: 'bg-[hsl(var(--status-unconfigured))]',
    label: 'Not Configured',
  },
  staging: {
    icon: Circle,
    color: 'text-[hsl(var(--status-staging))]',
    bgColor: 'bg-[hsl(var(--status-staging))]',
    label: 'Staging',
    useCircle: true,
  },
  active: {
    icon: Circle,
    color: 'text-[hsl(var(--status-active))]',
    bgColor: 'bg-[hsl(var(--status-active))]',
    label: 'Active',
  },
  paused: {
    icon: Circle,
    color: 'text-[hsl(var(--status-paused))]',
    bgColor: 'bg-[hsl(var(--status-paused))]',
    label: 'Paused',
    useCircle: true,
  },
  halted: {
    icon: AlertTriangle,
    color: 'text-[hsl(var(--status-halted))]',
    bgColor: 'bg-[hsl(var(--status-halted))]',
    label: 'Halted',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-[hsl(var(--status-cancelled))]',
    bgColor: 'bg-[hsl(var(--status-cancelled))]',
    label: 'Cancelled',
  },
};

export function StatusBadge({ state, haltDetails, className, showLabel = false }: StatusBadgeProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  const badge = (
    <div className={cn('flex items-center gap-1.5', className)}>
      {state === 'active' ? (
        <span className={cn('w-2 h-2 rounded-full pulse-active', config.bgColor)} />
      ) : config.useCircle ? (
        <span className={cn('w-2 h-2 rounded-full', config.bgColor)} />
      ) : (
        <Icon className={cn('h-4 w-4', config.color)} />
      )}
      {showLabel && (
        <span className={cn('text-xs', config.color)}>{config.label}</span>
      )}
    </div>
  );

  if (state === 'halted' && haltDetails) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs bg-[hsl(var(--status-halted))] text-black">
          <p className="font-medium">Stream Halted</p>
          <p className="text-xs mt-1">{haltDetails}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}
