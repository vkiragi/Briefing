import React, { useState, useEffect } from 'react';
import { X, Mic, AlertCircle, Check, Edit2, DollarSign, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { ParsedBetData, buildSelectionString, calculatePayout } from '../lib/voiceBetParser';
import { useBets } from '../context/BetContext';
import { cn } from '../lib/utils';

interface VoiceBetConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  parsedBet: ParsedBetData | null;
}

export const VoiceBetConfirmationModal: React.FC<VoiceBetConfirmationModalProps> = ({
  isOpen,
  onClose,
  parsedBet,
}) => {
  const { addBet } = useBets();

  // Editable fields
  const [stake, setStake] = useState<number>(0);
  const [odds, setOdds] = useState<number>(-110);
  const [line, setLine] = useState<number | undefined>();
  const [side, setSide] = useState<'over' | 'under'>('over');
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when parsedBet changes
  useEffect(() => {
    if (parsedBet) {
      setStake(parsedBet.stake || 10);
      setOdds(parsedBet.odds || -110);
      setLine(parsedBet.line);
      setSide(parsedBet.side || 'over');
      setError(null);
      setIsEditing(false);
    }
  }, [parsedBet]);

  // Lock body scroll when modal is open
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

  if (!isOpen || !parsedBet) return null;

  const payout = calculatePayout(stake, odds);
  const profit = payout - stake;

  const handleConfirm = async () => {
    if (!parsedBet) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Build the bet object based on type
      const betBase = {
        stake,
        odds,
        type: parsedBet.type,
        sport: 'nba', // Default - will need to be resolved
        matchup: parsedBet.teamNameRaw || 'Voice Bet',
        selection: buildSelectionString({
          ...parsedBet,
          stake,
          odds,
          line,
          side,
        }),
        payout,
        placed_at: new Date().toISOString(),
      };

      // Add type-specific fields
      if (parsedBet.type === 'Prop') {
        Object.assign(betBase, {
          player_name: parsedBet.playerNameRaw,
          market_type: parsedBet.marketType,
          line,
          side,
        });
      } else if (parsedBet.type === 'Spread') {
        Object.assign(betBase, {
          team_name: parsedBet.teamNameRaw,
          line: parsedBet.spreadValue,
        });
      } else if (parsedBet.type === 'Total') {
        Object.assign(betBase, {
          line,
          side,
        });
      } else if (parsedBet.type === 'Moneyline') {
        Object.assign(betBase, {
          team_name: parsedBet.teamNameRaw,
        });
      }

      await addBet(betBase as any);
      onClose();
    } catch (e) {
      console.error('Failed to place bet:', e);
      setError('Failed to place bet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBetTypeLabel = () => {
    switch (parsedBet.type) {
      case 'Prop': return 'Player Prop';
      case 'Moneyline': return 'Moneyline';
      case 'Spread': return 'Spread';
      case 'Total': return 'Game Total';
      default: return 'Bet';
    }
  };

  const getMainDetail = () => {
    switch (parsedBet.type) {
      case 'Prop':
        return parsedBet.playerNameRaw || 'Unknown Player';
      case 'Moneyline':
      case 'Spread':
        return parsedBet.teamNameRaw || 'Unknown Team';
      case 'Total':
        return 'Game Total';
      default:
        return 'Unknown';
    }
  };

  const getSecondaryDetail = () => {
    switch (parsedBet.type) {
      case 'Prop':
        return `${side === 'over' ? 'Over' : 'Under'} ${line || '?'} ${parsedBet.marketType || 'points'}`;
      case 'Spread':
        return `${parsedBet.spreadValue && parsedBet.spreadValue > 0 ? '+' : ''}${parsedBet.spreadValue || '?'}`;
      case 'Total':
        return `${side === 'over' ? 'Over' : 'Under'} ${line || '?'}`;
      default:
        return '';
    }
  };

  const hasIssues = parsedBet.issues && parsedBet.issues.length > 0;
  const criticalIssues = parsedBet.issues?.filter(i =>
    i.includes('Could not identify') && !i.includes('defaulting')
  ) || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md"
        >
          <Card className="rounded-t-2xl sm:rounded-2xl p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                  <Mic size={16} className="text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Confirm Voice Bet</h3>
                  <p className="text-xs text-gray-400">{getBetTypeLabel()}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Transcript */}
            <div className="px-4 py-3 bg-white/5 border-b border-border">
              <p className="text-xs text-gray-500 mb-1">You said:</p>
              <p className="text-sm text-gray-300 italic">"{parsedBet.rawTranscript}"</p>
            </div>

            {/* Main Content */}
            <div className="p-4 space-y-4">
              {/* Parsed Bet Details */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white capitalize">
                      {getMainDetail()}
                    </h4>
                    {getSecondaryDetail() && (
                      <p className="text-accent font-medium">
                        {getSecondaryDetail()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      isEditing
                        ? "bg-accent text-background"
                        : "bg-white/10 text-gray-400 hover:text-white"
                    )}
                  >
                    <Edit2 size={16} />
                  </button>
                </div>

                {/* Editable Fields */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 border-t border-border space-y-3">
                        {/* Over/Under Toggle (for props and totals) */}
                        {(parsedBet.type === 'Prop' || parsedBet.type === 'Total') && (
                          <div>
                            <label className="text-xs text-gray-500 block mb-1.5">Side</label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSide('over')}
                                className={cn(
                                  "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                                  side === 'over'
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : "bg-white/5 text-gray-400 border border-border hover:border-gray-600"
                                )}
                              >
                                Over
                              </button>
                              <button
                                onClick={() => setSide('under')}
                                className={cn(
                                  "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                                  side === 'under'
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                    : "bg-white/5 text-gray-400 border border-border hover:border-gray-600"
                                )}
                              >
                                Under
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Line Input */}
                        {(parsedBet.type === 'Prop' || parsedBet.type === 'Total') && (
                          <div>
                            <label className="text-xs text-gray-500 block mb-1.5">Line</label>
                            <input
                              type="number"
                              step="0.5"
                              value={line || ''}
                              onChange={(e) => setLine(parseFloat(e.target.value) || undefined)}
                              className="w-full px-3 py-2 bg-white/5 border border-border rounded-lg text-white focus:outline-none focus:border-accent"
                              placeholder="e.g., 25.5"
                            />
                          </div>
                        )}

                        {/* Odds Input */}
                        <div>
                          <label className="text-xs text-gray-500 block mb-1.5">Odds</label>
                          <input
                            type="number"
                            value={odds}
                            onChange={(e) => setOdds(parseInt(e.target.value) || -110)}
                            className="w-full px-3 py-2 bg-white/5 border border-border rounded-lg text-white focus:outline-none focus:border-accent"
                            placeholder="-110"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Stake and Payout */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-xl p-3">
                  <label className="text-xs text-gray-500 block mb-1">Stake</label>
                  <div className="flex items-center gap-1">
                    <DollarSign size={16} className="text-gray-400" />
                    <input
                      type="number"
                      value={stake}
                      onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-transparent text-lg font-semibold text-white focus:outline-none"
                      min={1}
                    />
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-3">
                  <label className="text-xs text-gray-500 block mb-1">To Win</label>
                  <div className="flex items-center gap-1">
                    <TrendingUp size={16} className="text-green-400" />
                    <span className="text-lg font-semibold text-green-400">
                      ${profit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Odds Display */}
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <span>Odds:</span>
                <span className={cn(
                  "font-mono font-semibold",
                  odds > 0 ? "text-green-400" : "text-white"
                )}>
                  {odds > 0 ? '+' : ''}{odds}
                </span>
                <span className="text-gray-600">•</span>
                <span>Payout:</span>
                <span className="font-semibold text-white">${payout.toFixed(2)}</span>
              </div>

              {/* Issues/Warnings */}
              {hasIssues && (
                <div className={cn(
                  "p-3 rounded-lg flex items-start gap-2",
                  criticalIssues.length > 0
                    ? "bg-red-500/10 border border-red-500/20"
                    : "bg-yellow-500/10 border border-yellow-500/20"
                )}>
                  <AlertCircle size={16} className={cn(
                    "flex-shrink-0 mt-0.5",
                    criticalIssues.length > 0 ? "text-red-400" : "text-yellow-400"
                  )} />
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-medium mb-1",
                      criticalIssues.length > 0 ? "text-red-400" : "text-yellow-400"
                    )}>
                      {criticalIssues.length > 0 ? 'Missing Information' : 'Notes'}
                    </p>
                    <ul className="text-xs text-gray-400 space-y-0.5">
                      {parsedBet.issues?.map((issue, i) => (
                        <li key={i}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-border flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-white/5 text-gray-400 rounded-xl font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting || criticalIssues.length > 0}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors",
                  isSubmitting || criticalIssues.length > 0
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-accent text-background hover:bg-accent/90"
                )}
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full" />
                    </motion.div>
                    Placing...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Place Bet
                  </>
                )}
              </button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
