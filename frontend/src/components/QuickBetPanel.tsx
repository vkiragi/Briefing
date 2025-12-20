import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';
import { ParlayLeg } from '../types';

interface QuickBetPanelProps {
  isOpen: boolean;
  player: {
    name: string;
    team: string;
    jersey?: string;
    position?: string;
  };
  market: string;
  marketLabel: string;
  currentValue: string | number;
  eventId: string;
  sport: string;
  matchup: string;
  onAddToParlay: (leg: ParlayLeg) => void;
  onClose: () => void;
}

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
};

export const QuickBetPanel: React.FC<QuickBetPanelProps> = ({
  isOpen,
  player,
  market,
  marketLabel,
  currentValue,
  eventId,
  sport,
  matchup,
  onAddToParlay,
  onClose,
}) => {
  // Parse current value and set default line
  const numericValue = typeof currentValue === 'number'
    ? currentValue
    : parseFloat(String(currentValue)) || 0;

  const [line, setLine] = useState<number>(numericValue + 0.5);
  const [side, setSide] = useState<'over' | 'under'>('over');
  const [odds, setOdds] = useState<string>('-110');

  // Reset line when player/market changes
  useEffect(() => {
    setLine(numericValue + 0.5);
    setSide('over');
    setOdds('-110');
  }, [numericValue, player.name, market]);

  const adjustLine = (delta: number) => {
    setLine(prev => Math.max(0, +(prev + delta).toFixed(1)));
  };

  const handleAddToParlay = () => {
    const parsedOdds = parseFloat(odds) || -110;

    const leg: ParlayLeg = {
      sport,
      matchup,
      selection: `${player.name} ${side === 'over' ? 'Over' : 'Under'} ${line} ${marketLabel}`,
      odds: parsedOdds,
      event_id: eventId,
      player_name: player.name,
      team_name: player.team,
      market_type: market,
      line,
      side,
    };

    onAddToParlay(leg);
    onClose();
  };

  const displayLabel = MARKET_LABELS[market] || marketLabel;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[60]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] p-4 pb-safe"
          >
            <Card className="p-4 max-w-lg mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white text-lg">
                    {player.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {player.team} • {displayLabel}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Current Value Display */}
              <div className="bg-background rounded-lg p-3 mb-4 text-center">
                <span className="text-sm text-gray-400">Current: </span>
                <span className="text-lg font-bold text-accent">
                  {currentValue} {displayLabel}
                </span>
              </div>

              {/* Line Input */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Line</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjustLine(-0.5)}
                    className="p-3 bg-background hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Minus size={18} className="text-gray-300" />
                  </button>
                  <input
                    type="number"
                    value={line}
                    onChange={(e) => setLine(parseFloat(e.target.value) || 0)}
                    step="0.5"
                    className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-center text-xl font-bold text-white focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => adjustLine(0.5)}
                    className="p-3 bg-background hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Plus size={18} className="text-gray-300" />
                  </button>
                </div>
              </div>

              {/* Over/Under Toggle */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Pick</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSide('over')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors",
                      side === 'over'
                        ? "bg-green-500/20 text-green-400 border-2 border-green-500"
                        : "bg-background text-gray-400 border border-border hover:border-gray-600"
                    )}
                  >
                    <ChevronUp size={18} />
                    Over {line}
                  </button>
                  <button
                    onClick={() => setSide('under')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors",
                      side === 'under'
                        ? "bg-red-500/20 text-red-400 border-2 border-red-500"
                        : "bg-background text-gray-400 border border-border hover:border-gray-600"
                    )}
                  >
                    <ChevronDown size={18} />
                    Under {line}
                  </button>
                </div>
              </div>

              {/* Odds Input */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Odds (American)</label>
                <input
                  type="text"
                  value={odds}
                  onChange={(e) => setOdds(e.target.value)}
                  placeholder="-110"
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent"
                />
              </div>

              {/* Add to Parlay Button */}
              <button
                onClick={handleAddToParlay}
                className="w-full py-4 bg-accent text-background font-semibold rounded-lg hover:bg-accent/90 transition-colors"
              >
                Add to Parlay
              </button>

              {/* Selection Preview */}
              <p className="text-center text-sm text-gray-500 mt-3">
                {player.name} {side === 'over' ? 'Over' : 'Under'} {line} {displayLabel}
              </p>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
