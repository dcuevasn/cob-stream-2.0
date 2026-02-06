import React from 'react';
import { Loader2, Pause, Plus, Play, Minus, RefreshCw, Sparkles, MoreHorizontal, RotateCcw, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { BatchMaxLevelsPopover } from './BatchMaxLevelsPopover';
import { LaunchProgressPopover } from './LaunchProgressPopover';
import { useStreamStore } from '../../hooks/useStreamStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { getActiveLevelCount } from '../../lib/utils';
import { cn } from '../../lib/utils';

const WIDE_BREAKPOINT = 896; // px - below this, secondary actions go to More

export function Toolbar() {
  const {
    pauseAllInView,
    pauseAllLevels,
    adjustSpreadBid,
    adjustSpreadAsk,
    addStreamSet,
    generateDemoData,
    launchingStreamIds,
    getFilteredStreamSets,
    batchRevertStagingChanges,
    hasStagedStreamsInView,
    launchAllWithProgress,
    launchProgress,
  } = useStreamStore();

  const isBatchLaunching = launchingStreamIds.size > 0 || (launchProgress?.isActive ?? false);

  const isWide = useMediaQuery(`(min-width: ${WIDE_BREAKPOINT}px)`);
  const isCompact = useMediaQuery('(max-width: 540px)'); // icon-only for Pause/Launch

  const filteredStreams = getFilteredStreamSets();

  // Active Streams = streams with ≥1 active level; Active Orders = total active levels
  const { activeStreamsCount, activeOrdersCount } = filteredStreams.reduce(
    (acc, s) => {
      const bid = getActiveLevelCount(s.bid.spreadMatrix, s.bid);
      const ask = getActiveLevelCount(s.ask.spreadMatrix, s.ask);
      const total = bid + ask;
      return {
        activeStreamsCount: acc.activeStreamsCount + (total > 0 ? 1 : 0),
        activeOrdersCount: acc.activeOrdersCount + total,
      };
    },
    { activeStreamsCount: 0, activeOrdersCount: 0 }
  );

  const pausedCount = filteredStreams.filter((s) => s.state === 'paused').length;
  const inactiveCount = filteredStreams.filter(
    (s) => s.state !== 'active' && s.state !== 'paused'
  ).length;
  const stagingCount = filteredStreams.filter(
    (s) => s.state === 'staging' || s.state === 'halted' || (s.state === 'active' && s.hasStagingChanges)
  ).length;
  const launchableCount = filteredStreams.filter(
    (s) =>
      s.state === 'staging' ||
      s.state === 'halted' ||
      s.state === 'paused' ||
      (s.state === 'active' && s.hasStagingChanges)
  ).length;
  const haltedCount = filteredStreams.filter((s) => s.state === 'halted').length;

  const [isReverting, setIsReverting] = React.useState(false);
  const [isPausing, setIsPausing] = React.useState(false);

  const hasStagedStreams = hasStagedStreamsInView();

  const handleBatchRevert = React.useCallback(async () => {
    if (isReverting || !hasStagedStreams) return;
    setIsReverting(true);
    batchRevertStagingChanges();
    setTimeout(() => setIsReverting(false), 200);
  }, [batchRevertStagingChanges, isReverting, hasStagedStreams]);

  const handlePauseAll = React.useCallback(() => {
    if (isPausing) return;
    setIsPausing(true);
    pauseAllInView();
    setTimeout(() => setIsPausing(false), 200);
  }, [pauseAllInView, isPausing]);

  // Batch actions for bid/ask sides across all streams
  const handlePauseAllBid = React.useCallback(async () => {
    if (isPausing) return;
    setIsPausing(true);
    const streams = getFilteredStreamSets();
    // Pause bid side on ALL streams that have bid levels (not just active state)
    const streamsToPause = streams.filter(
      (ss) => ss.state !== 'cancelled' && ss.state !== 'unconfigured'
    );
    await Promise.all(streamsToPause.map((s) => pauseAllLevels(s.id, 'bid')));
    setTimeout(() => setIsPausing(false), 200);
  }, [getFilteredStreamSets, pauseAllLevels, isPausing]);

  const handlePauseAllAsk = React.useCallback(async () => {
    if (isPausing) return;
    setIsPausing(true);
    const streams = getFilteredStreamSets();
    // Pause ask side on ALL streams that have ask levels (not just active state)
    const streamsToPause = streams.filter(
      (ss) => ss.state !== 'cancelled' && ss.state !== 'unconfigured'
    );
    await Promise.all(streamsToPause.map((s) => pauseAllLevels(s.id, 'ask')));
    setTimeout(() => setIsPausing(false), 200);
  }, [getFilteredStreamSets, pauseAllLevels, isPausing]);

  const handleLaunchAll = React.useCallback(async () => {
    if (isBatchLaunching) return;
    await launchAllWithProgress('all');
  }, [launchAllWithProgress, isBatchLaunching]);

  const handleLaunchAllBid = React.useCallback(async () => {
    if (isBatchLaunching) return;
    await launchAllWithProgress('bid');
  }, [launchAllWithProgress, isBatchLaunching]);

  const handleLaunchAllAsk = React.useCallback(async () => {
    if (isBatchLaunching) return;
    await launchAllWithProgress('ask');
  }, [launchAllWithProgress, isBatchLaunching]);

  const primaryActions = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size={isCompact ? 'icon-sm' : 'sm'}
            onClick={() => addStreamSet('M Bono')}
            className={cn('gap-1 shrink-0 px-2 w-fit h-7', isCompact && 'h-8 min-w-8')}
          >
            <Plus className="h-4 w-4" />
            {!isCompact && <span className="truncate max-w-[120px]">Add security</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add security</TooltipContent>
      </Tooltip>

      {/* Pause All Dropdown */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size={isCompact ? 'icon-sm' : 'compact'}
                className={cn('gap-1 shrink-0 px-3 text-red-400 border-red-400/50 hover:bg-red-400/10 hover:text-red-300', isCompact && 'h-8 min-w-8 px-2')}
                title="Pause All"
              >
                {isPausing ? (
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
                {!isCompact && <span className="truncate max-w-[80px]">Pause All</span>}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Pause All</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          <DropdownMenuItem onClick={handlePauseAll}>
            <Pause className="h-4 w-4 mr-2" />
            Pause All
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePauseAllBid}>
            <Pause className="h-4 w-4 mr-2" />
            Pause All Bid
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePauseAllAsk}>
            <Pause className="h-4 w-4 mr-2" />
            Pause All Ask
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Launch All Dropdown */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="success"
                size={isCompact ? 'icon-sm' : 'compact'}
                className={cn(
                  'gap-1 shrink-0 min-w-[32px] px-2',
                  isCompact && 'h-8 min-w-8',
                  isBatchLaunching && 'opacity-80 cursor-wait'
                )}
                title="Launch All"
                disabled={isBatchLaunching}
              >
                {isBatchLaunching ? (
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                {!isCompact && (
                  <span className="truncate max-w-[80px]">
                    {isBatchLaunching ? 'Launching...' : 'Launch All'}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{isBatchLaunching ? 'Launching streams...' : 'Launch All'}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          <DropdownMenuItem onClick={handleLaunchAll} disabled={isBatchLaunching}>
            <Play className="h-4 w-4 mr-2" />
            Launch All
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLaunchAllBid} disabled={isBatchLaunching}>
            <Play className="h-4 w-4 mr-2" />
            Launch All Bid
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLaunchAllAsk} disabled={isBatchLaunching}>
            <Play className="h-4 w-4 mr-2" />
            Launch All Ask
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  const secondaryActions = (
    <>
      {hasStagedStreams && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBatchRevert}
            disabled={isReverting}
            className="gap-1 shrink-0 px-3 text-muted-foreground hover:text-foreground"
            title="Cancel all staged changes"
          >
            {isReverting ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <RotateCcw className="h-4 w-4 shrink-0" />
            )}
            {!isCompact && <span className="truncate">Cancel changes</span>}
          </Button>
          <div className="h-6 w-px bg-border shrink-0" />
        </>
      )}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 shrink-0 px-3 border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                title="Generate demo stream with specified characteristics"
              >
                <Sparkles className="h-4 w-4" />
                Generate Demo Data
                <ChevronDown className="h-3 w-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Generate demo stream</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="min-w-[220px]">
          <DropdownMenuItem onClick={() => generateDemoData('new_stream')}>
            <Sparkles className="h-4 w-4 mr-2" />
            New Stream
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => generateDemoData('yield_crossing')}>
            <Sparkles className="h-4 w-4 mr-2" />
            Stream with Yield Crossing Alert
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => generateDemoData('ffch')}>
            <Sparkles className="h-4 w-4 mr-2" />
            Stream with FFCH Alert
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => generateDemoData('staged')}>
            <Sparkles className="h-4 w-4 mr-2" />
            Staged Stream
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => generateDemoData('unconfigured')}>
            <Sparkles className="h-4 w-4 mr-2" />
            Unconfigured Stream
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-6 w-px bg-border shrink-0" />

      <BatchMaxLevelsPopover />

    </>
  );

  const moreMenuItems = (
    <>
      {hasStagedStreams && (
        <>
          <DropdownMenuItem onClick={handleBatchRevert} disabled={isReverting}>
            {isReverting ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <RotateCcw className="h-4 w-4 shrink-0" />
            )}
            Cancel changes
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Generate Demo Data</DropdownMenuLabel>
      <DropdownMenuItem onClick={() => generateDemoData('new_stream')}>
        <Sparkles className="h-4 w-4" />
        New Stream
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => generateDemoData('yield_crossing')}>
        <Sparkles className="h-4 w-4" />
        Stream with Yield Crossing Alert
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => generateDemoData('ffch')}>
        <Sparkles className="h-4 w-4" />
        Stream with FFCH Alert
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => generateDemoData('staged')}>
        <Sparkles className="h-4 w-4" />
        Staged Stream
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => generateDemoData('unconfigured')}>
        <Sparkles className="h-4 w-4" />
        Unconfigured Stream
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Spread adjustments</DropdownMenuLabel>
      <DropdownMenuItem onClick={() => adjustSpreadBid(-0.5)}>
        <Minus className="h-4 w-4" />
        Bid spread −0.5 bps
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => adjustSpreadBid(0.5)}>
        <Plus className="h-4 w-4" />
        Bid spread +0.5 bps
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => adjustSpreadAsk(-0.5)}>
        <Minus className="h-4 w-4" />
        Ask spread −0.5 bps
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => adjustSpreadAsk(0.5)}>
        <Plus className="h-4 w-4" />
        Ask spread +0.5 bps
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <RefreshCw className="h-4 w-4" />
        Refresh
      </DropdownMenuItem>
    </>
  );

  return (
    <>
      <div className="border-b border-border bg-card">
        {/* Actions and Status: buttons on top, status indicators below, right-aligned */}
        <div className="flex flex-col items-end px-4 py-2 min-w-0 w-full">
          {/* Actions Bar: buttons only, right-aligned */}
          <div
            className={cn(
              'flex items-center justify-end gap-1 sm:gap-2 min-w-0 w-full',
              'flex-wrap lg:flex-nowrap'
            )}
          >
            {primaryActions}
            {isWide ? (
              <>
                <div className="h-6 w-px bg-border shrink-0" />
                {secondaryActions}
              </>
            ) : (
              <>
                <div className="h-6 w-px bg-border shrink-0" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 shrink-0 px-3">
                      <MoreHorizontal className="h-4 w-4" />
                      More
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[180px]">
                    {moreMenuItems}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Status Indicators: directly below buttons, right-aligned */}
          <div
            role="status"
            aria-live="polite"
            className={cn(
              'flex items-center min-h-[24px] w-full mt-2 pt-2 border-t border-border/50 bg-muted/20',
              'justify-end'
            )}
            title={`${activeStreamsCount} Active Streams, ${activeOrdersCount} Active Orders${pausedCount > 0 ? `, ${pausedCount} Paused` : ''}${inactiveCount > 0 ? `, ${inactiveCount} Inactive` : ''}${stagingCount > 0 ? `, ${stagingCount} Staging` : ''}${haltedCount > 0 ? `, ${haltedCount} Halted` : ''}`}
          >
            <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-muted-foreground shrink-0">
              {/* Only show active indicators when there are active streams */}
              {activeStreamsCount > 0 && (
                <>
                  <span className="flex items-center gap-1 min-w-0" title="Stream Sets with ≥1 active level">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--status-active))] shrink-0" />
                    <span className="text-[hsl(var(--status-active))] truncate tabular-nums">
                      {activeStreamsCount} Streams
                    </span>
                  </span>
                  <span className="flex items-center gap-1 min-w-0" title="Total active levels (Bid + Ask)">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--status-active))] shrink-0 opacity-70" />
                    <span className="text-[hsl(var(--status-active))] truncate tabular-nums opacity-90">
                      {activeOrdersCount} Orders
                    </span>
                  </span>
                </>
              )}
              {pausedCount > 0 && (
                <span className="flex items-center gap-1 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--status-paused))] shrink-0" />
                  <span className="text-[hsl(var(--status-paused))] truncate">{pausedCount} Paused</span>
                </span>
              )}
              {inactiveCount > 0 && (
                <span className="flex items-center gap-1 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                  <span className="text-gray-500 truncate">{inactiveCount} Inactive</span>
                </span>
              )}
              {hasStagedStreams && (
                <span className="flex items-center gap-1 min-w-0 hidden sm:flex">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--status-staging))] shrink-0" />
                  <span className="text-[hsl(var(--status-staging))] truncate">{stagingCount} Staging</span>
                </span>
              )}
              {haltedCount > 0 && (
                <span className="flex items-center gap-1 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--status-halted))] shrink-0" />
                  <span className="text-[hsl(var(--status-halted))] truncate">{haltedCount} Halted</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Launch Progress Popover - rendered via portal */}
      <LaunchProgressPopover />
    </>
  );
}
