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
  const isPreGame = !bet.game_state || bet.game_state === 'pre';
  const isPostGame = bet.game_state === 'post';
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
    <div className={cn(
      "bg-card border border-border rounded-xl p-4 hover:bg-card/80 transition-all",
      bet.prop_status === 'live_hit' && "border-accent/30 bg-accent/5",
      isLive && bet.prop_status !== 'live_hit' && "border-blue-500/30 bg-blue-500/5",
      bet.prop_status === 'won' && "border-accent/30 bg-accent/5",
      bet.prop_status === 'lost' && "border-red-500/30 bg-red-500/5"
    )}>
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
            <span className={cn(
              "text-base font-semibold",
              bet.selection?.toLowerCase().includes(teams.away.toLowerCase()) ? "text-accent" : "text-gray-300"
            )}>
              {teams.away}
            </span>
            <span className="text-2xl font-mono font-bold text-white">
              {isLive || isPostGame ? (bet.current_value_str?.split('-')[0] || '0') : 'TBD'}
            </span>
          </div>
          {/* Home Team */}
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-base font-semibold",
              bet.selection?.toLowerCase().includes(teams.home.toLowerCase()) ? "text-accent" : "text-gray-300"
            )}>
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
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-2xl font-mono font-bold",
                isLive || isPostGame ? getStatusColor() : "text-gray-500"
              )}>
                {isLive || isPostGame ? (bet.current_value ?? 0) : 'TBD'}
              </span>
              <span className="text-2xl font-mono font-bold text-white">
                {bet.line}
              </span>
            </div>
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
              <span className="text-sm font-semibold text-white">
                {bet.selection}
              </span>
              {isTeamBet && bet.type === 'Spread' && bet.line !== undefined && (
                <span className="text-sm text-gray-400 ml-2">
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
