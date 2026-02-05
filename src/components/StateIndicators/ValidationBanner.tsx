import { AlertTriangle, Loader2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface ValidationBannerProps {
  message: string;
  onDismiss?: () => void;
  onRelaunch?: () => void;
  isLaunching?: boolean;
  className?: string;
}

export function ValidationBanner({
  message,
  onDismiss,
  onRelaunch,
  isLaunching = false,
  className,
}: ValidationBannerProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-[8px] py-1.5 rounded-md bg-[hsl(var(--status-halted))]/15 text-[11px] text-[hsl(var(--status-halted))]',
        className
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 min-w-0 truncate">{message}</span>
      {onRelaunch && (
        <Button
          variant="default"
          size="compact"
          onClick={onRelaunch}
          disabled={isLaunching}
          className="h-6 min-h-6 !px-[8px] py-1 text-[11px] bg-[hsl(var(--status-halted))] text-black hover:bg-[hsl(var(--status-halted))]/90 active:bg-[hsl(var(--status-halted))]/80 shrink-0 min-w-[70px]"
        >
          {isLaunching ? (
            <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          ) : (
            'Relaunch'
          )}
        </Button>
      )}
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          className="h-5 w-5 text-black hover:bg-white/20"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
