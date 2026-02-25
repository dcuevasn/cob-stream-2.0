import { AlertTriangle, Hand, Loader2, X, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { useSettingsStore } from '../../hooks/useSettingsStore';
import type { HaltReason } from '../../types/streamSet';

interface ValidationBannerProps {
  message: string;
  haltReason?: HaltReason;
  onDismiss?: () => void;
  onRelaunch?: () => void;
  isLaunching?: boolean;
  pulsing?: boolean;
  className?: string;
}

/** Get the context-aware icon for FFCH/yield_crossing halt reasons */
function HaltIcon({ haltReason }: { haltReason?: HaltReason }) {
  const autoRelaunchSettings = useSettingsStore((s) => s.autoRelaunchSettings);

  if (haltReason === 'ffch') {
    const autoEnabled = autoRelaunchSettings.autoRelaunchFFCH;
    return autoEnabled ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <Zap className="h-3.5 w-3.5 shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="top">Auto-relaunch enabled: Stream will relaunch automatically when FFCH clears</TooltipContent>
      </Tooltip>
    ) : (
      <Tooltip>
        <TooltipTrigger asChild>
          <Hand className="h-3.5 w-3.5 shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="top">Manual relaunch required: You must manually relaunch after FFCH clears</TooltipContent>
      </Tooltip>
    );
  }

  if (haltReason === 'yield_crossing') {
    const autoEnabled = autoRelaunchSettings.autoRelaunchYieldCrossing;
    return autoEnabled ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <Zap className="h-3.5 w-3.5 shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="top">Auto-relaunch enabled: Stream will relaunch automatically when yield crossing resolves</TooltipContent>
      </Tooltip>
    ) : (
      <Tooltip>
        <TooltipTrigger asChild>
          <Hand className="h-3.5 w-3.5 shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="top">Manual relaunch required: You must manually relaunch after resolving yield crossing</TooltipContent>
      </Tooltip>
    );
  }

  return <AlertTriangle className="h-3.5 w-3.5 shrink-0" />;
}

export function ValidationBanner({
  message,
  haltReason,
  onDismiss,
  onRelaunch,
  isLaunching = false,
  pulsing = false,
  className,
}: ValidationBannerProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-[8px] py-2.5 text-[11px] text-[var(--status-halted)] transition-colors duration-200',
        pulsing ? 'bg-[var(--status-halted)]/30 ring-1 ring-[var(--status-halted)]/60' : 'bg-[var(--status-halted)]/15',
        className
      )}
    >
      <HaltIcon haltReason={haltReason} />
      <span className="flex-1 min-w-0 truncate">{message}</span>
      {onRelaunch && (
        <Button
          variant="default"
          size="default"
          onClick={onRelaunch}
          disabled={isLaunching}
          className="h-6 min-h-6 !px-[8px] py-1 text-[11px] bg-[var(--status-halted)] text-black hover:bg-[var(--status-halted)]/90 active:bg-[var(--status-halted)]/80 shrink-0 min-w-[70px]"
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
