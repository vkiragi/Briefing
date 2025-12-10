import React from 'react';
import { Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
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
  const isLive = bet.game_state === 'in';
  // Bet types that show line/progress tracking
  const isProp = bet.type === 'Prop' || bet.type === '1st Half' || bet.type === '1st Quarter' || bet.type === 'Team Total' || bet.type === 'Total';
  // Full-game bets that show score (Moneyline, Spread also tracked but display differently)
  const isTeamBet = bet.type === 'Moneyline' || bet.type === 'Spread';

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
          updateBetStatus(bet.id, defaultStatus);
          toast({
            title: `Bet marked as ${defaultStatus}`,
            description: 'The bet has been moved to history.',
            variant: 'default',
            duration: 3000,
          });
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

    // Format date similar to sports cards
    const betDate = new Date(bet.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Format time (e.g., "7:30 PM")
    const timeStr = betDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (betDate.toDateString() === today.toDateString()) {
      return `Starts ${timeStr}`;
    } else if (betDate.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow @ ${timeStr}`;
    }

    const dateStr = betDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${dateStr} @ ${timeStr}`;
  };

  const isOver = bet.side?.toLowerCase() === 'over';

  return (
    <div className={cn(
      "bg-card border border-border rounded-lg p-4 hover:bg-card/80 transition-all",
      bet.prop_status === 'live_hit' && "border-accent/30 bg-accent/5",
      isLive && bet.prop_status !== 'live_hit' && "border-blue-500/30 bg-blue-500/5",
      bet.prop_status === 'won' && "border-accent/30 bg-accent/5",
      bet.prop_status === 'lost' && "border-red-500/30 bg-red-500/5"
    )}>
      {/* Header row - similar to sports cards */}
      <div className="flex items-center justify-between mb-3">
        <div className={cn("flex items-center gap-2", isLive ? "" : "flex-1 justify-center")}>
          {isLive && (
            <span className="text-xs uppercase font-medium text-red-500">
              Live
            </span>
          )}
          <span className="text-sm font-mono font-semibold text-gray-400">
            {formatGameTime()}
          </span>
          {isLive && (
            <div className={cn("flex items-center gap-1", getStatusColor())}>
              {getStatusIcon()}
            </div>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-red-500/20 text-gray-600 hover:text-red-500 rounded transition-colors"
          title="Dismiss bet"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Main content - player/selection and line */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-base font-semibold text-white truncate">
          {bet.player_name || bet.selection}
        </span>
        {isProp && bet.line !== undefined && bet.line !== 0 && (
          <span className="text-xl font-mono font-semibold text-white ml-2">
            {isOver ? 'O' : 'U'} {bet.line}
          </span>
        )}
        {isTeamBet && bet.type === 'Spread' && bet.line !== undefined && (
          <span className="text-xl font-mono font-semibold text-white ml-2">
            {bet.line > 0 ? `+${bet.line}` : bet.line}
          </span>
        )}
        {!isProp && !isTeamBet && (
          <span className={cn("text-xl font-mono font-semibold ml-2", bet.odds > 0 ? "text-green-400" : "text-white")}>
            {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
          </span>
        )}
        {isTeamBet && bet.type === 'Moneyline' && (
          <span className={cn("text-xl font-mono font-semibold ml-2", bet.odds > 0 ? "text-green-400" : "text-white")}>
            {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
          </span>
        )}
      </div>

      {/* Secondary info - matchup and market type */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-400 truncate">
          {bet.matchup}
        </span>
        <span className="text-sm text-gray-500 ml-2">
          {isProp && bet.market_type ? bet.market_type.replace(/_/g, ' ').toUpperCase() : bet.type.toUpperCase()}
        </span>
      </div>

      {/* Live progress section - for props/totals with current value */}
      {isProp && bet.current_value !== undefined && bet.current_value !== null && (
        <div className="mb-3">
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

      {/* Live score section - for any bet with score data (Moneyline/Spread or matched live games) */}
      {bet.current_value_str && !isProp && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Score</span>
            <span className={cn("text-lg font-bold font-mono", getStatusColor())}>
              {bet.current_value_str}
            </span>
          </div>
          {bet.game_status_text && (
            <div className="flex justify-between items-center">
              <span className={cn(
                "text-sm font-semibold",
                bet.game_state === 'post' ? "text-gray-400" : "text-blue-400"
              )}>
                {bet.game_status_text}
              </span>
              <span className={cn(
                "text-sm font-semibold",
                bet.prop_status === 'won' ? "text-accent"
                  : bet.prop_status === 'live_hit' ? "text-accent"
                  : bet.prop_status === 'lost' ? "text-red-500"
                  : bet.prop_status === 'live_miss' ? "text-red-400"
                  : "text-blue-400"
              )}>
                {bet.prop_status === 'won'
                  ? '✓ Won'
                  : bet.prop_status === 'lost'
                  ? '✗ Lost'
                  : bet.prop_status === 'live_hit'
                  ? '✓ Winning'
                  : bet.prop_status === 'live_miss'
                  ? '✗ Losing'
                  : isLive ? 'Live' : ''}
              </span>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
