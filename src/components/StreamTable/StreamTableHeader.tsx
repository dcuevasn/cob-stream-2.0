import { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { useSettingsStore, type ColumnVisibility, type ToggleableColumn } from '../../hooks/useSettingsStore';
import type { SecurityType } from '../../types/streamSet';

/** Static fallback grid (all columns visible) */
export const STREAM_TABLE_COL_GRID =
  'grid-cols-[40px_100px_90px_40px_55px_50px_55px_55px_55px_55px_50px_55px_40px_45px]';

/** Width of the sticky actions column */
export const ACTIONS_COLUMN_WIDTH = 'w-[32px]';

/**
 * Column width definitions ordered to match the grid.
 * First two (expand icon, name) are always visible.
 */
const COLUMN_WIDTHS: { key: ToggleableColumn | null; width: string }[] = [
  { key: null, width: '40px' },      // expand/status - always visible
  { key: null, width: '100px' },     // name - always visible
  { key: 'priceSource', width: '90px' },
  { key: 'blvl', width: '40px' },
  { key: 'bsiz', width: '55px' },
  { key: 'bsp', width: '50px' },
  { key: 'bid', width: '55px' },
  { key: 'liveBid', width: '55px' },
  { key: 'liveAsk', width: '55px' },
  { key: 'ask', width: '55px' },
  { key: 'asp', width: '50px' },
  { key: 'asiz', width: '55px' },
  { key: 'alvl', width: '40px' },
  { key: 'unit', width: '45px' },
];

/** Build a CSS gridTemplateColumns value based on column visibility */
export function getStreamTableGridStyle(visibility: ColumnVisibility): React.CSSProperties {
  const widths = COLUMN_WIDTHS
    .filter((c) => c.key === null || visibility[c.key])
    .map((c) => c.width);
  return { gridTemplateColumns: widths.join(' ') };
}

/** Hook to get the dynamic grid style from the settings store */
export function useTableGridStyle(): React.CSSProperties {
  const visibility = useSettingsStore((s) => s.columnVisibility);
  return useMemo(() => getStreamTableGridStyle(visibility), [visibility]);
}


interface StreamTableHeaderProps {
  securityType?: SecurityType;
}

export function StreamTableHeader({ securityType }: StreamTableHeaderProps) {
  const gridStyle = useTableGridStyle();
  const vis = useSettingsStore((s) => s.columnVisibility);

  return (
    <div className="flex border-b border-border/50 bg-muted/30">
      {/* Scrollable columns */}
      <div className="grid gap-2 px-4 py-2.5 items-center text-xs font-medium text-muted-foreground flex-1 min-w-0" style={gridStyle}>
        <div className="text-center"></div>
        <div>Name</div>
        {vis.priceSource && <span className="truncate">Price Source</span>}
        {vis.blvl && <span className="text-center">BLVL</span>}
        {vis.bsiz && <span className="text-right">BSIZ</span>}
        {vis.bsp && <span className="text-right">BSP</span>}
        {vis.bid && <span className="text-right text-green-400">BID</span>}
        {vis.liveBid && <span className="text-center text-muted-foreground">Live Bid</span>}
        {vis.liveAsk && <span className="text-center text-muted-foreground">Live Ask</span>}
        {vis.ask && <span className="text-right text-red-400">ASK</span>}
        {vis.asp && <span className="text-right">ASP</span>}
        {vis.asiz && <span className="text-right">ASIZ</span>}
        {vis.alvl && <span className="text-center">ALVL</span>}
        {vis.unit && <span className="text-center">UNIT</span>}
      </div>
      {/* Sticky Actions column - empty header */}
      <div className={cn(
        'sticky right-0 z-20 px-2 py-2.5',
        'bg-muted/30 border-l border-border/30',
        'shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)]',
        ACTIONS_COLUMN_WIDTH
      )} />
    </div>
  );
}
