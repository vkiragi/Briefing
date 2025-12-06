import React from 'react';
import { TrendingUp, TrendingDown, Minus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Bet } from '../types';
import { cn } from '../lib/utils';
import { Card } from './ui/Card';

interface PropTrackerProps {
  bet: Bet;
}

export const PropTracker: React.FC<PropTrackerProps> = ({ bet }) => {
  const isLive = bet.game_state === 'in';
  const isComplete = bet.game_state === 'post' || bet.game_state === 'final';
  
  const getStatusColor = () => {
    if (!bet.prop_status) return 'text-gray-400';
    
    if (bet.prop_status === 'won' || bet.prop_status === 'live_hit') {
      return 'text-accent';
    } else if (bet.prop_status === 'lost') {
      return 'text-red-500';
    } else if (bet.prop_status === 'push' || bet.prop_status === 'live_push') {
      return 'text-yellow-500';
    } else if (isLive && bet.prop_status === 'live_miss') {
      // For live games, show as "live" not "miss"
      return 'text-blue-400';
    }
    return 'text-gray-400';
  };

  const getStatusIcon = () => {
    if (!bet.prop_status) return <Clock size={16} />;
    
    if (bet.prop_status === 'won' || bet.prop_status === 'live_hit') {
      return <CheckCircle size={16} />;
    } else if (bet.prop_status === 'lost') {
      return <XCircle size={16} />;
    } else if (bet.prop_status === 'push' || bet.prop_status === 'live_push') {
      return <Minus size={16} />;
    } else if (isLive) {
      // For live games, show clock icon
      return <Clock size={16} />;
    }
    return <Clock size={16} />;
  };

  const getStatusText = () => {
    if (!bet.prop_status) return 'Pending';
    
    if (bet.prop_status === 'won') return 'Won';
    if (bet.prop_status === 'lost') return 'Lost';
    if (bet.prop_status === 'push') return 'Push';
    if (bet.prop_status === 'live_hit') return 'Live Hit';
    if (bet.prop_status === 'live_miss' && isLive) return 'Live';
    if (bet.prop_status === 'live_push') return 'Live Push';
    
    return bet.prop_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getProgressPercentage = () => {
    if (bet.current_value == null || !bet.line) return 0;
    return Math.min((bet.current_value / bet.line) * 100, 100);
  };

  const isOver = bet.side?.toLowerCase() === 'over';
  const progress = getProgressPercentage();

  return (
    <Card className={cn(
      "p-4 transition-all",
      bet.prop_status === 'live_hit' && "border-accent/30 bg-accent/5",
      isLive && bet.prop_status !== 'live_hit' && "border-blue-500/30 bg-blue-500/5",
      bet.prop_status === 'won' && "border-accent/30 bg-accent/5",
      bet.prop_status === 'lost' && "border-red-500/30 bg-red-500/5"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg">{bet.player_name || bet.selection}</span>
            {isLive && (
              <span className="text-xs font-bold text-red-500 bg-red-500/20 px-2 py-0.5 rounded-full animate-pulse">
                LIVE
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            {bet.matchup} • {bet.market_type?.replace(/_/g, ' ').toUpperCase()}
          </div>
        </div>
        <div className={cn("flex items-center gap-1", getStatusColor())}>
          {getStatusIcon()}
          <span className="text-xs font-medium">
            {getStatusText()}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Line Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">
            {isOver ? 'Over' : 'Under'} {bet.line}
          </span>
          {bet.game_status_text && (
            <span className="text-xs text-gray-500">{bet.game_status_text}</span>
          )}
        </div>

        {/* Current Value */}
        {bet.current_value !== undefined && bet.current_value !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Current:</span>
              <span className={cn("text-2xl font-bold font-mono", getStatusColor())}>
                {bet.current_value_str || (bet.current_value != null ? bet.current_value.toFixed(1) : 'N/A')}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
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
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                {isOver ? 'Needs' : 'Stay under'} {bet.line}
              </span>
              {bet.line && bet.current_value != null && (
                <span className={cn(
                  "font-medium",
                  (isOver && bet.current_value >= bet.line) || (!isOver && bet.current_value <= bet.line)
                    ? "text-accent"
                    : isLive
                    ? "text-blue-400"
                    : "text-red-500"
                )}>
                  {isOver 
                    ? (bet.current_value >= bet.line ? '✓ Hit' : `${(bet.line - bet.current_value).toFixed(1)} away`)
                    : (bet.current_value <= bet.line ? '✓ Under' : `${(bet.current_value - bet.line).toFixed(1)} over`)
                  }
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bet Details - Only show if stake > 0 */}
        {bet.stake > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-border">
            <span>Stake: ${bet.stake.toFixed(2)}</span>
            <span>Odds: {bet.odds > 0 ? `+${bet.odds}` : bet.odds}</span>
            <span>To Win: ${bet.potentialPayout.toFixed(2)}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

