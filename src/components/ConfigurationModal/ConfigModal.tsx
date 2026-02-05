import { useState, useEffect } from 'react';
import type { StreamSet, Level } from '../../types/streamSet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { QUOTE_FEEDS } from '../../mocks/mockData';
import { useStreamStore } from '../../hooks/useStreamStore';
import { cn } from '../../lib/utils';

interface ConfigModalProps {
  stream: StreamSet | null;
  open: boolean;
  onClose: () => void;
}

export function ConfigModal({ stream, open, onClose }: ConfigModalProps) {
  const { updateStreamSet, launchStream } = useStreamStore();

  const [levels, setLevels] = useState(5);
  const [priceMode, setPriceMode] = useState<'quantity' | 'notional' | 'amount'>('quantity');
  const [quoteFeedId, setQuoteFeedId] = useState('qf-bankf-stg1');
  const [bidMatrix, setBidMatrix] = useState<Level[]>([]);
  const [askMatrix, setAskMatrix] = useState<Level[]>([]);

  useEffect(() => {
    if (stream) {
      setLevels(stream.levels);
      setPriceMode(stream.priceMode);
      setQuoteFeedId(stream.quoteFeedId || 'qf-bankf-stg1');
      setBidMatrix([...stream.bid.spreadMatrix]);
      setAskMatrix([...stream.ask.spreadMatrix]);
    }
  }, [stream]);

  if (!stream) return null;

  const handleSave = () => {
    const feed = QUOTE_FEEDS.find(f => f.id === quoteFeedId);
    updateStreamSet(stream.id, {
      levels,
      priceMode,
      quoteFeedId,
      quoteFeedName: feed?.name,
      state: 'staging',
      bid: {
        ...stream.bid,
        spreadMatrix: bidMatrix,
        levelsToLaunch: levels,
      },
      ask: {
        ...stream.ask,
        spreadMatrix: askMatrix,
        levelsToLaunch: levels,
      },
    });
    onClose();
  };

  const handleSaveAndLaunch = () => {
    handleSave();
    setTimeout(() => launchStream(stream.id), 100);
  };

  const updateBidLevel = (index: number, field: keyof Level, value: number) => {
    const newMatrix = [...bidMatrix];
    newMatrix[index] = { ...newMatrix[index], [field]: value };
    setBidMatrix(newMatrix);
  };

  const updateAskLevel = (index: number, field: keyof Level, value: number) => {
    const newMatrix = [...askMatrix];
    newMatrix[index] = { ...newMatrix[index], [field]: value };
    setAskMatrix(newMatrix);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Stream Set: {stream.securityName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* General Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">General Settings</h4>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Number of Levels</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Button
                      key={n}
                      variant={levels === n ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLevels(n)}
                      className="w-8 h-8"
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Price Mode</label>
                <Select value={priceMode} onValueChange={(v) => setPriceMode(v as typeof priceMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quantity">Quantity</SelectItem>
                    <SelectItem value="notional">Notional</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Quote Feed</label>
                <Select value={quoteFeedId} onValueChange={setQuoteFeedId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUOTE_FEEDS.map((feed) => (
                      <SelectItem key={feed.id} value={feed.id}>
                        {feed.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Spread Matrix */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Spread Matrix</h4>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Level</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-green-400">Bid Delta (bps)</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-green-400">Bid Qty</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-red-400">Ask Delta (bps)</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-red-400">Ask Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: levels }).map((_, i) => (
                    <tr key={i} className={cn(i % 2 === 0 && 'bg-muted/20')}>
                      <td className="px-3 py-2 text-muted-foreground">Level {i + 1}</td>
                      <td className="px-3 py-1">
                        <Input
                          type="number"
                          step="0.5"
                          value={bidMatrix[i]?.deltaBps || 0}
                          onChange={(e) => updateBidLevel(i, 'deltaBps', parseFloat(e.target.value))}
                          className="h-8 text-center"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <Input
                          type="number"
                          value={bidMatrix[i]?.quantity || 1000}
                          onChange={(e) => updateBidLevel(i, 'quantity', parseInt(e.target.value))}
                          className="h-8 text-center"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <Input
                          type="number"
                          step="0.5"
                          value={askMatrix[i]?.deltaBps || 0}
                          onChange={(e) => updateAskLevel(i, 'deltaBps', parseFloat(e.target.value))}
                          className="h-8 text-center"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <Input
                          type="number"
                          value={askMatrix[i]?.quantity || 1000}
                          onChange={(e) => updateAskLevel(i, 'quantity', parseInt(e.target.value))}
                          className="h-8 text-center"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSave}>
            Save
          </Button>
          <Button variant="success" onClick={handleSaveAndLaunch}>
            Save & Launch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
