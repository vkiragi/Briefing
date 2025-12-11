import React, { useEffect, useState, useRef } from 'react';
import { Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bet } from '../types';
import { cn } from '../lib/utils';
import { useToast } from './ui/Toast';
import { useBets } from '../context/BetContext';

interface PropTrackerProps {
  bet: Bet;
}

export const PropTracker: React.FC<PropTrackerProps> = ({ bet }) => {
  const { toast } = useToast();
  const { updateBetStatus } = useBets();
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedStatus, setResolvedStatus] = useState<'Won' | 'Lost' | 'Pushed' | null>(null);
  const hasAutoResolved = useRef(false);

  const isLive = bet.game_state === 'in';
  const isPreGame = !bet.game_state || bet.game_state === 'pre';
  const isPostGame = bet.game_state === 'post';

  // Bet types that show line/progress tracking
  const isProp = bet.type === 'Prop' || bet.type === '1st Half' || bet.type === '1st Quarter' || bet.type === 'Team Total' || bet.type === 'Total';
  // Full-game bets that show score (Moneyline, Spread also tracked but display differently)
  const isTeamBet = bet.type === 'Moneyline' || bet.type === 'Spread';

  // Determine final status from prop_status
  const getFinalStatus = (): 'Won' | 'Lost' | 'Pushed' | null => {
    if (bet.prop_status === 'won' || bet.prop_status === 'live_hit') return 'Won';
    if (bet.prop_status === 'lost' || bet.prop_status === 'live_miss') return 'Lost';
    if (bet.prop_status === 'push' || bet.prop_status === 'live_push') return 'Pushed';
    // If game is over but no clear prop_status, mark as Lost
    if (isPostGame && !bet.prop_status) return 'Lost';
    return null;
  };

  // Trigger resolution with animation
  const resolveWithAnimation = (status: 'Won' | 'Lost' | 'Pushed') => {
    if (hasAutoResolved.current) return; // Prevent double resolution

    setResolvedStatus(status);
    setIsResolving(true);
    hasAutoResolved.current = true;

    // Show overlay for 1s, then update status (which triggers AnimatePresence exit)
    setTimeout(() => {
      updateBetStatus(bet.id, status);
    }, 1000);
  };

  // Auto-resolve when game finishes
  useEffect(() => {
    const finalStatus = getFinalStatus();

    // Only auto-resolve if:
    // 1. Game is post (finished)
    // 2. We haven't already auto-resolved this bet
    // 3. We have a final status determined
    if (isPostGame && !hasAutoResolved.current && finalStatus) {
      resolveWithAnimation(finalStatus);
    }
  }, [isPostGame, bet.prop_status]);

  const handleDismiss = () => {
    // Determine the appropriate status based on prop_status
    const isWon = bet.prop_status === 'won' || bet.prop_status === 'live_hit';
    const isLost = bet.prop_status === 'lost' || bet.prop_status === 'live_miss';
    const isPush = bet.prop_status === 'push' || bet.prop_status === 'live_push';

    let defaultStatus: 'Won' | 'Lost' | 'Pushed' = 'Lost';
    let actionLabel = 'Mark as Lost';

    if (isWon) {
      defaultStatus = 'Won';
      actionLabel = 'Mark as Won';
    } else if (isPush) {
      defaultStatus = 'Pushed';
      actionLabel = 'Mark as Push';
    }

    toast({
      title: 'Resolve bet?',
      description: `${bet.player_name || bet.selection}\n${bet.matchup}`,
      variant: isWon ? 'default' : 'warning',
      duration: 5000,
      action: {
        label: actionLabel,
        onClick: () => {
          // Trigger animation instead of direct update
          resolveWithAnimation(defaultStatus);
        },
      },
    });
  };

  const getStatusColor = () => {
    if (!bet.prop_status) return 'text-gray-400';

    if (bet.prop_status === 'won' || bet.prop_status === 'live_hit') {
      return 'text-accent';
    } else if (bet.prop_status === 'lost') {
      return 'text-red-500';
    } else if (bet.prop_status === 'push' || bet.prop_status === 'live_push') {
      return 'text-yellow-500';
    } else if (isLive && bet.prop_status === 'live_miss') {
      return 'text-blue-400';
    }
    return 'text-gray-400';
  };

  const getStatusIcon = () => {
    if (!bet.prop_status) return <Clock size={14} />;

    if (bet.prop_status === 'won' || bet.prop_status === 'live_hit') {
      return <CheckCircle size={14} />;
    } else if (bet.prop_status === 'lost') {
      return <XCircle size={14} />;
    } else if (isLive) {
      return <Clock size={14} />;
    }
    return <Clock size={14} />;
  };

  const formatGameTime = () => {
    if (isLive) {
      return bet.game_status_text || 'Live';
    }

    // Format date in PST
    const betDate = new Date(bet.date);
    if (isNaN(betDate.getTime())) {
      return bet.date;
    }

    // Get today and tomorrow in PST for comparison
    const pstOptions: Intl.DateTimeFormatOptions = { timeZone: 'America/Los_Angeles' };
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const betDatePST = betDate.toLocaleDateString('en-US', pstOptions);
    const todayPST = today.toLocaleDateString('en-US', pstOptions);
    const tomorrowPST = tomorrow.toLocaleDateString('en-US', pstOptions);

    // Format time in PST (e.g., "7:30 PM")
    const timeStr = betDate.toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (betDatePST === todayPST) {
      return `Starts ${timeStr} PST`;
    } else if (betDatePST === tomorrowPST) {
      return `Tomorrow @ ${timeStr} PST`;
    }

    const dateStr = betDate.toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short',
      day: 'numeric'
    });
    return `${dateStr} @ ${timeStr} PST`;
  };

  const isOver = bet.side?.toLowerCase() === 'over';

  // Extract teams from matchup (e.g., "Phoenix Suns @ Oklahoma City Thunder")
  const getTeamsFromMatchup = () => {
    if (!bet.matchup) return { away: 'Away', home: 'Home' };
    const parts = bet.matchup.split(' @ ');
    if (parts.length === 2) {
      return { away: parts[0], home: parts[1] };
    }
    return { away: 'Away', home: 'Home' };
  };

  const teams = getTeamsFromMatchup();

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-4 hover:bg-card/80 transition-all relative overflow-hidden",
        bet.prop_status === 'live_hit' && "border-accent/30 bg-accent/5",
        isLive && bet.prop_status !== 'live_hit' && "border-blue-500/30 bg-blue-500/5",
        bet.prop_status === 'won' && "border-accent/30 bg-accent/5",
        bet.prop_status === 'lost' && "border-red-500/30 bg-red-500/5",
        isResolving && resolvedStatus === 'Won' && "border-accent bg-accent/20",
        isResolving && resolvedStatus === 'Lost' && "border-red-500 bg-red-500/20",
        isResolving && resolvedStatus === 'Pushed' && "border-yellow-500 bg-yellow-500/20"
      )}
    >
      {/* Resolution overlay animation */}
      <AnimatePresence>
        {isResolving && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center z-10 bg-black/60 backdrop-blur-sm rounded-xl"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className={cn(
                "flex flex-col items-center gap-2",
                resolvedStatus === 'Won' && "text-accent",
                resolvedStatus === 'Lost' && "text-red-500",
                resolvedStatus === 'Pushed' && "text-yellow-500"
              )}
            >
              {resolvedStatus === 'Won' && <CheckCircle size={48} strokeWidth={2.5} />}
              {resolvedStatus === 'Lost' && <XCircle size={48} strokeWidth={2.5} />}
              {resolvedStatus === 'Pushed' && <Clock size={48} strokeWidth={2.5} />}
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
      {/* Header row with game time and status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
          {isLive && (
            <span className="text-xs uppercase font-bold text-red-500">LIVE</span>
          )}
          <span className={cn(
            "text-sm font-mono font-semibold",
            isLive ? "text-red-400" : "text-gray-400"
          )}>
            {isLive ? (bet.game_status_text || 'Live') : formatGameTime()}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-red-500/20 text-gray-600 hover:text-red-500 rounded transition-colors"
          title="Dismiss bet"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Teams and Score - ESPN style layout (only for team bets, not player props) */}
      {!isProp && (
        <div className="space-y-2 mb-3">
          {/* Away Team */}
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-gray-300">
              {teams.away}
            </span>
            <span className="text-2xl font-mono font-bold text-white">
              {isLive || isPostGame ? (bet.current_value_str?.split('-')[0] || '0') : 'TBD'}
            </span>
          </div>
          {/* Home Team */}
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-gray-300">
              {teams.home}
            </span>
            <span className="text-2xl font-mono font-bold text-white">
              {isLive || isPostGame ? (bet.current_value_str?.split('-')[1] || '0') : 'TBD'}
            </span>
          </div>
        </div>
      )}

      {/* Player Prop display - show player name, line, and current value */}
      {isProp && (
        <div className="mb-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-white">
              {bet.player_name || bet.selection}
            </span>
            <span className="text-2xl font-mono font-bold text-white">
              {bet.line}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-gray-400">{bet.matchup}</span>
            <span className="text-xs text-gray-500 uppercase">
              {bet.market_type?.replace(/_/g, ' ') || 'POINTS'}
            </span>
          </div>
        </div>
      )}

      {/* Bet Details - only for team bets (props show details above) */}
      {!isProp && (
        <div className="border-t border-border/50 pt-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-semibold text-accent">
                {bet.selection}
              </span>
              {isTeamBet && bet.type === 'Spread' && bet.line !== undefined && (
                <span className="text-sm text-accent ml-2">
                  {bet.line > 0 ? `+${bet.line}` : bet.line}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className={cn(
                "text-lg font-mono font-bold",
                bet.odds > 0 ? "text-green-400" : "text-white"
              )}>
                {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500 uppercase">
              {bet.type}
            </span>
            {/* Status indicator */}
            {(isLive || isPostGame) && bet.prop_status && (
              <span className={cn(
                "text-xs font-semibold",
                bet.prop_status === 'won' || bet.prop_status === 'live_hit' ? "text-accent"
                  : bet.prop_status === 'lost' || bet.prop_status === 'live_miss' ? "text-red-500"
                  : "text-blue-400"
              )}>
                {bet.prop_status === 'won' ? '✓ WON'
                  : bet.prop_status === 'lost' ? '✗ LOST'
                  : bet.prop_status === 'live_hit' ? '✓ WINNING'
                  : bet.prop_status === 'live_miss' ? '✗ LOSING'
                  : ''}
              </span>
            )}
            {isPreGame && (
              <span className="text-xs text-gray-500">SCHEDULED</span>
            )}
          </div>
        </div>
      )}

      {/* Player prop footer - odds and status */}
      {isProp && (
        <div className="flex justify-between items-center">
          <span className={cn(
            "text-sm font-mono font-semibold",
            bet.odds > 0 ? "text-green-400" : "text-white"
          )}>
            {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
          </span>
          {/* Status indicator */}
          {(isLive || isPostGame) && bet.prop_status && (
            <span className={cn(
              "text-xs font-semibold",
              bet.prop_status === 'won' || bet.prop_status === 'live_hit' ? "text-accent"
                : bet.prop_status === 'lost' || bet.prop_status === 'live_miss' ? "text-red-500"
                : "text-blue-400"
            )}>
              {bet.prop_status === 'won' ? '✓ WON'
                : bet.prop_status === 'lost' ? '✗ LOST'
                : bet.prop_status === 'live_hit' ? '✓ WINNING'
                : bet.prop_status === 'live_miss' ? '✗ LOSING'
                : ''}
            </span>
          )}
          {isPreGame && (
            <span className="text-xs text-gray-500">SCHEDULED</span>
          )}
        </div>
      )}

      {/* Live progress section - for props/totals with current value */}
      {isProp && bet.current_value !== undefined && bet.current_value !== null && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Current</span>
            <span className={cn("text-lg font-bold font-mono", getStatusColor())}>
              {bet.current_value_str || bet.current_value.toFixed(1)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500",
                bet.prop_status === 'won' || bet.prop_status === 'live_hit'
                  ? "bg-accent"
                  : bet.prop_status === 'lost'
                  ? "bg-red-500"
                  : isLive
                  ? "bg-blue-500"
                  : "bg-gray-600"
              )}
              style={{ width: `${Math.min((bet.current_value / (bet.line || 1)) * 100, 100)}%` }}
            />
          </div>

          {bet.line !== undefined && bet.line !== 0 && (
            <div className="flex justify-end mt-1">
              <span className={cn(
                "text-xs font-medium",
                (isOver && bet.current_value >= bet.line) || (!isOver && bet.current_value <= bet.line)
                  ? "text-accent"
                  : isLive
                  ? "text-blue-400"
                  : "text-gray-500"
              )}>
                {isOver
                  ? (bet.current_value >= bet.line ? '✓ Hit' : `${(bet.line - bet.current_value).toFixed(1)} to go`)
                  : (bet.current_value <= bet.line ? '✓ Under' : `${(bet.current_value - bet.line).toFixed(1)} over`)
                }
              </span>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
