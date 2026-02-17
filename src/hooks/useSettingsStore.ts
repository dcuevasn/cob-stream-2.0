import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Column keys that can be toggled on/off in User Settings */
export type ToggleableColumn =
  | 'priceSource'
  | 'blvl'
  | 'bsiz'
  | 'bsp'
  | 'bid'
  | 'liveBid'
  | 'liveAsk'
  | 'ask'
  | 'asp'
  | 'asiz'
  | 'alvl'
  | 'unit';

/** Display metadata for each toggleable column */
export const COLUMN_DEFINITIONS: { key: ToggleableColumn; label: string; shortLabel: string }[] = [
  { key: 'priceSource', label: 'Price Source', shortLabel: 'Price Source' },
  { key: 'blvl', label: 'Bid Active Levels (BLVL)', shortLabel: 'BLVL' },
  { key: 'bsiz', label: 'Bid Best Level Size (BSIZ)', shortLabel: 'BSIZ' },
  { key: 'bsp', label: 'Bid Best Level Spread (BSP)', shortLabel: 'BSP' },
  { key: 'bid', label: 'Bid Best Level Yield (BID)', shortLabel: 'BID' },
  { key: 'liveBid', label: 'Live Bid', shortLabel: 'Live Bid' },
  { key: 'liveAsk', label: 'Live Ask', shortLabel: 'Live Ask' },
  { key: 'ask', label: 'Ask Best Level Yield (ASK)', shortLabel: 'ASK' },
  { key: 'asp', label: 'Ask Best Level Spread (ASP)', shortLabel: 'ASP' },
  { key: 'asiz', label: 'Ask Best Level Size (ASIZ)', shortLabel: 'ASIZ' },
  { key: 'alvl', label: 'Ask Active Levels (ALVL)', shortLabel: 'ALVL' },
  { key: 'unit', label: 'Unit', shortLabel: 'Unit' },
];

export type ColumnVisibility = Record<ToggleableColumn, boolean>;

const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  priceSource: true,
  blvl: true,
  bsiz: true,
  bsp: true,
  bid: true,
  liveBid: true,
  liveAsk: true,
  ask: true,
  asp: true,
  asiz: true,
  alvl: true,
  unit: true,
};

export interface AutoRelaunchSettings {
  autoRelaunchFFCH: boolean;
  autoRelaunchYieldCrossing: boolean;
}

const DEFAULT_AUTO_RELAUNCH: AutoRelaunchSettings = {
  autoRelaunchFFCH: false,
  autoRelaunchYieldCrossing: false,
};

interface SettingsStore {
  // Column visibility
  columnVisibility: ColumnVisibility;
  setColumnVisibility: (col: ToggleableColumn, visible: boolean) => void;
  toggleColumn: (col: ToggleableColumn) => void;
  resetColumnVisibility: () => void;
  showAllColumns: () => void;

  // Auto-relaunch behavior
  autoRelaunchSettings: AutoRelaunchSettings;
  setAutoRelaunch: (key: keyof AutoRelaunchSettings, value: boolean) => void;
  resetAutoRelaunchSettings: () => void;

  // Settings panel state
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      columnVisibility: { ...DEFAULT_COLUMN_VISIBILITY },
      setColumnVisibility: (col, visible) =>
        set((state) => ({
          columnVisibility: { ...state.columnVisibility, [col]: visible },
        })),
      toggleColumn: (col) =>
        set((state) => ({
          columnVisibility: {
            ...state.columnVisibility,
            [col]: !state.columnVisibility[col],
          },
        })),
      resetColumnVisibility: () =>
        set({ columnVisibility: { ...DEFAULT_COLUMN_VISIBILITY } }),
      showAllColumns: () =>
        set({ columnVisibility: { ...DEFAULT_COLUMN_VISIBILITY } }),

      autoRelaunchSettings: { ...DEFAULT_AUTO_RELAUNCH },
      setAutoRelaunch: (key, value) =>
        set((state) => ({
          autoRelaunchSettings: { ...state.autoRelaunchSettings, [key]: value },
        })),
      resetAutoRelaunchSettings: () =>
        set({ autoRelaunchSettings: { ...DEFAULT_AUTO_RELAUNCH } }),

      isSettingsOpen: false,
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
    }),
    {
      name: 'stream-scanner-settings',
      partialize: (state) => ({
        columnVisibility: state.columnVisibility,
        autoRelaunchSettings: state.autoRelaunchSettings,
      }),
    }
  )
);
