import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Button as DSCButton } from '../dsc/button';
import { Checkbox } from '../dsc/checkbox';
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

interface AddSecurityDialogProps {
  initialTypeFilter?: TypeFilter;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddSecurityDialog({ initialTypeFilter, open: controlledOpen, onOpenChange: controlledOnOpenChange }: AddSecurityDialogProps = {}) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (v: boolean) => controlledOnOpenChange?.(v)
    : setInternalOpen;
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialTypeFilter ?? 'All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const { streamSets, addSecuritiesBatch } = useStreamStore();
  const isCompact = useMediaQuery('(max-width: 540px)');

  const addedIsins = useMemo(
    () => new Set(streamSets.map((ss) => ss.securityISIN)),
    [streamSets]
  );

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

  const selectedItems = useMemo(
    () => SECURITY_CATALOG.filter((s) => selectedIds.has(s.id)),
    [selectedIds]
  );

  const handleToggle = useCallback((id: string, isDisabled: boolean) => {
    if (isDisabled) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleRemoveChip = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const resetState = useCallback(() => {
    setSearch('');
    setTypeFilter(initialTypeFilter ?? 'All');
    setSelectedIds(new Set());
  }, [initialTypeFilter]);

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
      {!isControlled && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size={isCompact ? 'icon-sm' : 'sm'}
              onClick={() => setOpen(true)}
              className={cn('gap-1 shrink-0 w-fit h-7', isCompact && 'h-8 min-w-8')}
              style={{ paddingLeft: '12px', paddingRight: '12px' }}
            >
              <Plus className="h-4 w-4" />
              {!isCompact && <span className="truncate max-w-[120px]">Add security</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add security</TooltipContent>
        </Tooltip>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          aria-label="Add Securities Dialog"
          className="max-w-3xl max-h-[85vh] flex flex-col gap-0 overflow-hidden"
          style={{ padding: 0 }}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <DialogHeader
            className="shrink-0 border-b border-border/50"
            style={{ paddingLeft: '20px', paddingRight: '20px', paddingTop: '14px', paddingBottom: '12px' }}
          >
            <DialogTitle className="text-[13px] font-semibold text-[#fafafa]">
              Add Securities
            </DialogTitle>
            <DialogDescription className="text-[11px] text-[#a1a1a1]">
              Search and select securities to add to your view
            </DialogDescription>
          </DialogHeader>

          {/* ── Search & Filters ─────────────────────────────────────────── */}
          <div
            className="shrink-0 border-b border-border/50"
            style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {/* DSC search input */}
            <div className="relative">
              <Search
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: '10px', width: '12px', height: '12px', color: '#a1a1a1' }}
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search by name, ISIN, or ticker..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setSearch(''); searchRef.current?.blur(); } }}
                autoFocus
                style={{
                  width: '100%',
                  height: '32px',
                  backgroundColor: '#262626',
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  borderColor: isFocused ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)',
                  borderRadius: '0.3rem',
                  paddingLeft: '30px',
                  paddingRight: search ? '30px' : '10px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#fafafa',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                className="placeholder:text-[#555]"
                aria-label="Search securities"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                  className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center text-[#a1a1a1] hover:text-[#fafafa] transition-colors"
                  style={{ right: '8px', width: '16px', height: '16px' }}
                  aria-label="Clear search"
                >
                  <X style={{ width: '10px', height: '10px' }} />
                </button>
              )}
            </div>

            {/* Type filter pills */}
            <div className="flex items-center gap-[6px] flex-wrap">
              {TYPE_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTypeFilter(value)}
                  style={{
                    paddingLeft: '8px',
                    paddingRight: '8px',
                    paddingTop: '2px',
                    paddingBottom: '2px',
                    fontSize: '10px',
                    fontWeight: 500,
                    borderRadius: '0.3rem',
                    borderWidth: '1.5px',
                    borderStyle: 'solid',
                    borderColor: typeFilter === value ? 'transparent' : 'rgba(255,255,255,0.1)',
                    backgroundColor: typeFilter === value ? '#2b7fff' : '#262626',
                    color: typeFilter === value ? '#fafafa' : '#a1a1a1',
                    transition: 'background-color 0.1s, color 0.1s',
                    cursor: 'pointer',
                  }}
                  className="hover:text-[#fafafa]"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Results count */}
            {resultsLabel && (
              <p style={{ fontSize: '10px', color: '#6b7280', margin: 0 }}>{resultsLabel}</p>
            )}
          </div>

          {/* ── Securities list ──────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto min-h-0" role="list" aria-label="Available securities">
            {filteredSecurities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: '#6b7280' }}>
                <Search style={{ width: '28px', height: '28px', opacity: 0.3 }} />
                {search ? (
                  <>
                    <p style={{ fontSize: '12px' }}>No securities found for &ldquo;{search}&rdquo;</p>
                    <p style={{ fontSize: '11px', opacity: 0.6 }}>Try different search terms or clear the filter</p>
                  </>
                ) : (
                  <p style={{ fontSize: '12px' }}>No securities available</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {filteredSecurities.map((security) => (
                  <SecurityRow
                    key={security.id}
                    security={security}
                    isAlreadyAdded={addedIsins.has(security.isin)}
                    isSelected={selectedIds.has(security.id)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Selected preview ─────────────────────────────────────────── */}
          <div
            className="shrink-0 border-t border-border/50 bg-muted/10"
            style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', minHeight: '40px' }}
          >
            <div className="flex items-start gap-[8px]">
              <span
                className="shrink-0"
                style={{ fontSize: '11px', fontWeight: 500, color: '#a1a1a1', paddingTop: '2px', minWidth: '80px' }}
              >
                Selected ({selectedIds.size})
              </span>
              {selectedIds.size === 0 ? (
                <span style={{ fontSize: '11px', color: '#444', fontStyle: 'italic', paddingTop: '2px' }}>
                  Select securities from the list above
                </span>
              ) : (
                <div className="flex flex-wrap gap-[4px] min-w-0">
                  {selectedItems.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-[4px]"
                      style={{
                        paddingLeft: '6px',
                        paddingRight: '4px',
                        paddingTop: '2px',
                        paddingBottom: '2px',
                        borderRadius: '0.3rem',
                        backgroundColor: 'rgba(43,127,255,0.12)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(43,127,255,0.25)',
                        fontSize: '10px',
                        fontWeight: 500,
                        color: '#6ba5ff',
                        fontFamily: 'monospace',
                      }}
                    >
                      {item.alias}
                      <button
                        onClick={() => handleRemoveChip(item.id)}
                        className="flex items-center justify-center text-[#6ba5ff] hover:text-[#fafafa] transition-colors shrink-0"
                        style={{ width: '12px', height: '12px' }}
                        aria-label={`Remove ${item.alias} from selection`}
                      >
                        <X style={{ width: '9px', height: '9px' }} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <div
            className="shrink-0 border-t border-border/50 flex items-center justify-between gap-2"
            style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}
          >
            <DSCButton
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              disabled={selectedIds.size === 0}
              style={{ paddingLeft: '8px', paddingRight: '8px' }}
            >
              Clear selection
            </DSCButton>

            <div className="flex items-center gap-[6px]">
              <DSCButton
                variant="outline"
                size="sm"
                onClick={handleAddAll}
                disabled={availableCount === 0}
                style={{ paddingLeft: '10px', paddingRight: '10px' }}
              >
                Add all ({availableCount})
              </DSCButton>
              <DSCButton
                variant="secondary"
                size="sm"
                onClick={handleCancel}
                style={{ paddingLeft: '10px', paddingRight: '10px' }}
              >
                Cancel
              </DSCButton>
              <DSCButton
                variant="default"
                size="sm"
                onClick={handleAddSelection}
                disabled={selectedIds.size === 0}
                style={{ paddingLeft: '12px', paddingRight: '12px', minWidth: '80px' }}
              >
                {selectedIds.size > 0 ? `Add (${selectedIds.size})` : 'Add'}
              </DSCButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── SecurityRow ───────────────────────────────────────────────────────────────

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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingTop: '7px',
        paddingBottom: '7px',
        cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
        opacity: isAlreadyAdded ? 0.55 : 1,
        backgroundColor: isSelected ? 'rgba(43,127,255,0.07)' : 'transparent',
        transition: 'background-color 0.1s',
        userSelect: 'none',
      }}
      className={cn(!isAlreadyAdded && !isSelected && 'hover:bg-white/[0.03]')}
    >
      {/* DSC Checkbox */}
      <Checkbox
        checked={isSelected}
        disabled={isAlreadyAdded}
        onCheckedChange={() => onToggle(security.id, isAlreadyAdded)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${security.alias}`}
      />

      {/* Alias */}
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          fontWeight: 600,
          width: '64px',
          flexShrink: 0,
          color: '#fafafa',
        }}
      >
        {security.alias}
      </span>

      {/* Full name */}
      <span
        style={{
          fontSize: '11px',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: '#a1a1a1',
        }}
      >
        {security.name}
      </span>

      {/* ISIN */}
      <span
        className="hidden sm:block shrink-0 text-right"
        style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280', width: '108px' }}
      >
        {security.isin}
      </span>

      {/* Type badge */}
      <span
        className={cn('px-1.5 py-0.5 rounded border shrink-0 hidden xs:inline-block', TYPE_BADGE_STYLES[security.type])}
        style={{ fontSize: '10px', fontWeight: 500 }}
      >
        {TYPE_BADGE_LABELS[security.type]}
      </span>

    </div>
  );
}
