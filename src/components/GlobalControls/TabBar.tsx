import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
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
  const { activeTab, setActiveTab, streamSets } = useStreamStore();

  const getCount = (type: SecurityType | 'All') => {
    if (type === 'All') return streamSets.length;
    return streamSets.filter((s) => s.securityType === type).length;
  };

  return (
    <div className="px-4 py-2 border-b border-border bg-muted/30">
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
    </div>
  );
}
