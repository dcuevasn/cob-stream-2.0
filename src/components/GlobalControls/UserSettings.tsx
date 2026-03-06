import { useState } from 'react';
import { Settings, Eye, EyeOff, ArrowLeft, AlertTriangle, ChevronRight, Columns3 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '../ui/sheet';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Button as DSCButton } from '../dsc/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import {
  useSettingsStore,
  COLUMN_DEFINITIONS,
  type ToggleableColumn,
} from '../../hooks/useSettingsStore';

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

  return (
    <>
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

      <Sheet open={isSettingsOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-[302px] sm:max-w-[302px] flex flex-col p-0"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}
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

function PreferencesView({ onNavigateToGeneral, onNavigateToColumns }: PreferencesViewProps) {
  return (
    <>
      <div
        className="flex items-center gap-4"
        style={{ borderBottom: '1px solid #333', paddingLeft: '16px', paddingRight: '8px', paddingTop: '10px', paddingBottom: '10px' }}
      >
        <SheetTitle style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', flex: 1, margin: 0 }}>
          Preferences
        </SheetTitle>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div style={{ borderBottom: '1px solid #333', padding: '0 4px 4px' }}>
          <NavItem
            icon={<Settings style={{ width: '16px', height: '16px', color: '#939393' }} />}
            label="General"
            onClick={onNavigateToGeneral}
          />
          <NavItem
            icon={<Columns3 style={{ width: '16px', height: '16px', color: '#939393' }} />}
            label="Column visibility"
            onClick={onNavigateToColumns}
          />
        </div>
      </div>

      <SettingsFooter />
    </>
  );
}

/* ─────────────────────────────────────────────
   View 2: General
   ───────────────────────────────────────────── */

interface GeneralViewProps {
  onBack: () => void;
  autoRelaunchSettings: {
    autoRelaunchFFCH: boolean;
    autoRelaunchYieldCrossing: boolean;
  };
  setAutoRelaunch: (key: 'autoRelaunchFFCH' | 'autoRelaunchYieldCrossing', value: boolean) => void;
}

function GeneralView({ onBack, autoRelaunchSettings, setAutoRelaunch }: GeneralViewProps) {
  return (
    <>
      <SubViewHeader title="Stream Scanner Settings" onBack={onBack} />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div style={{ borderBottom: '1px solid #333', padding: '16px' }}>
          <div className="flex flex-col gap-2">
            <h3 style={{ fontSize: '12px', fontWeight: 500, color: '#e4e5e9', lineHeight: '1.4', marginBottom: '4px' }}>
              Safety Relaunch Behavior
            </h3>

            <SettingRow
              id="ffch-switch"
              label="Auto-relaunch when Fat-Finger Check (FFCH) clears"
              description="Controls whether streams automatically relaunch when price returns within 100bps threshold."
              checked={autoRelaunchSettings.autoRelaunchFFCH}
              onCheckedChange={(v) => setAutoRelaunch('autoRelaunchFFCH', v)}
            />

            <SettingRow
              id="yield-crossing-switch"
              label="Auto-relaunch when yield crossing resolves"
              description="Controls whether streams automatically relaunch when bid/ask yields are valid."
              checked={autoRelaunchSettings.autoRelaunchYieldCrossing}
              onCheckedChange={(v) => setAutoRelaunch('autoRelaunchYieldCrossing', v)}
            />

            <div style={{ paddingTop: '12px' }}>
              <div
                className="flex items-start gap-2"
                style={{ borderRadius: '6px', border: '1px solid rgba(255,255,255,0.07)', backgroundColor: '#333', padding: '8px' }}
              >
                <AlertTriangle style={{ width: '14px', height: '14px', color: '#fbbf24', flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '11px', fontWeight: 400, color: '#ffffff', lineHeight: '1.5' }}>
                  User-initiated stops always require manual relaunch regardless of these settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
}

function ColumnVisibilityView({
  onBack,
  columnVisibility,
  toggleColumn,
  resetColumnVisibility,
  showAllColumns,
}: ColumnVisibilityViewProps) {
  const allVisible = Object.values(columnVisibility).every(Boolean);
  const [showAllHovered, setShowAllHovered] = useState(false);

  return (
    <>
      <SubViewHeader title="Column visibility" onBack={onBack} />

      {/* Show all row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 12px', borderBottom: '1px solid #333' }}>
        <button
          type="button"
          onMouseEnter={() => setShowAllHovered(true)}
          onMouseLeave={() => setShowAllHovered(false)}
          onClick={allVisible ? resetColumnVisibility : showAllColumns}
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: showAllHovered ? '#5ba0ff' : '#939393',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0',
            transition: 'color 0.12s',
          }}
        >
          Show all
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div style={{ display: 'flex', flexDirection: 'column', padding: '8px' }}>
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

      <SettingsFooter onReset={resetColumnVisibility} />
    </>
  );
}

/* ─────────────────────────────────────────────
   Shared Components
   ───────────────────────────────────────────── */

function SubViewHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-center gap-3"
      style={{ borderBottom: '1px solid #333', paddingLeft: '16px', paddingRight: '8px', paddingTop: '10px', paddingBottom: '10px' }}
    >
      <button
        type="button"
        onClick={onBack}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Back to preferences"
        style={{
          borderRadius: '4px',
          padding: '4px',
          marginLeft: '-4px',
          background: hovered ? '#262626' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.12s',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <ArrowLeft style={{ width: '14px', height: '14px', color: '#939393' }} />
      </button>
      <SheetTitle style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
        {title}
      </SheetTitle>
    </div>
  );
}

function NavItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '28px',
        paddingLeft: '12px',
        paddingRight: '4px',
        borderRadius: '4px',
        background: hovered ? '#262626' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon}
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#c9c9c9', lineHeight: '18px', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>
      <ChevronRight style={{ width: '14px', height: '14px', color: '#939393', flexShrink: 0 }} />
    </button>
  );
}

function SettingRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between w-full">
        <label htmlFor={id} style={{ cursor: 'pointer', paddingTop: '8px', paddingBottom: '8px', flex: 1 }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#939393', lineHeight: '1.4', display: 'block', maxWidth: '192px' }}>
            {label}
          </span>
        </label>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      </div>
      <p style={{ fontSize: '11px', fontWeight: 400, color: '#5d5d5d', lineHeight: '1.4' }}>
        {description}
      </p>
    </div>
  );
}

function SettingsFooter({ onReset }: { onReset?: () => void } = {}) {
  return (
    <div
      className="flex items-center justify-end gap-3"
      style={{ borderTop: '1px solid #333', padding: '10px 16px' }}
    >
      {onReset && (
        <DSCButton
          variant="ghost"
          size="sm"
          onClick={onReset}
          style={{ height: '24px', paddingLeft: '8px', paddingRight: '8px', fontSize: '12px' }}
        >
          Reset to default
        </DSCButton>
      )}
      <DSCButton
        variant="default"
        size="sm"
        style={{ height: '24px', paddingLeft: '8px', paddingRight: '8px', fontSize: '12px', backgroundColor: '#2680eb' }}
      >
        Apply
      </DSCButton>
    </div>
  );
}

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
  const [hovered, setHovered] = useState(false);
  const isToggleable = !alwaysOn && onToggle;

  return (
    <div
      onClick={isToggleable ? onToggle : undefined}
      onMouseEnter={() => isToggleable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '6px',
        paddingRight: '4px',
        height: '32px',
        borderRadius: '4px',
        cursor: isToggleable ? 'pointer' : 'default',
        backgroundColor: hovered ? '#262626' : 'transparent',
        transition: 'background 0.1s',
        opacity: !visible && !alwaysOn ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 500, color: visible || alwaysOn ? '#c9c9c9' : '#939393', lineHeight: '18px' }}>
        {label}
      </span>
      <div style={{ padding: '4px' }}>
        {visible || alwaysOn ? (
          <Eye style={{ width: '14px', height: '14px', color: '#939393' }} />
        ) : (
          <EyeOff style={{ width: '14px', height: '14px', color: '#5d5d5d' }} />
        )}
      </div>
    </div>
  );
}
