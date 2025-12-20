import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Ticket, Trash2, Loader2, Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { useBets } from '../context/BetContext';

// Format American odds with + or - prefix
const formatOdds = (odds: number): string => {
  if (odds >= 0) return `+${odds}`;
  return `${odds}`;
};

export const ParlayBuilderFAB: React.FC = () => {
  const { parlayBuilder, removeParlayLeg, clearParlayBuilder, addBet } = useBets();
  const [isExpanded, setIsExpanded] = useState(false);
  const [stake, setStake] = useState<string>('');
  const [payout, setPayout] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Don't render if no legs
  if (!parlayBuilder.isActive || parlayBuilder.legs.length === 0) {
    return null;
  }

  const { legs } = parlayBuilder;
  const stakeNum = parseFloat(stake) || 0;
  const payoutNum = parseFloat(payout) || 0;

  const handlePlaceBet = async () => {
    if (legs.length < 2 || stakeNum <= 0 || payoutNum <= 0) return;

    // Calculate American odds from stake and payout
    // payout = stake + winnings, so winnings = payout - stake
    // For positive odds: winnings = stake * (odds / 100), so odds = (winnings / stake) * 100
    const winnings = payoutNum - stakeNum;
    const calculatedOdds = Math.round((winnings / stakeNum) * 100);

    setIsSubmitting(true);
    try {
      // Build the parlay selection string
      const selectionSummary = legs.map(l => l.selection).join(' | ');

      // Get sport from first leg (or 'multi' if mixed)
      const sports = [...new Set(legs.map(l => l.sport))];
      const sport = sports.length === 1 ? sports[0] : 'multi';

      // Get matchup from first leg
      const matchup = legs.length === 1 ? legs[0].matchup : `${legs.length}-Leg Parlay`;

      await addBet({
        sport,
        type: 'Parlay',
        matchup,
        selection: selectionSummary,
        odds: calculatedOdds,
        stake: Math.round(stakeNum * 100) / 100,
        date: new Date().toISOString(),
        potentialPayout: Math.round(payoutNum * 100) / 100,
        legs: legs.map(l => ({
          sport: l.sport,
          matchup: l.matchup,
          selection: l.selection,
          odds: l.odds,
          event_id: l.event_id,
          player_name: l.player_name,
          team_name: l.team_name,
          market_type: l.market_type,
          line: l.line,
          side: l.side,
          is_combined: l.is_combined,
          combined_players: l.combined_players,
        })),
      });

      // Show success state
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsExpanded(false);
        clearParlayBuilder();
        setStake('');
        setPayout('');
      }, 1500);
    } catch (error) {
      console.error('Failed to place bet:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB and expanded panel */}
      <div className="fixed bottom-20 right-4 z-50">
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <Card className="w-80 p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Ticket size={18} className="text-accent" />
                    <span className="font-semibold text-white">
                      Parlay ({legs.length} {legs.length === 1 ? 'leg' : 'legs'})
                    </span>
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronDown size={18} className="text-gray-400" />
                  </button>
                </div>

                {/* Legs list */}
                <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
                  {legs.map((leg, index) => (
                    <div
                      key={index}
                      className="bg-background rounded-lg p-3 flex items-start justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        {leg.is_combined && (
                          <div className="flex items-center gap-1 mb-1">
                            <Users size={12} className="text-accent" />
                            <span className="text-xs text-accent">Combined</span>
                          </div>
                        )}
                        <div className="text-sm font-medium text-white truncate">
                          {leg.selection}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {leg.matchup}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-medium text-accent">
                          {formatOdds(leg.odds)}
                        </span>
                        <button
                          onClick={() => removeParlayLeg(index)}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stake & Payout Inputs */}
                <div className="mb-3 space-y-3">
                  {/* Stake Input */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Stake</label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">$</span>
                      <input
                        type="number"
                        value={stake}
                        onChange={(e) => setStake(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        min="0"
                        step="5"
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                        placeholder="Enter stake"
                      />
                    </div>
                  </div>

                  {/* Payout Input */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Payout</label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">$</span>
                      <input
                        type="number"
                        value={payout}
                        onChange={(e) => setPayout(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        min="0"
                        step="5"
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                        placeholder="Enter payout"
                      />
                    </div>
                  </div>

                  {/* To Win display */}
                  {stakeNum > 0 && payoutNum > 0 && (
                    <div className="flex items-center justify-between text-sm bg-accent/10 rounded-lg p-2">
                      <span className="text-gray-400">To Win</span>
                      <span className="text-accent font-semibold">
                        ${(payoutNum - stakeNum).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={clearParlayBuilder}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 bg-background border border-border text-gray-400 font-medium rounded-lg hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handlePlaceBet}
                    disabled={legs.length < 2 || stakeNum <= 0 || payoutNum <= 0 || isSubmitting}
                    className="flex-1 py-2.5 bg-accent text-background font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Placing...
                      </>
                    ) : showSuccess ? (
                      <>
                        <Check size={18} />
                        Placed!
                      </>
                    ) : (
                      <>Place Bet</>
                    )}
                  </button>
                </div>

                {/* Minimum legs warning */}
                {legs.length < 2 && (
                  <p className="text-center text-xs text-yellow-500 mt-2">
                    Add at least 2 legs to place a parlay
                  </p>
                )}
              </Card>
            </motion.div>
          ) : (
            <motion.button
              key="collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsExpanded(true)}
              className="relative flex items-center gap-2 px-4 py-3 bg-accent text-background font-semibold rounded-full shadow-lg hover:bg-accent/90 transition-colors"
            >
              <Ticket size={20} />
              <span>Parlay</span>
              <span className="bg-background text-accent text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {legs.length}
              </span>
              <ChevronUp size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

    </>
  );
};
