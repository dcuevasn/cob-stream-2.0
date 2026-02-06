import { useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStreamStore } from '../../hooks/useStreamStore';
import type { LaunchProgressStatus, LaunchProgressItem, SecurityType } from '../../types/streamSet';

/** Security type display order (matching accordion order) */
const SECURITY_TYPE_ORDER: SecurityType[] = [
  'M Bono',
  'UDI Bono',
  'Cetes',
  'Corporate MXN',
  'Corporate UDI',
];

/** Get status icon for a launch progress item */
function StatusIcon({ status }: { status: LaunchProgressStatus }) {
  switch (status) {
    case 'pending':
      return <div className="w-3 h-3 rounded-full border border-gray-500/50" />;
    case 'processing':
      return <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />;
    case 'success':
      return (
        <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
          <Check className="w-2 h-2 text-white" strokeWidth={3} />
        </div>
      );
    case 'error':
      return (
        <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center animate-shake">
          <X className="w-2 h-2 text-white" strokeWidth={3} />
        </div>
      );
  }
}

/** Individual stream item in the progress list */
function ProgressItem({
  streamName,
  status,
  error,
  bidCount,
  askCount,
  index,
}: {
  streamName: string;
  status: LaunchProgressStatus;
  error?: string;
  bidCount: number;
  askCount: number;
  index: number;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-[11px] transition-all duration-200',
        'animate-fade-slide-in',
        status === 'pending' && 'text-gray-500',
        status === 'processing' && 'text-white',
        status === 'success' && 'text-green-400',
        status === 'error' && 'text-red-400'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <StatusIcon status={status} />
      <span
        className={cn(
          'flex-1 truncate font-medium',
          status === 'processing' && 'shimmer-text'
        )}
      >
        {streamName}
      </span>
      {status === 'processing' && (
        <span className="text-blue-400 animate-pulse-dots">...</span>
      )}
      {status === 'success' && (
        <span className="text-green-500/70 text-[10px] tabular-nums whitespace-nowrap">
          ({bidCount} bid, {askCount} ask)
        </span>
      )}
      {status === 'error' && (
        <span className="text-red-400/70 text-[10px] tabular-nums whitespace-nowrap" title={error}>
          ({bidCount} bid, {askCount} ask)
        </span>
      )}
    </div>
  );
}

/** Progress bar component */
function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  
  return (
    <div className="h-1 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

/** Section header for security type groups */
function SectionHeader({ 
  securityType, 
  itemCount,
  successCount,
  totalBidOrders,
  totalAskOrders,
}: { 
  securityType: SecurityType;
  itemCount: number;
  successCount: number;
  totalBidOrders: number;
  totalAskOrders: number;
}) {
  const totalOrders = totalBidOrders + totalAskOrders;
  return (
    <div className="flex items-center justify-between px-3 py-1 bg-[hsl(var(--popover-surface))] border-y border-border/30 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {securityType}
        </span>
        <span className="text-[9px] text-muted-foreground/70 tabular-nums">
          ({successCount}/{itemCount})
        </span>
      </div>
      <span className="text-[9px] text-muted-foreground/60 tabular-nums">
        {totalOrders} orders
      </span>
    </div>
  );
}

/** Group items by security type in display order */
function groupItemsBySecurityType(items: LaunchProgressItem[]) {
  const groups = new Map<SecurityType, LaunchProgressItem[]>();
  
  // Initialize groups in order
  for (const type of SECURITY_TYPE_ORDER) {
    groups.set(type, []);
  }
  
  // Populate groups
  for (const item of items) {
    const group = groups.get(item.securityType);
    if (group) {
      group.push(item);
    }
  }
  
  // Filter out empty groups and return as array
  return SECURITY_TYPE_ORDER
    .filter((type) => (groups.get(type)?.length ?? 0) > 0)
    .map((type) => ({
      securityType: type,
      items: groups.get(type) ?? [],
    }));
}

/** Main popover component for launch progress */
export function LaunchProgressPopover() {
  const launchProgress = useStreamStore((s) => s.launchProgress);
  const dismissLaunchProgress = useStreamStore((s) => s.dismissLaunchProgress);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Group items by security type (only when in All view with multiple types)
  const groupedItems = useMemo(() => {
    if (!launchProgress) return null;
    const uniqueTypes = new Set(launchProgress.items.map((item) => item.securityType));
    // Only group if there are multiple security types (All view)
    if (uniqueTypes.size <= 1) return null;
    return groupItemsBySecurityType(launchProgress.items);
  }, [launchProgress?.items]);
  
  // Auto-scroll to show latest processing item
  useEffect(() => {
    if (listRef.current && launchProgress) {
      const processingIndex = launchProgress.items.findIndex((item) => item.status === 'processing');
      if (processingIndex >= 0) {
        // Find the actual DOM element (accounting for section headers)
        const processingItem = listRef.current.querySelector(`[data-stream-id="${launchProgress.items[processingIndex].streamId}"]`);
        if (processingItem) {
          processingItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  }, [launchProgress?.items]);
  
  if (!launchProgress) return null;
  
  const { items, completedCount, totalCount, variant, isActive } = launchProgress;
  const successCount = items.filter((item) => item.status === 'success').length;
  const errorCount = items.filter((item) => item.status === 'error').length;
  const isComplete = completedCount >= totalCount;
  
  const variantLabel = variant === 'all' ? 'All' : variant === 'bid' ? 'Bid' : 'Ask';
  const title = isActive ? `Launching ${variantLabel}` : 'Launch Complete';
  
  return createPortal(
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'w-[300px] rounded-lg border border-border/50',
        'bg-[hsl(var(--popover-surface))] backdrop-blur-sm shadow-2xl',
        'animate-slide-up',
        !isActive && 'animate-pulse-glow'
      )}
      role="status"
      aria-live="polite"
      aria-label="Launch progress"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          {isActive ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          ) : isComplete && errorCount === 0 ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
          )}
          <span className="text-[12px] font-medium text-white">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {completedCount}/{totalCount}
          </span>
          <button
            type="button"
            onClick={dismissLaunchProgress}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="px-3 py-1.5">
        <ProgressBar completed={completedCount} total={totalCount} />
      </div>
      
      {/* Stream list */}
      <div
        ref={listRef}
        className="max-h-[200px] overflow-y-auto scrollbar-thin"
      >
        {groupedItems ? (
          // Grouped view (All view with multiple security types)
          groupedItems.map((group, groupIndex) => {
            const groupSuccessCount = group.items.filter((item) => item.status === 'success').length;
            // Calculate total orders for this section
            const totalBidOrders = group.items.reduce((sum, item) => sum + item.bidCount, 0);
            const totalAskOrders = group.items.reduce((sum, item) => sum + item.askCount, 0);
            // Calculate base index for animation delay
            const baseIndex = groupedItems
              .slice(0, groupIndex)
              .reduce((sum, g) => sum + g.items.length, 0);
            
            return (
              <div key={group.securityType}>
                <SectionHeader
                  securityType={group.securityType}
                  itemCount={group.items.length}
                  successCount={groupSuccessCount}
                  totalBidOrders={totalBidOrders}
                  totalAskOrders={totalAskOrders}
                />
                {group.items.map((item, itemIndex) => (
                  <div key={item.streamId} data-stream-id={item.streamId}>
                    <ProgressItem
                      streamName={item.streamName}
                      status={item.status}
                      error={item.error}
                      bidCount={item.bidCount}
                      askCount={item.askCount}
                      index={baseIndex + itemIndex}
                    />
                  </div>
                ))}
              </div>
            );
          })
        ) : (
          // Flat view (single security type)
          items.map((item, index) => (
            <div key={item.streamId} data-stream-id={item.streamId}>
              <ProgressItem
                streamName={item.streamName}
                status={item.status}
                error={item.error}
                bidCount={item.bidCount}
                askCount={item.askCount}
                index={index}
              />
            </div>
          ))
        )}
      </div>
      
      {/* Footer summary (when complete) */}
      {isComplete && (
        <div className="px-3 py-2 border-t border-border/50 text-[10px] text-muted-foreground">
          <span className="text-green-400">{successCount} successful</span>
          {errorCount > 0 && (
            <span className="ml-2 text-red-400">{errorCount} failed</span>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
