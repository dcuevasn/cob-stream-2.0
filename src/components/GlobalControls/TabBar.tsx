import { useState } from 'react';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
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
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const getCount = (type: SecurityType | 'All') => {
    if (type === 'All') return streamSets.length;
    return streamSets.filter((s) => s.securityType === type).length;
  };

  const filteredIds = getFilteredStreamSets().map((s) => s.id);
  const allExpanded = filteredIds.length > 0 && filteredIds.every((id) => expandedStreamIds.has(id));

  return (
    <div
      className="flex items-center justify-between border-b border-border"
      style={{ paddingLeft: '10px', paddingRight: '10px', paddingTop: '5px', paddingBottom: '5px' }}
    >
      {/* DSC segmented control */}
      <div
        role="tablist"
        aria-label="Security type filter"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '1px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '0.4rem',
          padding: '2px',
        }}
      >
        {TABS.map((tab) => {
          const count = getCount(tab.value);
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.value)}
              onMouseEnter={() => !isActive && setHoveredTab(tab.value)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                paddingLeft: '8px',
                paddingRight: '8px',
                paddingTop: '3px',
                paddingBottom: '3px',
                fontSize: '11px',
                fontWeight: isActive ? 600 : 500,
                borderRadius: '0.3rem',
                cursor: 'pointer',
                transition: 'background-color 0.12s, color 0.12s',
                backgroundColor: isActive
                  ? '#303030'
                  : hoveredTab === tab.value
                  ? 'rgba(255,255,255,0.06)'
                  : 'transparent',
                color: isActive ? '#f4f4f5' : hoveredTab === tab.value ? '#d4d4d8' : '#a1a1aa',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{ opacity: isActive ? 0.6 : 0.5, fontSize: '10px' }}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Expand/collapse toggle */}
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
