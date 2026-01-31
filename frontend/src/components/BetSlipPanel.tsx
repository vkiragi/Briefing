import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ChevronUp, ChevronDown, Trash2, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';
import { useBets } from '../context/BetContext';
import { BetSelection } from './GameDetailModal';
import { ParlayLeg } from '../types';

// Market type to display name mapping
const MARKET_LABELS: Record<string, string> = {
  points: 'Points',
  rebounds: 'Rebounds',
  assists: 'Assists',
  threes: '3-Pointers Made',
  blocks: 'Blocks',
  steals: 'Steals',
  passing_yards: 'Passing Yards',
  passing_tds: 'Passing TDs',
  rushing_yards: 'Rushing Yards',
  rushing_tds: 'Rushing TDs',
  receiving_yards: 'Receiving Yards',
  receptions: 'Receptions',
  hits: 'Hits',
  rbis: 'RBIs',
  runs: 'Runs',
  strikeouts: 'Strikeouts',
  moneyline: 'Moneyline',
};

interface BetSlipPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selections: BetSelection[];
  onUpdateSelection: (id: string, updates: Partial<BetSelection>) => void;
  onRemoveSelection: (id: string) => void;
  onClearAll: () => void;
  eventId: string;
  sport: string;
  matchup: string;
  onComplete: () => void;
}

type SubmitMode = 'new_parlay' | 'add_to_existing';

export const BetSlipPanel: React.FC<BetSlipPanelProps> = ({
  isOpen,
  onClose,
  selections,
  onUpdateSelection,
  onRemoveSelection,
  onClearAll,
  eventId,
  sport,
  matchup,
  onComplete,
}) => {
  const { addParlayLeg, parlayBuilder, clearParlayBuilder } = useBets();
  const [submitMode, setSubmitMode] = useState<SubmitMode>(
    parlayBuilder.isActive ? 'add_to_existing' : 'new_parlay'
  );

  const hasExistingParlay = parlayBuilder.isActive && parlayBuilder.legs.length > 0;

  // Lock body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const adjustLine = (id: string, currentLine: number, delta: number) => {
    onUpdateSelection(id, { line: Math.max(0, +(currentLine + delta).toFixed(1)) });
  };

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);

    // If starting a new parlay and there's an existing one, clear it first
    if (submitMode === 'new_parlay' && hasExistingParlay) {
      clearParlayBuilder();
    }

    // Convert selections to ParlayLegs and add them
    for (const selection of selections) {
      const displayLabel = MARKET_LABELS[selection.market] || selection.marketLabel;

      // Handle moneyline bets differently
      if (selection.isMoneyline) {
        const leg: ParlayLeg = {
          sport,
          matchup,
          selection: `${selection.teamName} ML`,
          odds: selection.odds || -110,
          event_id: eventId,
          player_name: undefined,
          team_name: selection.teamName,
          market_type: 'moneyline',
          line: undefined,
          side: undefined,
        };
        const result = addParlayLeg(leg);
        if (!result.success) {
          setError(result.error || 'Failed to add leg');
          return;
        }
      } else {
        const leg: ParlayLeg = {
          sport,
          matchup,
          selection: `${selection.player.name} ${selection.side === 'over' ? 'Over' : 'Under'} ${selection.line} ${displayLabel}`,
          odds: selection.odds || -110,
          event_id: eventId,
          player_name: selection.player.name,
          team_name: selection.teamName,
          market_type: selection.market,
          line: selection.line || 0,
          side: selection.side || 'over',
        };
        const result = addParlayLeg(leg);
        if (!result.success) {
          setError(result.error || 'Failed to add leg');
          return;
        }
      }
    }
    onComplete();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[90]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[100] max-h-[85vh] overflow-hidden flex justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="rounded-b-none overflow-hidden w-full max-w-2xl" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border" style={{ flexShrink: 0 }}>
                <div className="flex items-center gap-3">
                  <Ticket size={20} className="text-accent" />
                  <div>
                    <h3 className="font-semibold text-white text-lg">
                      Bet Slip
                    </h3>
                    <p className="text-xs text-gray-400">
                      {selections.length} selection{selections.length !== 1 ? 's' : ''} from {matchup}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Selections List */}
              <div className="p-5 space-y-4" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {selections.map((selection) => {
                  const displayLabel = MARKET_LABELS[selection.market] || selection.marketLabel;
                  const isMoneyline = selection.isMoneyline;

                  return (
                    <div
                      key={selection.id}
                      className="bg-background rounded-xl p-4 border border-border"
                    >
                      {/* Player/Team & Market Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          {isMoneyline ? (
                            <>
                              <div className="flex items-center gap-2">
                                {selection.teamLogo && (
                                  <img src={selection.teamLogo} alt="" className="w-8 h-8 object-contain" />
                                )}
                                <div>
                                  <div className="font-semibold text-white text-base truncate">
                                    {selection.teamName}
                                  </div>
                                  <div className="text-sm text-accent mt-0.5">
                                    Moneyline
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-semibold text-white text-base truncate">
                                {selection.player.name}
                              </div>
                              <div className="text-sm text-gray-400 truncate mt-0.5">
                                {selection.teamName} • {displayLabel}
                              </div>
                              <div className="text-sm text-accent mt-1">
                                Current: {selection.currentValue}
                              </div>
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => onRemoveSelection(selection.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors ml-3"
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </div>

                      {/* Controls Row - different for moneyline vs prop */}
                      {isMoneyline ? (
                        <div className="flex items-end gap-4">
                          {/* Odds Input only for moneyline */}
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1.5">Odds</label>
                            <input
                              type="number"
                              value={selection.odds || -110}
                              onChange={(e) => onUpdateSelection(selection.id, { odds: parseInt(e.target.value) || -110 })}
                              onFocus={(e) => e.target.select()}
                              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-center text-sm font-medium text-white focus:outline-none focus:border-accent"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-end gap-4">
                          {/* Line Input */}
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1.5">Line</label>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => adjustLine(selection.id, selection.line || 0, -0.5)}
                                className="p-2 bg-card hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <Minus size={14} className="text-gray-300" />
                              </button>
                              <input
                                type="number"
                                value={selection.line || 0}
                                onChange={(e) => onUpdateSelection(selection.id, { line: parseFloat(e.target.value) || 0 })}
                                onFocus={(e) => e.target.select()}
                                step="0.5"
                                className="w-20 bg-card border border-border rounded-lg px-2 py-2 text-center text-sm font-bold text-white focus:outline-none focus:border-accent"
                              />
                              <button
                                onClick={() => adjustLine(selection.id, selection.line || 0, 0.5)}
                                className="p-2 bg-card hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <Plus size={14} className="text-gray-300" />
                              </button>
                            </div>
                          </div>

                          {/* Over/Under Toggle */}
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1.5">Pick</label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => onUpdateSelection(selection.id, { side: 'over' })}
                                className={cn(
                                  "flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1",
                                  selection.side === 'over'
                                    ? "bg-green-500/20 text-green-400 border border-green-500"
                                    : "bg-card text-gray-400 border border-border hover:border-gray-600"
                                )}
                              >
                                <ChevronUp size={14} />
                                Over
                              </button>
                              <button
                                onClick={() => onUpdateSelection(selection.id, { side: 'under' })}
                                className={cn(
                                  "flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1",
                                  selection.side === 'under'
                                    ? "bg-red-500/20 text-red-400 border border-red-500"
                                    : "bg-card text-gray-400 border border-border hover:border-gray-600"
                                )}
                              >
                                <ChevronDown size={14} />
                                Under
                              </button>
                            </div>
                          </div>

                          {/* Odds Input */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1.5">Odds</label>
                            <input
                              type="number"
                              value={selection.odds || -110}
                              onChange={(e) => onUpdateSelection(selection.id, { odds: parseInt(e.target.value) || -110 })}
                              onFocus={(e) => e.target.select()}
                              className="w-20 bg-card border border-border rounded-lg px-2 py-2 text-center text-sm font-medium text-white focus:outline-none focus:border-accent"
                            />
                          </div>
                        </div>
                      )}

                      {/* Selection Preview */}
                      <div className="mt-4 text-center text-sm text-gray-500 bg-card/50 rounded-lg py-2">
                        {isMoneyline
                          ? `${selection.teamName} ML`
                          : `${selection.player.name} ${selection.side === 'over' ? 'Over' : 'Under'} ${selection.line} ${displayLabel}`
                        }
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-border space-y-3" style={{ flexShrink: 0 }}>
                {/* Submit Mode Selection */}
                {hasExistingParlay && (
                  <div className="flex gap-3 mb-3">
                    <button
                      onClick={() => setSubmitMode('add_to_existing')}
                      className={cn(
                        "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border",
                        submitMode === 'add_to_existing'
                          ? "bg-accent/20 text-accent border-accent"
                          : "bg-card text-gray-400 border-border hover:border-gray-600"
                      )}
                    >
                      Add to existing ({parlayBuilder.legs.length})
                    </button>
                    <button
                      onClick={() => setSubmitMode('new_parlay')}
                      className={cn(
                        "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border",
                        submitMode === 'new_parlay'
                          ? "bg-accent/20 text-accent border-accent"
                          : "bg-card text-gray-400 border-border hover:border-gray-600"
                      )}
                    >
                      New parlay
                    </button>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClearAll}
                    className="px-6 py-3 bg-background border border-border text-gray-400 text-sm font-medium rounded-lg hover:text-white hover:border-gray-600 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 py-3 bg-accent text-background text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Add {selections.length} to Parlay
                  </button>
                </div>

                {/* Info text */}
                <p className="text-center text-xs text-gray-500 pt-1">
                  {hasExistingParlay && submitMode === 'add_to_existing'
                    ? `Adding to your ${parlayBuilder.legs.length}-leg parlay`
                    : 'Starting a new parlay'}
                </p>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
