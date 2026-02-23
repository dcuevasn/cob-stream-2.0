import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useStreamStore } from '../../hooks/useStreamStore';
import { SECURITY_CATALOG, type SecurityCatalogItem } from '../../mocks/securityCatalog';
import type { SecurityType } from '../../types/streamSet';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../hooks/useMediaQuery';

type TypeFilter = SecurityType | 'All';

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'M Bono', label: 'M Bono' },
  { value: 'UDI Bono', label: 'UDI Bono' },
  { value: 'Cetes', label: 'Cetes' },
  { value: 'Corporate MXN', label: 'Corp MXN' },
  { value: 'Corporate UDI', label: 'Corp UDI' },
];

const TYPE_BADGE_STYLES: Record<SecurityType, string> = {
  'M Bono': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'UDI Bono': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Cetes': 'bg-green-500/15 text-green-400 border-green-500/30',
  'Corporate MXN': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Corporate UDI': 'bg-pink-500/15 text-pink-400 border-pink-500/30',
};

const TYPE_BADGE_LABELS: Record<SecurityType, string> = {
  'M Bono': 'M Bono',
  'UDI Bono': 'UDI Bono',
  'Cetes': 'Cetes',
  'Corporate MXN': 'Corp MXN',
  'Corporate UDI': 'Corp UDI',
};

export function AddSecurityDialog() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { streamSets, addSecuritiesBatch } = useStreamStore();
  const isCompact = useMediaQuery('(max-width: 540px)');

  // Set of ISINs already in the app (across ALL views, not just active tab)
  const addedIsins = useMemo(
    () => new Set(streamSets.map((ss) => ss.securityISIN)),
    [streamSets]
  );

  // Filter catalog by type and search query
  const filteredSecurities = useMemo(() => {
    let result = SECURITY_CATALOG;

    if (typeFilter !== 'All') {
      result = result.filter((s) => s.type === typeFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.alias.toLowerCase().includes(q) ||
          s.isin.toLowerCase().includes(q)
      );
    }

    return result;
  }, [search, typeFilter]);

  const availableCount = useMemo(
    () => filteredSecurities.filter((s) => !addedIsins.has(s.isin)).length,
    [filteredSecurities, addedIsins]
  );

  const alreadyAddedCount = useMemo(
    () => filteredSecurities.filter((s) => addedIsins.has(s.isin)).length,
    [filteredSecurities, addedIsins]
  );

  // The selected catalog items (for rendering preview chips + passing to store)
  const selectedItems = useMemo(
    () => SECURITY_CATALOG.filter((s) => selectedIds.has(s.id)),
    [selectedIds]
  );

  const handleToggle = useCallback((id: string, isDisabled: boolean) => {
    if (isDisabled) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleAddAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredSecurities.forEach((s) => {
        if (!addedIsins.has(s.isin)) next.add(s.id);
      });
      return next;
    });
  }, [filteredSecurities, addedIsins]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleRemoveChip = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const resetState = useCallback(() => {
    setSearch('');
    setTypeFilter('All');
    setSelectedIds(new Set());
  }, []);

  const handleAddSelection = useCallback(() => {
    if (selectedIds.size === 0) return;
    addSecuritiesBatch(selectedItems);
    setOpen(false);
    resetState();
  }, [selectedIds.size, selectedItems, addSecuritiesBatch, resetState]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    resetState();
  }, [resetState]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) handleCancel();
      else setOpen(true);
    },
    [handleCancel]
  );

  const resultsLabel = useMemo(() => {
    if (filteredSecurities.length === 0) return null;
    const parts: string[] = [`${filteredSecurities.length} ${filteredSecurities.length === 1 ? 'security' : 'securities'}`];
    if (alreadyAddedCount > 0) parts.push(`${alreadyAddedCount} already added`);
    return `Showing ${parts.join(' · ')}`;
  }, [filteredSecurities.length, alreadyAddedCount]);

  return (
    <>
      {/* Trigger button — same styling as original in Toolbar */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size={isCompact ? 'icon-sm' : 'sm'}
            onClick={() => setOpen(true)}
            className={cn('gap-1 shrink-0 px-3 w-fit h-7', isCompact && 'h-8 min-w-8')}
          >
            <Plus className="h-4 w-4" />
            {!isCompact && <span className="truncate max-w-[120px]">Add security</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add security</TooltipContent>
      </Tooltip>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          aria-label="Add Securities Dialog"
          className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle>Add Securities</DialogTitle>
            <DialogDescription>
              Search and select securities to add to your view
            </DialogDescription>
          </DialogHeader>

          {/* ── Section A: Search & Filters ──────────────────────────────── */}
          <div className="px-6 py-4 border-b border-border shrink-0 space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name, ISIN, or ticker..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 h-9"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Type filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {TYPE_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTypeFilter(value)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-md border transition-colors',
                    typeFilter === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Results count */}
            {resultsLabel && (
              <p className="text-xs text-muted-foreground">{resultsLabel}</p>
            )}
          </div>

          {/* ── Section B: Securities list ───────────────────────────────── */}
          <div className="flex-1 overflow-y-auto min-h-0" role="list" aria-label="Available securities">
            {filteredSecurities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                <Search className="h-8 w-8 opacity-30" />
                {search ? (
                  <>
                    <p className="text-sm">No securities found for &ldquo;{search}&rdquo;</p>
                    <p className="text-xs opacity-60">Try different search terms or clear the filter</p>
                  </>
                ) : (
                  <p className="text-sm">No securities available</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {filteredSecurities.map((security) => {
                  const isAlreadyAdded = addedIsins.has(security.isin);
                  const isSelected = selectedIds.has(security.id);
                  return (
                    <SecurityRow
                      key={security.id}
                      security={security}
                      isAlreadyAdded={isAlreadyAdded}
                      isSelected={isSelected}
                      onToggle={handleToggle}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Section C: Selected preview ──────────────────────────────── */}
          <div className="px-6 py-3 border-t border-border shrink-0 bg-muted/20 min-h-[48px]">
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium text-muted-foreground shrink-0 pt-0.5 min-w-[90px]">
                Selected ({selectedIds.size})
              </span>
              {selectedIds.size === 0 ? (
                <span className="text-xs text-muted-foreground/50 italic pt-0.5">
                  Select securities from the list above
                </span>
              ) : (
                <div className="flex flex-wrap gap-1.5 min-w-0">
                  {selectedItems.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-xs text-primary"
                    >
                      <span className="font-mono">{item.alias}</span>
                      <button
                        onClick={() => handleRemoveChip(item.id)}
                        className="hover:text-primary/60 transition-colors shrink-0"
                        aria-label={`Remove ${item.alias} from selection`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Section D: Footer actions ─────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
            {/* Left: Clear selection */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              disabled={selectedIds.size === 0}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              Clear selection
            </Button>

            {/* Right: Add All · Cancel · Add Selection */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddAll}
                disabled={availableCount === 0}
                className="h-8"
              >
                Add all
                {availableCount > 0 && (
                  <span className="ml-1 text-muted-foreground text-xs">({availableCount})</span>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8">
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleAddSelection}
                disabled={selectedIds.size === 0}
                className="h-8 min-w-[110px]"
              >
                {selectedIds.size > 0 ? `Add (${selectedIds.size})` : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── SecurityRow ──────────────────────────────────────────────────────────────

interface SecurityRowProps {
  security: SecurityCatalogItem;
  isAlreadyAdded: boolean;
  isSelected: boolean;
  onToggle: (id: string, isDisabled: boolean) => void;
}

function SecurityRow({ security, isAlreadyAdded, isSelected, onToggle }: SecurityRowProps) {
  return (
    <div
      role="listitem"
      onClick={() => onToggle(security.id, isAlreadyAdded)}
      title={isAlreadyAdded ? 'Already added to your view' : undefined}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 select-none transition-colors',
        isAlreadyAdded
          ? 'opacity-45 cursor-not-allowed'
          : isSelected
          ? 'bg-primary/8 cursor-pointer hover:bg-primary/12'
          : 'cursor-pointer hover:bg-muted/50'
      )}
    >
      {/* Checkbox indicator */}
      <div className="shrink-0 w-4 h-4 flex items-center justify-center">
        {isAlreadyAdded ? (
          <div className="w-4 h-4 rounded border border-muted-foreground/25 bg-muted/40" />
        ) : isSelected ? (
          <div className="w-4 h-4 rounded border-2 border-primary bg-primary flex items-center justify-center">
            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-none stroke-primary-foreground stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1.5,5 4,7.5 8.5,2.5" />
            </svg>
          </div>
        ) : (
          <div className="w-4 h-4 rounded border-2 border-muted-foreground/35 group-hover:border-primary/50 transition-colors" />
        )}
      </div>

      {/* Alias (short name) */}
      <span
        className={cn(
          'font-mono text-sm font-medium shrink-0 w-16',
          isAlreadyAdded ? 'text-muted-foreground' : 'text-foreground'
        )}
      >
        {security.alias}
      </span>

      {/* Full name */}
      <span
        className={cn(
          'text-sm flex-1 min-w-0 truncate',
          isAlreadyAdded ? 'text-muted-foreground/60' : 'text-muted-foreground'
        )}
      >
        {security.name}
      </span>

      {/* ISIN — hidden on small screens */}
      <span className="font-mono text-xs text-muted-foreground/50 shrink-0 hidden sm:block w-[108px] text-right">
        {security.isin}
      </span>

      {/* Type badge */}
      <span
        className={cn(
          'px-1.5 py-0.5 text-[10px] font-medium rounded border shrink-0 hidden xs:inline-block',
          TYPE_BADGE_STYLES[security.type]
        )}
      >
        {TYPE_BADGE_LABELS[security.type]}
      </span>

      {/* Already-added indicator */}
      {isAlreadyAdded && (
        <span className="px-1.5 py-0.5 text-[10px] rounded border border-muted-foreground/20 bg-muted/40 text-muted-foreground shrink-0">
          Added
        </span>
      )}
    </div>
  );
}
