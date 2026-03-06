import { useState } from 'react';
import { useStreamStore } from '../../hooks/useStreamStore';
import { StreamRow } from './StreamRow';
import { StreamTableHeader } from './StreamTableHeader';
import type { SecurityType } from '../../types/streamSet';
import { cn } from '../../lib/utils';
import { Empty } from '../ui/empty';
import { Button } from '../ui/button';
import { Button as DSCButton } from '../dsc/button';
import { AddSecurityDialog } from '../GlobalControls/AddSecurityDialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { Search, Waves, Plus } from 'lucide-react';

/** Fixed order and display labels for All view accordion sections */
const ACCORDION_SECTIONS: { type: SecurityType; label: string }[] = [
  { type: 'M Bono', label: 'M BONO' },
  { type: 'UDI Bono', label: 'UDI BONO' },
  { type: 'Cetes', label: 'CETES' },
  { type: 'Corporate MXN', label: 'CORP MXN' },
  { type: 'Corporate UDI', label: 'CORP UDI' },
];

/** Distinct background colors for accordion section headers */
const ACCORDION_BG: Record<SecurityType, string> = {
  'M Bono': 'bg-muted/40',
  'UDI Bono': 'bg-muted/50',
  'Cetes': 'bg-muted/30',
  'Corporate MXN': 'bg-muted/60',
  'Corporate UDI': 'bg-muted/45',
};

interface StreamTableProps {
  securityType?: SecurityType;
}

export function StreamTable({ securityType }: StreamTableProps) {
  const {
    getFilteredStreamSets,
    activeTab,
    searchQuery,
    setSearchQuery,
    accordionOpenSections,
    setAccordionOpenSections,
  } = useStreamStore();
  const streams = getFilteredStreamSets();

  // Group by security type when showing "All"
  const groupedStreams = activeTab === 'All'
    ? groupByType(streams)
    : { [securityType || activeTab]: streams };

  const hasSearchFilter = searchQuery.trim().length > 0;
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  if (streams.length === 0) {
    const addSecurityType: SecurityType = activeTab === 'All' ? 'M Bono' : activeTab;
    return (
      <Empty className="flex-1 min-h-0 flex" style={{ padding: '0' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '32px 36px',
            border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: '12px',
            minWidth: '240px',
            maxWidth: '300px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {hasSearchFilter
              ? <Search style={{ width: '16px', height: '16px', color: '#71717a' }} />
              : <Waves style={{ width: '16px', height: '16px', color: '#71717a' }} />
            }
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', letterSpacing: '-0.01em' }}>
              {hasSearchFilter ? 'No results found' : 'No streams yet'}
            </span>
            <span style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: '1.6' }}>
              {hasSearchFilter
                ? 'No streams match your search. Try adjusting your search terms.'
                : 'Get started by adding a security to this view.'}
            </span>
          </div>
          {hasSearchFilter ? (
            <DSCButton variant="outline" size="sm" style={{ paddingLeft: '20px', paddingRight: '20px' }} onClick={() => setSearchQuery('')}>
              Clear search
            </DSCButton>
          ) : (
            <DSCButton variant="outline" size="sm" style={{ paddingLeft: '20px', paddingRight: '20px' }} onClick={() => setAddDialogOpen(true)} className="gap-1.5">
              <Plus style={{ width: '12px', height: '12px' }} />
              Add security
            </DSCButton>
          )}
        </div>
        <AddSecurityDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          initialTypeFilter={activeTab === 'All' ? 'All' : activeTab}
        />
      </Empty>
    );
  }

  if (activeTab === 'All') {
    return (
      <div className="flex-1 min-h-0 overflow-auto">
        <Accordion
          type="multiple"
          value={accordionOpenSections}
          onValueChange={(value) => {
            if (
              value.length !== accordionOpenSections.length ||
              value.some((v, i) => v !== accordionOpenSections[i])
            ) {
              setAccordionOpenSections(value);
            }
          }}
          className="w-full"
        >
          {ACCORDION_SECTIONS.map(({ type, label }) => {
            const typeStreams = groupedStreams[type] ?? [];
            if (typeStreams.length === 0) return null;
            const isOpen = accordionOpenSections.includes(type);
            return (
              <AccordionItem key={type} value={type} className="border-border">
                <AccordionTrigger
                  className={cn(
                    'sticky top-0 z-10 border-b border-border hover:no-underline',
                    'transition-colors duration-150 cursor-pointer',
                    'hover:bg-muted/80 hover:text-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    ACCORDION_BG[type]
                  )}
                  style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '4px', paddingBottom: '4px' }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', color: isOpen ? '#e4e4e7' : '#a1a1aa', transition: 'color 0.15s' }}>
                    {label} ({typeStreams.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0 pt-0 overflow-x-auto">
                  <div className="min-w-[1000px]">
                    <StreamTableHeader securityType={type} />
                    {typeStreams.map((stream) => (
                      <StreamRow key={stream.id} stream={stream} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="pt-2 overflow-x-auto">
        <div className="min-w-[1000px]">
          <StreamTableHeader />
          {streams.map((stream) => (
            <StreamRow key={stream.id} stream={stream} />
          ))}
        </div>
      </div>
    </div>
  );
}

function groupByType(streams: ReturnType<typeof useStreamStore.getState>['streamSets']) {
  return streams.reduce((acc, stream) => {
    const type = stream.securityType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(stream);
    return acc;
  }, {} as Record<SecurityType, typeof streams>);
}
