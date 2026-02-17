import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useStreamStore } from '../../hooks/useStreamStore';
import type { SecurityType } from '../../types/streamSet';

const TABS: { value: SecurityType | 'All'; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'M Bono', label: 'M Bono' },
  { value: 'UDI Bono', label: 'UDI Bono' },
  { value: 'Cetes', label: 'Cetes' },
  { value: 'Corporate MXN', label: 'Corporate MXN' },
  { value: 'Corporate UDI', label: 'Corporate UDI' },
];

export function TabBar() {
  const {
    activeTab,
    setActiveTab,
    streamSets,
    expandedStreamIds,
    expandAllInView,
    collapseAllInView,
    getFilteredStreamSets,
  } = useStreamStore();

  const getCount = (type: SecurityType | 'All') => {
    if (type === 'All') return streamSets.length;
    return streamSets.filter((s) => s.securityType === type).length;
  };

  const filteredIds = getFilteredStreamSets().map((s) => s.id);
  const allExpanded = filteredIds.length > 0 && filteredIds.every((id) => expandedStreamIds.has(id));

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SecurityType | 'All')}>
        <TabsList variant="line" className="h-8">
          {TABS.map((tab) => {
            const count = getCount(tab.value);
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                variant="line"
                className="shrink-0 gap-1"
              >
                {tab.label}
                {count > 0 && (
                  <span className="opacity-70">({count})</span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={allExpanded ? collapseAllInView : expandAllInView}
            className="shrink-0"
          >
            {allExpanded ? (
              <ChevronsDownUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {allExpanded ? 'Collapse all streams' : 'Expand all streams'}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
