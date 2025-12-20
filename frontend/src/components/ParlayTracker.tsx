import React, { useState, useRef, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Trash2, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bet, ParlayLeg } from '../types';
import { cn } from '../lib/utils';
import { useToast } from './ui/Toast';
import { useBets } from '../context/BetContext';

interface ParlayTrackerProps {
  bet: Bet;
}

// Mini leg tracker component (without live situation - shown at group level)
const LegTracker: React.FC<{ leg: ParlayLeg; index: number; showMatchup?: boolean }> = ({ leg, index, showMatchup = true }) => {
  const isLive = leg.game_state === 'in';
  const isPostGame = leg.game_state === 'post';
  const hasCurrentValue = leg.current_value !== undefined && leg.current_value !== null;
  const hasLine = leg.line !== undefined && leg.line !== null && leg.line > 0;

  // Check if this is a player prop (has line) vs a team bet (Moneyline, no line)
  const isPlayerProp = hasLine && leg.market_type;
  const isOver = leg.side?.toLowerCase() === 'over';

  // Determine if currently winning/losing based on actual values (more reliable than prop_status)
  const currentValue = leg.current_value ?? 0;
  const line = leg.line ?? 0;
  const isCurrentlyHit = isOver ? currentValue >= line : currentValue <= line;

  const getStatusColor = () => {
    // Final states
    if (leg.prop_status === 'won') return 'text-accent';
    if (leg.prop_status === 'lost') return 'text-red-500';
    if (leg.prop_status === 'push') return 'text-yellow-500';

    // Live states - use actual value comparison for consistency
    if (isLive && hasLine) {
      return isCurrentlyHit ? 'text-accent' : 'text-orange-400';
    }

    // Fallback to prop_status
    if (leg.prop_status === 'live_hit') return 'text-accent';
    if (leg.prop_status === 'live_miss') return 'text-orange-400';

    return 'text-gray-400';
  };

  const getStatusText = () => {
    // Final states
    if (leg.prop_status === 'won') return 'HIT';
    if (leg.prop_status === 'lost') return 'MISS';
    if (leg.prop_status === 'push') return 'PUSH';

    // Live states - use actual value comparison for consistency
    if (isLive && hasLine) {
      return isCurrentlyHit ? 'WINNING' : 'LOSING';
    }

    if (isLive) return 'LIVE';
    return 'PENDING';
  };

  const progressPercent = hasCurrentValue && leg.line
    ? Math.min((leg.current_value! / leg.line) * 100, 100)
    : 0;

  // Determine card background based on status
  const getCardStyle = () => {
    // Final states
    if (leg.prop_status === 'won') return "bg-accent/10 border-accent/30";
    if (leg.prop_status === 'lost') return "bg-red-500/10 border-red-500/30";
    if (leg.prop_status === 'push') return "bg-yellow-500/10 border-yellow-500/30";

    // Live states - use actual value comparison for consistency
    if (isLive && hasLine) {
      return isCurrentlyHit
        ? "bg-accent/10 border-accent/30"
        : "bg-orange-500/10 border-orange-500/30";
    }

    // Pre-game
    return "bg-background/50 border-border/50";
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-all",
        getCardStyle()
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
          {leg.is_combined && leg.combined_players ? (
            <>
              {/* Combined prop - show all players */}
              <div className="flex items-center gap-1 mb-1">
                <Users size={12} className="text-accent" />
                <span className="text-xs text-accent font-medium">Combined Prop</span>
              </div>
              <div className="font-medium text-white text-sm">
                {leg.combined_players.map(p => p.player_name).join(' + ')}
              </div>
              {leg.side && leg.line && leg.market_type && (
                <div className="text-xs text-gray-400 capitalize">
                  {leg.side} {leg.line} {leg.market_type.replace(/_/g, ' ')}
                </div>
              )}
            </>
          ) : isPlayerProp ? (
            <>
              <div className="font-medium text-white text-sm truncate">
                {leg.player_name || leg.selection}
              </div>
              {/* Bet type - e.g., "Over 32.5 points" */}
              {leg.side && leg.line && leg.market_type && (
                <div className="text-xs text-gray-400 capitalize">
                  {leg.side} {leg.line} {leg.market_type.replace(/_/g, ' ')}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Team bet - show selection (team name), fallback to team_name if selection is invalid */}
              <div className="font-medium text-white text-sm truncate">
                {leg.selection && leg.selection !== '0' ? leg.selection : leg.team_name || 'Team Bet'}
              </div>
              <div className="text-xs text-gray-400">
                Moneyline
              </div>
            </>
          )}
          {showMatchup && <div className="text-xs text-gray-500 truncate">{leg.matchup}</div>}
        </div>
        <div className="text-right ml-2 flex items-center gap-3">
          {leg.is_combined && leg.combined_players ? (
            <>
              {/* Combined prop: show combined total / line */}
              <div className="text-center">
                <div className={cn("text-lg font-bold font-mono", getStatusColor())}>
                  {hasCurrentValue ? leg.current_value?.toFixed(0) : '-'}
                </div>
                <div className="text-xs text-gray-600">TOTAL</div>
              </div>
              {hasLine && (
                <div className="text-center">
                  <div className="text-lg font-bold font-mono text-white">
                    {leg.line}
                  </div>
                  <div className="text-xs text-gray-500">LINE</div>
                </div>
              )}
            </>
          ) : isPlayerProp ? (
            <>
              {/* Player prop: show current value / line */}
              <div className="text-center">
                <div className={cn("text-lg font-bold font-mono", getStatusColor())}>
                  {hasCurrentValue ? (leg.current_value_str || leg.current_value?.toFixed(0)) : (isLive || isPostGame ? '0' : '-')}
                </div>
                <div className="text-xs text-gray-600">CURR</div>
              </div>
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
            </>
          ) : (
            <>
              {/* Team bet: show score and odds */}
              {(isLive || isPostGame) && leg.current_value_str && (
                <div className="text-center">
                  <div className={cn("text-lg font-bold font-mono", getStatusColor())}>
                    {leg.current_value_str}
                  </div>
                  <div className="text-xs text-gray-500">Score</div>
                </div>
              )}
              <div className="text-center">
                <div className={cn(
                  "text-lg font-bold font-mono",
                  leg.odds > 0 ? "text-green-400" : "text-white"
                )}>
                  {leg.odds > 0 ? `+${leg.odds}` : leg.odds}
                </div>
                <div className="text-xs text-gray-500">Odds</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Combined prop: show individual player breakdown */}
      {leg.is_combined && leg.combined_players && leg.combined_players.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <div className="text-xs text-gray-500 mb-1">Individual Stats</div>
          <div className="grid grid-cols-3 gap-1">
            {leg.combined_players.map((player, i) => (
              <div key={i} className="bg-background/50 rounded px-2 py-1 text-center">
                <div className="text-xs text-gray-400 truncate">{player.player_name.split(' ').pop()}</div>
                <div className="text-sm font-bold text-white">
                  {player.current_value !== undefined ? player.current_value : '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress section */}
      {hasLine && (isLive || isPostGame || hasCurrentValue) && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <div className="relative h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500",
                leg.prop_status === 'won' ? "bg-accent"
                  : leg.prop_status === 'lost' ? "bg-red-500"
                  : leg.prop_status === 'push' ? "bg-yellow-500"
                  : isLive && hasLine ? (isCurrentlyHit ? "bg-accent" : "bg-orange-500")
                  : "bg-gray-600"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {hasCurrentValue && leg.line && (
            <div className="flex justify-end mt-1">
              <span className={cn(
                "text-xs font-medium",
                isCurrentlyHit ? "text-accent" : "text-orange-400"
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

// Game group component - groups legs from the same game with shared live situation
interface GameGroupProps {
  legs: { leg: ParlayLeg; originalIndex: number }[];
  matchup: string;
}

const GameGroup: React.FC<GameGroupProps> = ({ legs, matchup }) => {
  // Use the first leg's live data (all legs from same game share the same data)
  const firstLeg = legs[0].leg;
  const isLive = firstLeg.game_state === 'in';
  const liveSituation = firstLeg.live_situation;
  const lastPlay = firstLeg.last_play;

  return (
    <div className="space-y-3">
      {/* Shared Live Situation for the game */}
      <AnimatePresence>
        {isLive && (lastPlay || liveSituation) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/50 rounded-lg px-3 py-3">
              <div className="flex items-center gap-3">
                {/* Away team logo */}
                {liveSituation?.away_logo && (
                  <img
                    src={liveSituation.away_logo}
                    alt={liveSituation.away_abbrev || 'Away'}
                    className="w-8 h-8 object-contain shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  {/* Matchup */}
                  <div className="text-xs text-gray-400 leading-tight">{matchup}</div>

                  {/* Clock and period */}
                  {liveSituation?.display_clock && (
                    <div className="text-xs text-gray-300 font-medium leading-tight">
                      {liveSituation.display_clock} - {
                        liveSituation.period === 1 ? '1st' :
                        liveSituation.period === 2 ? '2nd' :
                        liveSituation.period === 3 ? '3rd' :
                        liveSituation.period === 4 ? '4th' :
                        `${liveSituation.period}th`
                      } Quarter
                    </div>
                  )}

                  {/* Play description */}
                  {lastPlay && (
                    <motion.p
                      key={lastPlay}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-sm text-white mt-1 leading-tight"
                    >
                      {lastPlay}
                    </motion.p>
                  )}
                </div>

                {/* Right side: Win % and Score */}
                <div className="shrink-0 text-right">
                  {liveSituation?.home_win_pct !== undefined && (
                    <div className="flex items-center gap-1.5 justify-end mb-1">
                      <span className="text-[10px] text-gray-500 uppercase">Win %</span>
                      {liveSituation.home_logo && (
                        <img
                          src={liveSituation.home_win_pct >= 50 ? liveSituation.home_logo : liveSituation.away_logo}
                          alt="Leading"
                          className="w-4 h-4 object-contain"
                        />
                      )}
                      <span className="text-sm font-bold text-white">
                        {liveSituation.home_win_pct >= 50
                          ? liveSituation.home_win_pct.toFixed(1)
                          : (100 - liveSituation.home_win_pct).toFixed(1)
                        }
                      </span>
                    </div>
                  )}

                  {liveSituation?.away_score && liveSituation?.home_score && (
                    <div className="text-lg font-bold font-mono text-white">
                      {liveSituation.away_score}-{liveSituation.home_score}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legs for this game */}
      {legs.map(({ leg, originalIndex }) => (
        <LegTracker
          key={originalIndex}
          leg={leg}
          index={originalIndex}
          showMatchup={!isLive} // Hide matchup when live (shown in game group header)
        />
      ))}
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

      {/* Legs list - grouped by game */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {(() => {
                // Group legs by event_id
                const groupedLegs = legs.reduce((groups, leg, index) => {
                  const eventId = leg.event_id || `no-event-${index}`;
                  if (!groups[eventId]) {
                    groups[eventId] = {
                      matchup: leg.matchup,
                      legs: []
                    };
                  }
                  groups[eventId].legs.push({ leg, originalIndex: index });
                  return groups;
                }, {} as Record<string, { matchup: string; legs: { leg: ParlayLeg; originalIndex: number }[] }>);

                return Object.entries(groupedLegs).map(([eventId, group]) => (
                  <GameGroup
                    key={eventId}
                    legs={group.legs}
                    matchup={group.matchup}
                  />
                ));
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
