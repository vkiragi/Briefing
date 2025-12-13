import React, { useState, useRef, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bet, ParlayLeg } from '../types';
import { cn } from '../lib/utils';
import { useToast } from './ui/Toast';
import { useBets } from '../context/BetContext';

interface ParlayTrackerProps {
  bet: Bet;
}

// Mini leg tracker component
const LegTracker: React.FC<{ leg: ParlayLeg; index: number }> = ({ leg, index }) => {
  const isLive = leg.game_state === 'in';
  const isPostGame = leg.game_state === 'post';
  const hasCurrentValue = leg.current_value !== undefined && leg.current_value !== null;
  const hasLine = leg.line !== undefined && leg.line !== null && leg.line > 0;
  const isOver = leg.side?.toLowerCase() === 'over';

  const getStatusColor = () => {
    if (!leg.prop_status) return 'text-gray-400';
    if (leg.prop_status === 'won') return 'text-accent';
    if (leg.prop_status === 'live_hit') return 'text-accent';
    if (leg.prop_status === 'lost') return 'text-red-500'; // Only final loss is red
    if (leg.prop_status === 'live_miss') return 'text-orange-400'; // Live behind is orange, not red
    if (leg.prop_status === 'push' || leg.prop_status === 'live_push') return 'text-yellow-500';
    return 'text-gray-400';
  };

  const getStatusText = () => {
    if (leg.prop_status === 'won') return 'HIT';
    if (leg.prop_status === 'lost') return 'MISS';
    if (leg.prop_status === 'live_hit') return 'WINNING';
    if (leg.prop_status === 'live_miss') return 'LOSING';
    if (leg.prop_status === 'push') return 'PUSH';
    if (isLive) return 'LIVE';
    return 'PENDING';
  };

  const progressPercent = hasCurrentValue && leg.line
    ? Math.min((leg.current_value! / leg.line) * 100, 100)
    : 0;

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-all",
        leg.prop_status === 'won' || leg.prop_status === 'live_hit'
          ? "bg-accent/10 border-accent/30"
          : leg.prop_status === 'lost' // Only final loss shows red
          ? "bg-red-500/10 border-red-500/30"
          : leg.prop_status === 'live_miss' // Live behind shows orange
          ? "bg-orange-500/10 border-orange-500/30"
          : isLive
          ? "bg-blue-500/10 border-blue-500/30"
          : "bg-background/50 border-border/50"
      )}
    >
      {/* Leg header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">#{index + 1}</span>
          <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded">
            {leg.sport?.toUpperCase()}
          </span>
          {isLive && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-500">LIVE</span>
            </span>
          )}
        </div>
        <span className={cn("text-xs font-bold", getStatusColor())}>
          {getStatusText()}
        </span>
      </div>

      {/* Selection and line with current value */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white text-sm truncate">
            {leg.player_name || leg.selection}
          </div>
          <div className="text-xs text-gray-500 truncate">{leg.matchup}</div>
        </div>
        <div className="text-right ml-2 flex items-center gap-3">
          {/* Current value */}
          <div className="text-center">
            <div className={cn("text-lg font-bold font-mono", getStatusColor())}>
              {hasCurrentValue ? (leg.current_value_str || leg.current_value?.toFixed(0)) : (isLive || isPostGame ? '0' : '-')}
            </div>
            <div className="text-xs text-gray-600">CURR</div>
          </div>
          {/* Line */}
          {hasLine && (
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-white">
                {leg.line}
              </div>
              <div className="text-xs text-gray-500 uppercase">
                {leg.market_type?.replace(/_/g, ' ') || 'LINE'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress section - show when we have a line (for live/post games or when we have current value) */}
      {hasLine && (isLive || isPostGame || hasCurrentValue) && (
        <div className="mt-2 pt-2 border-t border-border/30">
          {/* Progress Bar */}
          <div className="relative h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500",
                leg.prop_status === 'won' || leg.prop_status === 'live_hit'
                  ? "bg-accent"
                  : leg.prop_status === 'lost' // Only final loss is red
                  ? "bg-red-500"
                  : leg.prop_status === 'live_miss' // Live behind is orange
                  ? "bg-orange-500"
                  : isLive
                  ? "bg-blue-500"
                  : "bg-gray-600"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {hasCurrentValue && leg.line && (
            <div className="flex justify-end mt-1">
              <span className={cn(
                "text-xs font-medium",
                (isOver && leg.current_value! >= leg.line) || (!isOver && leg.current_value! <= leg.line)
                  ? "text-accent"
                  : isLive
                  ? "text-blue-400"
                  : "text-gray-500"
              )}>
                {isOver
                  ? (leg.current_value! >= leg.line ? '✓ Hit!' : `${(leg.line - leg.current_value!).toFixed(1)} to go`)
                  : (leg.current_value! <= leg.line ? '✓ Under!' : `${(leg.current_value! - leg.line).toFixed(1)} over`)
                }
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ParlayTracker: React.FC<ParlayTrackerProps> = ({ bet }) => {
  const { toast } = useToast();
  const { updateBetStatus } = useBets();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedStatus, setResolvedStatus] = useState<'Won' | 'Lost' | 'Pushed' | null>(null);
  const hasAutoResolved = useRef(false);

  const legs = bet.legs || [];

  // Calculate parlay status from legs
  const wonLegs = legs.filter(l => l.prop_status === 'won' || l.prop_status === 'live_hit');
  const lostLegs = legs.filter(l => l.prop_status === 'lost'); // Only final losses count
  const losingLegs = legs.filter(l => l.prop_status === 'live_miss'); // Live behind (not final)
  const liveLegs = legs.filter(l => l.game_state === 'in');
  const completedLegs = legs.filter(l => l.game_state === 'post');

  const allLegsComplete = completedLegs.length === legs.length;
  const anyLegLost = lostLegs.length > 0; // Only final losses
  const allLegsWon = wonLegs.length === legs.length;
  const hasLiveLegs = liveLegs.length > 0;

  // Determine overall parlay status
  const getParlayStatus = () => {
    if (anyLegLost) return 'Lost'; // Only show lost if a leg has FINALLY lost
    if (allLegsWon && allLegsComplete) return 'Won';
    if (hasLiveLegs) return 'Live';
    return 'Pending';
  };

  const parlayStatus = getParlayStatus();

  // Trigger resolution with animation
  const resolveWithAnimation = (status: 'Won' | 'Lost' | 'Pushed') => {
    if (hasAutoResolved.current) return;

    setResolvedStatus(status);
    setIsResolving(true);
    hasAutoResolved.current = true;

    setTimeout(() => {
      updateBetStatus(bet.id, status);
    }, 1000);
  };

  // Auto-resolve when all legs complete
  useEffect(() => {
    if (allLegsComplete && !hasAutoResolved.current) {
      if (anyLegLost) {
        resolveWithAnimation('Lost');
      } else if (allLegsWon) {
        resolveWithAnimation('Won');
      }
    }
  }, [allLegsComplete, anyLegLost, allLegsWon]);

  const handleDismiss = () => {
    const defaultStatus = anyLegLost ? 'Lost' : (allLegsWon ? 'Won' : 'Lost');
    const actionLabel = anyLegLost ? 'Mark as Lost' : (allLegsWon ? 'Mark as Won' : 'Mark as Lost');

    toast({
      title: 'Resolve parlay?',
      description: `${legs.length} Leg Parlay - ${wonLegs.length}/${legs.length} legs hit`,
      variant: anyLegLost ? 'warning' : 'default',
      duration: 5000,
      action: {
        label: actionLabel,
        onClick: () => resolveWithAnimation(defaultStatus),
      },
    });
  };

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden relative",
        parlayStatus === 'Won' && "border-accent/30 bg-accent/5",
        parlayStatus === 'Lost' && "border-red-500/30 bg-red-500/5",
        parlayStatus === 'Live' && "border-blue-500/30 bg-blue-500/5",
        isResolving && resolvedStatus === 'Won' && "border-accent bg-accent/20",
        isResolving && resolvedStatus === 'Lost' && "border-red-500 bg-red-500/20"
      )}
    >
      {/* Resolution overlay */}
      <AnimatePresence>
        {isResolving && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center z-10 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className={cn(
                "flex flex-col items-center gap-2",
                resolvedStatus === 'Won' && "text-accent",
                resolvedStatus === 'Lost' && "text-red-500"
              )}
            >
              {resolvedStatus === 'Won' && <CheckCircle size={48} strokeWidth={2.5} />}
              {resolvedStatus === 'Lost' && <XCircle size={48} strokeWidth={2.5} />}
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg font-bold uppercase tracking-wider"
              >
                {resolvedStatus}
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {hasLiveLegs && (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs uppercase font-bold text-red-500">LIVE</span>
              </>
            )}
            <span className="text-sm font-bold text-accent">
              {legs.length} LEG PARLAY
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-lg font-mono font-bold",
              bet.odds > 0 ? "text-green-400" : "text-white"
            )}>
              {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
            </span>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-red-500/20 text-gray-600 hover:text-red-500 rounded transition-colors"
              title="Dismiss parlay"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Progress summary */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle size={14} className="text-accent" />
            <span className="text-accent font-medium">{wonLegs.length} hit</span>
          </div>
          {losingLegs.length > 0 && (
            <div className="flex items-center gap-1">
              <Clock size={14} className="text-orange-400" />
              <span className="text-orange-400 font-medium">{losingLegs.length} behind</span>
            </div>
          )}
          {lostLegs.length > 0 && (
            <div className="flex items-center gap-1">
              <XCircle size={14} className="text-red-500" />
              <span className="text-red-500 font-medium">{lostLegs.length} miss</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-gray-500">
            <Clock size={14} />
            <span>{legs.length - wonLegs.length - lostLegs.length - losingLegs.length} pending</span>
          </div>
        </div>

        {/* Stake and Payout */}
        <div className="flex items-center gap-4 mt-2 text-sm">
          <span className="text-gray-400">
            Risk: <span className="text-white font-medium">${bet.stake.toFixed(2)}</span>
          </span>
          <span className="text-gray-400">
            Payout: <span className="text-accent font-medium">${bet.potentialPayout.toFixed(2)}</span>
          </span>
        </div>

        {/* Expand/Collapse toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-white mt-3 transition-colors"
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {isExpanded ? 'Hide legs' : 'Show legs'}
        </button>
      </div>

      {/* Legs list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {legs.map((leg, index) => (
                <LegTracker key={index} leg={leg} index={index} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
