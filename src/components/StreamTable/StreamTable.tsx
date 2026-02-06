import { useStreamStore } from '../../hooks/useStreamStore';
import { StreamRow } from './StreamRow';
import { StreamTableHeader } from './StreamTableHeader';
import type { SecurityType } from '../../types/streamSet';
import { cn } from '../../lib/utils';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../ui/empty';
import { Button } from '../ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { Search, BarChart3, Plus, Sparkles } from 'lucide-react';

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
    addStreamSet,
    generateDemoData,
    accordionOpenSections,
    setAccordionOpenSections,
  } = useStreamStore();
  const streams = getFilteredStreamSets();

  // Group by security type when showing "All"
  const groupedStreams = activeTab === 'All'
    ? groupByType(streams)
    : { [securityType || activeTab]: streams };

  const hasSearchFilter = searchQuery.trim().length > 0;

  if (streams.length === 0) {
    const addSecurityType: SecurityType = activeTab === 'All' ? 'M Bono' : activeTab;
    return (
      <Empty className="flex-1 min-h-0 flex">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {hasSearchFilter ? (
              <Search className="h-8 w-8 text-muted-foreground" />
            ) : (
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            )}
          </EmptyMedia>
          <EmptyTitle>
            {hasSearchFilter ? 'No streams found' : 'No stream sets found'}
          </EmptyTitle>
          <EmptyDescription>
            {hasSearchFilter
              ? 'Try a different search term or clear the filter to see your streams.'
              : 'Get started by adding a security or generating demo data for this view.'}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {hasSearchFilter ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </Button>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => addStreamSet(addSecurityType)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add security
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateDemoData('new_stream')}
                className="gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                Generate Demo Data
              </Button>
            </>
          )}
        </EmptyContent>
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
            return (
              <AccordionItem key={type} value={type} className="border-border">
                <AccordionTrigger
                  className={cn(
                    'sticky top-0 z-10 px-4 py-2 border-b border-border hover:no-underline',
                    'transition-colors duration-150 cursor-pointer',
                    'hover:bg-muted/80 hover:text-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    ACCORDION_BG[type]
                  )}
                >
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {label} ({typeStreams.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0 pt-0">
                  <StreamTableHeader securityType={type} />
                  {typeStreams.map((stream) => (
                    <StreamRow key={stream.id} stream={stream} />
                  ))}
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
      <div className="pt-2">
        <StreamTableHeader />
        {streams.map((stream) => (
          <StreamRow key={stream.id} stream={stream} />
        ))}
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
