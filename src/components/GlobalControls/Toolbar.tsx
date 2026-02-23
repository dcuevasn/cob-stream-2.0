import React from 'react';
import { Loader2, Pause, Plus, Play, Minus, RefreshCw, MoreHorizontal, RotateCcw, ChevronDown, FlaskConical, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { AddSecurityDialog } from './AddSecurityDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { SearchBar } from './SearchBar';
import { BatchMaxLevelsPopover } from './BatchMaxLevelsPopover';
import { BatchSizePopover } from './BatchSizePopover';
import { LaunchProgressPopover } from './LaunchProgressPopover';
import { PauseProgressPopover } from './PauseProgressPopover';
import { useStreamStore } from '../../hooks/useStreamStore';
import { UserSettings } from './UserSettings';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { getActiveLevelCount } from '../../lib/utils';
import { cn } from '../../lib/utils';

const WIDE_BREAKPOINT = 896; // px - below this, secondary actions go to More

export function Toolbar() {
  const {
    adjustSpreadBid,
    adjustSpreadAsk,
    generateDemoData,
    launchingStreamIds,
    getFilteredStreamSets,
    batchRevertStagingChanges,
    batchApplyChanges,
    hasStagedStreamsInView,
    launchAllWithProgress,
    launchProgress,
    pauseAllWithProgress,
    pauseProgress,
    preferences,
    setPreferences,
  } = useStreamStore();

  const isBatchLaunching = launchingStreamIds.size > 0 || (launchProgress?.isActive ?? false);
  const isBatchPausing = pauseProgress?.isActive ?? false;

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
  // Only streams with actual pending edits — mirrors the blue row highlight driven by hasStagingChanges
  const stagingCount = filteredStreams.filter((s) => !!s.hasStagingChanges).length;
  const launchableCount = filteredStreams.filter(
    (s) =>
      s.state === 'staging' ||
      s.state === 'halted' ||
      s.state === 'paused' ||
      (s.state === 'active' && s.hasStagingChanges)
  ).length;
  const haltedCount = filteredStreams.filter((s) => s.state === 'halted').length;

  const [isReverting, setIsReverting] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);

  const hasStagedStreams = hasStagedStreamsInView();

  const handleBatchRevert = React.useCallback(async () => {
    if (isReverting || !hasStagedStreams) return;
    setIsReverting(true);
    batchRevertStagingChanges();
    setTimeout(() => setIsReverting(false), 200);
  }, [batchRevertStagingChanges, isReverting, hasStagedStreams]);

  const handleBatchApply = React.useCallback(async () => {
    if (isApplying || !hasStagedStreams) return;
    setIsApplying(true);
    try {
      await batchApplyChanges();
    } finally {
      setIsApplying(false);
    }
  }, [batchApplyChanges, isApplying, hasStagedStreams]);

  const handlePauseAll = React.useCallback(async () => {
    if (isBatchPausing) return;
    await pauseAllWithProgress('all');
  }, [pauseAllWithProgress, isBatchPausing]);

  const handlePauseAllBid = React.useCallback(async () => {
    if (isBatchPausing) return;
    await pauseAllWithProgress('bid');
  }, [pauseAllWithProgress, isBatchPausing]);

  const handlePauseAllAsk = React.useCallback(async () => {
    if (isBatchPausing) return;
    await pauseAllWithProgress('ask');
  }, [pauseAllWithProgress, isBatchPausing]);

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
      {/* Test/Demo Data Button */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size={isCompact ? 'icon-sm' : 'sm'}
                className={cn(
                  'gap-1 shrink-0 px-3 bg-amber-500/15 border-amber-500/50 text-amber-400 hover:bg-amber-500/25 hover:text-amber-300',
                  isCompact && 'h-8 min-w-8 px-3'
                )}
                title="Test Only - Generate demo data"
              >
                <FlaskConical className="h-4 w-4" />
                {!isCompact && <span className="truncate">Test Only</span>}
                <ChevronDown className="h-3 w-3 ml-0.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Generate demo data for testing</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="min-w-[220px]">
          <DropdownMenuItem onClick={() => generateDemoData('new_stream')}>
            <FlaskConical className="h-4 w-4 mr-2 text-muted-foreground" />
            New Stream
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => generateDemoData('ffch_bid')}>
            <FlaskConical className="h-4 w-4 mr-2 text-muted-foreground" />
            FFCH Alert (BID only)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => generateDemoData('ffch_ask')}>
            <FlaskConical className="h-4 w-4 mr-2 text-muted-foreground" />
            FFCH Alert (ASK only)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => generateDemoData('yield_crossing')}>
            <FlaskConical className="h-4 w-4 mr-2 text-muted-foreground" />
            Yield Crossing Alert
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => generateDemoData('staged')}>
            <FlaskConical className="h-4 w-4 mr-2 text-muted-foreground" />
            Staged Stream
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => generateDemoData('unconfigured')}>
            <FlaskConical className="h-4 w-4 mr-2 text-muted-foreground" />
            Unconfigured Stream
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={preferences.hideIndividualLevelControls}
            onCheckedChange={(checked) => setPreferences({ hideIndividualLevelControls: checked })}
          >
            <EyeOff className="h-4 w-4 mr-2 text-muted-foreground" />
            Hide individual level controls
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddSecurityDialog />

      {/* Stop All Dropdown */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size={isCompact ? 'icon-sm' : 'default'}
                className={cn(
                  'gap-1 shrink-0 px-3 text-red-400 border-red-400/50 hover:bg-red-400/10 hover:text-red-300',
                  isCompact && 'h-8 min-w-8 px-3',
                  isBatchPausing && 'opacity-80 cursor-wait'
                )}
                title="Stop All"
                disabled={isBatchPausing}
              >
                {isBatchPausing ? (
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
                {!isCompact && (
                  <span className="truncate max-w-[80px]">
                    {isBatchPausing ? 'Stopping...' : 'Stop All'}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 ml-0.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{isBatchPausing ? 'Stopping streams...' : 'Stop All'}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          <DropdownMenuItem onClick={handlePauseAll} disabled={isBatchPausing}>
            <Pause className="h-4 w-4 mr-2" />
            Stop All
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePauseAllBid} disabled={isBatchPausing}>
            <Pause className="h-4 w-4 mr-2" />
            Stop All Bid
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePauseAllAsk} disabled={isBatchPausing}>
            <Pause className="h-4 w-4 mr-2" />
            Stop All Ask
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
                size={isCompact ? 'icon-sm' : 'default'}
                className={cn(
                  'gap-1 shrink-0 min-w-[32px] px-3',
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
                <ChevronDown className="h-3 w-3 ml-0.5 opacity-70" />
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
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              className="!h-[22px] !min-h-[22px] !px-2 !py-1 rounded-md text-[11px] font-medium bg-zinc-600 text-zinc-200 hover:bg-zinc-500 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 border-0 shrink-0 w-fit min-w-0"
              onClick={handleBatchRevert}
              disabled={isReverting}
              title="Cancel all staged changes"
            >
              {isReverting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Cancel edits'}
            </Button>
            <Button
              className="!h-[22px] !min-h-[22px] !px-2 !py-1 rounded-md text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 shrink-0 w-fit min-w-0"
              onClick={handleBatchApply}
              disabled={isApplying}
              title="Apply all staged changes"
            >
              {isApplying ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Apply changes'}
            </Button>
          </div>
          <div className="h-6 w-px bg-border shrink-0" />
        </>
      )}
      <BatchMaxLevelsPopover />
      <BatchSizePopover />
      <div className="h-6 w-px bg-border shrink-0" />
      <UserSettings />
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
            Cancel edits (all)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleBatchApply} disabled={isApplying}>
            {isApplying ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <Play className="h-4 w-4 shrink-0" />
            )}
            Apply changes (all)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Test Only - Demo Data</DropdownMenuLabel>
      <DropdownMenuItem onClick={() => generateDemoData('new_stream')}>
        <FlaskConical className="h-4 w-4" />
        New Stream
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => generateDemoData('ffch_bid')}>
        <FlaskConical className="h-4 w-4" />
        FFCH Alert (BID only)
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => generateDemoData('ffch_ask')}>
        <FlaskConical className="h-4 w-4" />
        FFCH Alert (ASK only)
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => generateDemoData('yield_crossing')}>
        <FlaskConical className="h-4 w-4" />
        Yield Crossing Alert
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => generateDemoData('staged')}>
        <FlaskConical className="h-4 w-4" />
        Staged Stream
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => generateDemoData('unconfigured')}>
        <FlaskConical className="h-4 w-4" />
        Unconfigured Stream
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem
        checked={preferences.hideIndividualLevelControls}
        onCheckedChange={(checked) => setPreferences({ hideIndividualLevelControls: checked })}
      >
        <EyeOff className="h-4 w-4" />
        Hide individual level controls
      </DropdownMenuCheckboxItem>
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
          {/* Actions Bar: search on left, buttons on right */}
          <div
            className={cn(
              'flex items-center justify-between gap-2 sm:gap-3 min-w-0 w-full',
              'flex-wrap lg:flex-nowrap'
            )}
          >
            {/* Search Bar - Left Side */}
            <div className="shrink-0">
              <SearchBar />
            </div>

            {/* Action Buttons - Right Side */}
            <div className="flex items-center gap-1 sm:gap-2">
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
          </div>

          {/* Status Indicators: directly below buttons, right-aligned */}
          <div
            role="status"
            aria-live="polite"
            className={cn(
              'flex items-center min-h-[24px] w-full mt-2 pt-2 border-t border-border/50 bg-muted/20',
              'justify-end'
            )}
            title={`${activeStreamsCount} Active Streams, ${activeOrdersCount} Active Orders${pausedCount > 0 ? `, ${pausedCount} Stopped` : ''}${inactiveCount > 0 ? `, ${inactiveCount} Inactive` : ''}${stagingCount > 0 ? `, ${stagingCount} Staging` : ''}${haltedCount > 0 ? `, ${haltedCount} Halted` : ''}`}
          >
            <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-muted-foreground shrink-0">
              {/* Only show active indicators when there are active streams */}
              {activeStreamsCount > 0 && (
                <>
                  <span className="flex items-center gap-1 min-w-0" title="Stream Sets with ≥1 active level">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-active)] shrink-0" />
                    <span className="text-[var(--status-active)] truncate tabular-nums">
                      {activeStreamsCount} Streams
                    </span>
                  </span>
                  <span className="flex items-center gap-1 min-w-0" title="Total active levels (Bid + Ask)">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-active)] shrink-0 opacity-70" />
                    <span className="text-[var(--status-active)] truncate tabular-nums opacity-90">
                      {activeOrdersCount} Orders
                    </span>
                  </span>
                </>
              )}
              {pausedCount > 0 && (
                <span className="flex items-center gap-1 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-paused)] shrink-0" />
                  <span className="text-[var(--status-paused)] truncate">{pausedCount} Stopped</span>
                </span>
              )}
              {inactiveCount > 0 && (
                <span className="flex items-center gap-1 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                  <span className="text-gray-500 truncate">{inactiveCount} Inactive</span>
                </span>
              )}
              {stagingCount > 0 && (
                <span className="flex items-center gap-1 min-w-0 hidden sm:flex">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-staging)] shrink-0" />
                  <span className="text-[var(--status-staging)] truncate">{stagingCount} Staging</span>
                </span>
              )}
              {haltedCount > 0 && (
                <span className="flex items-center gap-1 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-halted)] shrink-0" />
                  <span className="text-[var(--status-halted)] truncate">{haltedCount} Halted</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Launch Progress Popover - rendered via portal */}
      <LaunchProgressPopover />
      
      {/* Pause Progress Popover - rendered via portal */}
      <PauseProgressPopover />
    </>
  );
}
