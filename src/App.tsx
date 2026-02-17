import { useEffect } from 'react';
import { TooltipProvider } from './components/ui/tooltip';
import { Toolbar, TabBar } from './components/GlobalControls';
import { StreamTable } from './components/StreamTable';
import { startPriceSimulation, stopPriceSimulation } from './hooks/useStreamStore';

function App() {
  useEffect(() => {
    startPriceSimulation();
    return () => stopPriceSimulation();
  }, []);

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">COB Stream 2.0</h1>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Prototype
              </span>
            </div>
          </div>
        </header>

        {/* Toolbar */}
        <Toolbar />

        {/* Tab Bar */}
        <TabBar />

        {/* Main Content - Stream Table */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <StreamTable />
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>COB Stream 2.0 - Frontend Prototype</span>
            <span>Version 1.0.0 • Data simulated</span>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

export default App;
