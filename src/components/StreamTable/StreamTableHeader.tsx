import { cn } from '../../lib/utils';
import { PriceSourceBatchPopover } from './PriceSourceBatchPopover';
import { UnitBatchPopover } from './UnitBatchPopover';

export const STREAM_TABLE_COL_GRID =
  'grid-cols-[40px_100px_90px_55px_55px_40px_55px_50px_55px_55px_50px_55px_40px_45px_140px]';

export function StreamTableHeader() {
  return (
    <div className={cn('grid gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/50 bg-muted/30', STREAM_TABLE_COL_GRID)}>
      <div className="text-center"></div>
      <div>Name</div>
      <div className="min-w-0">
        <PriceSourceBatchPopover />
      </div>
      <span className="text-center text-muted-foreground">Live Bid</span>
      <span className="text-center text-muted-foreground">Live Ask</span>
      <span className="text-center">BLVL</span>
      <span className="text-right">BSIZ</span>
      <span className="text-right">BSP</span>
      <span className="text-right text-green-400">BID</span>
      <span className="text-right text-red-400">ASK</span>
      <span className="text-right">ASP</span>
      <span className="text-right">ASIZ</span>
      <span className="text-center">ALVL</span>
      <div className="text-center min-w-0">
        <UnitBatchPopover />
      </div>
      <div className="text-center">Actions</div>
    </div>
  );
}
