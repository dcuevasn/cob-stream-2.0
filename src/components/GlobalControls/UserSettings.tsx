import { useState } from 'react';
import { Settings, Eye, EyeOff, ArrowLeft, AlertTriangle, ChevronRight, Columns3 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '../ui/sheet';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import {
  useSettingsStore,
  COLUMN_DEFINITIONS,
  type ToggleableColumn,
} from '../../hooks/useSettingsStore';
import { cn } from '../../lib/utils';

type SettingsView = 'preferences' | 'general' | 'columns';

export function UserSettings() {
  const {
    isSettingsOpen,
    setSettingsOpen,
    columnVisibility,
    toggleColumn,
    resetColumnVisibility,
    showAllColumns,
    autoRelaunchSettings,
    setAutoRelaunch,
  } = useSettingsStore();

  const [view, setView] = useState<SettingsView>('preferences');

  const handleOpenChange = (open: boolean) => {
    setSettingsOpen(open);
    if (!open) {
      setTimeout(() => setView('preferences'), 300);
    }
  };

  const allVisible = Object.values(columnVisibility).every(Boolean);

  return (
    <>
      {/* Settings trigger button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>User Settings</TooltipContent>
      </Tooltip>

      {/* Settings Sheet */}
      <Sheet open={isSettingsOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-[302px] sm:max-w-[302px] flex flex-col p-0"
        >
          {view === 'preferences' && (
            <PreferencesView
              onNavigateToGeneral={() => setView('general')}
              onNavigateToColumns={() => setView('columns')}
            />
          )}
          {view === 'general' && (
            <GeneralView
              onBack={() => setView('preferences')}
              autoRelaunchSettings={autoRelaunchSettings}
              setAutoRelaunch={setAutoRelaunch}
            />
          )}
          {view === 'columns' && (
            <ColumnVisibilityView
              onBack={() => setView('preferences')}
              columnVisibility={columnVisibility}
              toggleColumn={toggleColumn}
              resetColumnVisibility={resetColumnVisibility}
              showAllColumns={showAllColumns}
              allVisible={allVisible}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ─────────────────────────────────────────────
   View 1: Preferences (root navigation)
   ───────────────────────────────────────────── */

interface PreferencesViewProps {
  onNavigateToGeneral: () => void;
  onNavigateToColumns: () => void;
}

function PreferencesView({
  onNavigateToGeneral,
  onNavigateToColumns,
}: PreferencesViewProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[#333] pl-4 pr-2 py-3">
        <SheetTitle>Preferences</SheetTitle>
      </div>

      {/* Navigation menu */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="border-b border-[#333] px-1 py-3">
          {/* General */}
          <NavItem
            icon={<Settings className="h-5 w-5 text-[#939393]" />}
            label="General"
            onClick={onNavigateToGeneral}
          />

          {/* Column visibility */}
          <NavItem
            icon={<Columns3 className="h-5 w-5 text-[#939393]" />}
            label="Column visibility"
            onClick={onNavigateToColumns}
          />
        </div>
      </div>

      {/* Footer */}
      <SettingsFooter />
    </>
  );
}

/* ─────────────────────────────────────────────
   View 2: General (Safety Relaunch Behavior)
   ───────────────────────────────────────────── */

interface GeneralViewProps {
  onBack: () => void;
  autoRelaunchSettings: {
    autoRelaunchFFCH: boolean;
    autoRelaunchYieldCrossing: boolean;
  };
  setAutoRelaunch: (key: 'autoRelaunchFFCH' | 'autoRelaunchYieldCrossing', value: boolean) => void;
}

function GeneralView({
  onBack,
  autoRelaunchSettings,
  setAutoRelaunch,
}: GeneralViewProps) {
  return (
    <>
      {/* Header with back button */}
      <SubViewHeader title="Stream Scanner Settings" onBack={onBack} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Safety Relaunch Behavior Section */}
        <div className="border-b border-[#333] p-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-[#e4e5e9] leading-[1.4]">
              Safety Relaunch Behavior
            </h3>

            {/* FFCH Auto-Relaunch */}
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between w-full">
                <label
                  htmlFor="ffch-switch"
                  className="flex items-center py-2.5 cursor-pointer"
                >
                  <span className="text-xs font-medium text-[#939393] leading-[1.4] w-[192px]">
                    Auto-relaunch when Fat-Finger Check (FFCH) clears
                  </span>
                </label>
                <Switch
                  id="ffch-switch"
                  checked={autoRelaunchSettings.autoRelaunchFFCH}
                  onCheckedChange={(checked) =>
                    setAutoRelaunch('autoRelaunchFFCH', checked)
                  }
                />
              </div>
              <p className="text-xs font-medium text-[#5d5d5d] leading-[1.4]">
                Controls whether streams automatically relaunch when price
                returns within 100bps threshold.
              </p>
            </div>

            {/* Yield Crossing Auto-Relaunch */}
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between w-full">
                <label
                  htmlFor="yield-crossing-switch"
                  className="flex items-center py-2.5 cursor-pointer"
                >
                  <span className="text-xs font-medium text-[#939393] leading-[1.4] w-[192px]">
                    Auto-relaunch when yield crossing resolves
                  </span>
                </label>
                <Switch
                  id="yield-crossing-switch"
                  checked={autoRelaunchSettings.autoRelaunchYieldCrossing}
                  onCheckedChange={(checked) =>
                    setAutoRelaunch('autoRelaunchYieldCrossing', checked)
                  }
                />
              </div>
              <p className="text-xs font-medium text-[#5d5d5d] leading-[1.4]">
                Controls whether streams automatically relaunch when bid/ask
                yields are valid.
              </p>
            </div>

            {/* Info message bar */}
            <div className="pt-4">
              <div className="flex items-start gap-2 rounded-md border border-white/[0.07] bg-[#444] p-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="text-xs font-normal text-white leading-[1.4]">
                  User-initiated stops always require manual relaunch regardless
                  of these settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <SettingsFooter />
    </>
  );
}

/* ─────────────────────────────────────────────
   View 3: Column Visibility
   ───────────────────────────────────────────── */

interface ColumnVisibilityViewProps {
  onBack: () => void;
  columnVisibility: Record<ToggleableColumn, boolean>;
  toggleColumn: (col: ToggleableColumn) => void;
  resetColumnVisibility: () => void;
  showAllColumns: () => void;
  allVisible: boolean;
}

function ColumnVisibilityView({
  onBack,
  columnVisibility,
  toggleColumn,
  resetColumnVisibility,
  showAllColumns,
  allVisible,
}: ColumnVisibilityViewProps) {
  return (
    <>
      {/* Header with back button */}
      <SubViewHeader title="Column visibility" onBack={onBack} />

      {/* Show all toolbar */}
      <div className="flex items-center justify-end px-3 py-2">
        <button
          type="button"
          onClick={allVisible ? resetColumnVisibility : showAllColumns}
          className="text-xs font-medium text-[#7f66ff] hover:text-[#9580ff] transition-colors px-2 h-6"
        >
          Show all
        </button>
      </div>

      {/* Column list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin border-t border-[#333]">
        <div className="flex flex-col p-3">
          {/* Always-visible: Name */}
          <ColumnRow label="Name" visible alwaysOn />

          {/* Toggleable columns */}
          {COLUMN_DEFINITIONS.map((col) => (
            <ColumnRow
              key={col.key}
              label={col.label}
              visible={columnVisibility[col.key]}
              onToggle={() => toggleColumn(col.key)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <SettingsFooter onReset={resetColumnVisibility} />
    </>
  );
}

/* ─────────────────────────────────────────────
   Shared Components
   ───────────────────────────────────────────── */

/** Sub-view header with back arrow and title */
function SubViewHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-[#333] pl-4 pr-2 py-3">
      <button
        type="button"
        onClick={onBack}
        className="rounded-sm p-1.5 hover:bg-[#262626] transition-colors -ml-1.5"
        aria-label="Back to preferences"
      >
        <ArrowLeft className="h-4 w-4 text-[#939393]" />
      </button>
      <SheetTitle>{title}</SheetTitle>
    </div>
  );
}

/** Navigation item in the preferences root menu */
function NavItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-between w-full h-7 pl-3 pr-1 rounded',
        'hover:bg-[#262626] transition-colors group'
      )}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-[13px] font-medium text-[#c9c9c9] leading-[18px]">
          {label}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 text-[#939393] opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

/** Footer bar matching Figma design */
function SettingsFooter({ onReset }: { onReset?: () => void } = {}) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-[#333] overflow-clip px-4 py-3">
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium text-[#7f66ff] hover:text-[#9580ff] transition-colors px-2 h-6"
        >
          Reset to default
        </button>
      )}
      <Button
        size="sm"
        className="h-6 px-2 text-xs font-medium bg-[#2680eb] hover:bg-[#2680eb]/90 text-white"
      >
        Apply
      </Button>
    </div>
  );
}

/** Column visibility row with eye icon toggle */
function ColumnRow({
  label,
  visible,
  onToggle,
  alwaysOn,
}: {
  label: string;
  visible: boolean;
  onToggle?: () => void;
  alwaysOn?: boolean;
}) {
  const isToggleable = !alwaysOn && onToggle;

  return (
    <div
      className={cn(
        'flex items-center justify-between pl-1.5 h-8 rounded',
        isToggleable && 'cursor-pointer hover:bg-[#333]',
        !visible && !alwaysOn && 'opacity-50'
      )}
      onClick={isToggleable ? onToggle : undefined}
      role={isToggleable ? 'button' : undefined}
      tabIndex={isToggleable ? 0 : undefined}
      onKeyDown={
        isToggleable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle?.();
              }
            }
          : undefined
      }
    >
      <span
        className={cn(
          'text-[13px] font-medium leading-[18px]',
          visible || alwaysOn ? 'text-[#c9c9c9]' : 'text-[#939393]'
        )}
      >
        {label}
      </span>
      <div className="p-1.5">
        {visible || alwaysOn ? (
          <Eye className="h-4 w-4 text-[#939393]" />
        ) : (
          <EyeOff className="h-4 w-4 text-[#5d5d5d]" />
        )}
      </div>
    </div>
  );
}
