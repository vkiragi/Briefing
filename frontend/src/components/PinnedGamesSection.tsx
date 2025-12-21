import React, { useEffect, useState, useCallback } from 'react';
import { Pin, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePinnedGames, PinnedGame } from '../context/PinnedGamesContext';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface GameLiveData {
  event_id: string;
  home_team: string;
  away_team: string;
  home_score?: number | string;
  away_score?: number | string;
  status: string;
  display_clock?: string;
  period?: number;
  is_live: boolean;
  is_final: boolean;
  last_play?: string | null;
  home_win_pct?: number | null;
  home_logo?: string | null;
  away_logo?: string | null;
}

interface PinnedGamesSectionProps {
  onGameClick?: (game: { event_id: string; sport: string; home_team?: string; away_team?: string }, sport: string) => void;
}

export const PinnedGamesSection: React.FC<PinnedGamesSectionProps> = ({ onGameClick }) => {
  const { pinnedGames, unpinGame, isLoading } = usePinnedGames();
  const [liveData, setLiveData] = useState<Map<string, GameLiveData>>(new Map());
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiveData = useCallback(async () => {
    if (pinnedGames.length === 0) return;

    setRefreshing(true);
    try {
      // Prepare games for the new endpoint
      const gamesToFetch = pinnedGames.map(game => ({
        event_id: game.event_id,
        sport: game.sport,
      }));

      // Fetch live data with play-by-play for all games
      const liveResults = await api.getPinnedGamesLive(gamesToFetch);

      const newLiveData = new Map<string, GameLiveData>();

      for (const result of liveResults) {
        const isLive = result.game_state === 'in';
        const isFinal = result.game_state === 'post';

        newLiveData.set(result.event_id, {
          event_id: result.event_id,
          home_team: result.home_team || '',
          away_team: result.away_team || '',
          home_score: result.home_score ?? undefined,
          away_score: result.away_score ?? undefined,
          status: result.game_status || result.game_state,
          display_clock: result.display_clock || undefined,
          period: result.period || undefined,
          is_live: isLive,
          is_final: isFinal,
          last_play: result.last_play,
          home_win_pct: result.home_win_pct,
          home_logo: result.home_logo,
          away_logo: result.away_logo,
        });
      }

      setLiveData(newLiveData);
    } catch (error) {
      console.error('Failed to fetch live data:', error);
      // Fallback to the old method if the new endpoint fails
      try {
        await fetchLiveDataFallback();
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setRefreshing(false);
    }
  }, [pinnedGames]);

  // Fallback to the old method of fetching scores by sport
  const fetchLiveDataFallback = async () => {
    const gamesBySport = pinnedGames.reduce((acc, game) => {
      if (!acc[game.sport]) acc[game.sport] = [];
      acc[game.sport].push(game);
      return acc;
    }, {} as Record<string, PinnedGame[]>);

    const newLiveData = new Map<string, GameLiveData>();

    for (const [sport, games] of Object.entries(gamesBySport)) {
      try {
        const scores = await api.getScores(sport, 50, false);

        for (const game of games) {
          const matchingScore = scores.find((s: any) =>
            s.event_id === game.event_id ||
            s.competition_id === game.event_id
          );

          if (matchingScore) {
            newLiveData.set(game.event_id, {
              event_id: game.event_id,
              home_team: matchingScore.home_team,
              away_team: matchingScore.away_team,
              home_score: matchingScore.home_score,
              away_score: matchingScore.away_score,
              status: matchingScore.status,
              display_clock: matchingScore.display_clock,
              period: matchingScore.period,
              is_live: matchingScore.status === 'in' || matchingScore.status === 'In Progress',
              is_final: matchingScore.status === 'post' || matchingScore.status === 'Final',
            });
          }
        }
      } catch (error) {
        console.error(`Failed to fetch scores for ${sport}:`, error);
      }
    }

    setLiveData(newLiveData);
  };

  // Fetch live data on mount and when pinned games change
  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (pinnedGames.length === 0) return;

    const interval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(interval);
  }, [pinnedGames.length, fetchLiveData]);

  if (isLoading) {
    return null;
  }

  if (pinnedGames.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pin size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-white">Pinned Games</h2>
          <span className="text-xs text-gray-500">({pinnedGames.length})</span>
        </div>
        <button
          onClick={fetchLiveData}
          disabled={refreshing}
          className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={16} className={cn(refreshing && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {pinnedGames.map((game) => {
          const live = liveData.get(game.event_id);

          return (
            <PinnedGameCard
              key={game.id}
              game={game}
              liveData={live}
              onUnpin={() => unpinGame(game.event_id)}
              onClick={() => onGameClick?.({
                event_id: game.event_id,
                sport: game.sport,
                home_team: live?.home_team || game.home_team,
                away_team: live?.away_team || game.away_team,
              }, game.sport)}
            />
          );
        })}
      </div>
    </div>
  );
};

interface PinnedGameCardProps {
  game: PinnedGame;
  liveData?: GameLiveData;
  onUnpin: () => void;
  onClick?: () => void;
}

const PinnedGameCard: React.FC<PinnedGameCardProps> = ({ game, liveData, onUnpin, onClick }) => {
  const isLive = liveData?.is_live;
  const isFinal = liveData?.is_final;

  const formatPeriod = (period?: number) => {
    if (!period) return '';
    if (period === 1) return '1st';
    if (period === 2) return '2nd';
    if (period === 3) return '3rd';
    if (period === 4) return '4th';
    return `${period}th`;
  };

  // Parse scores as numbers for comparison
  const homeScore = liveData?.home_score !== undefined ? Number(liveData.home_score) : undefined;
  const awayScore = liveData?.away_score !== undefined ? Number(liveData.away_score) : undefined;

  // Determine leading team for win percentage display
  const homeWinPct = liveData?.home_win_pct;
  const awayWinPct = homeWinPct !== undefined && homeWinPct !== null ? 100 - homeWinPct : null;
  const leadingWinPct = homeWinPct !== null && homeWinPct !== undefined
    ? (homeWinPct >= 50 ? homeWinPct : awayWinPct)
    : null;
  const leadingTeam = homeWinPct !== null && homeWinPct !== undefined
    ? (homeWinPct >= 50 ? 'home' : 'away')
    : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative bg-gradient-to-br from-gray-900/90 to-gray-800/50 border rounded-xl p-4 transition-all shadow-lg",
        isLive ? "border-red-500/40" : isFinal ? "border-gray-600/50" : "border-gray-700/50",
        onClick && "cursor-pointer hover:border-accent/50"
      )}
    >
      {/* Header: Sport badge, status, and unpin button */}
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
            {isLive && liveData?.display_clock
              ? `${liveData.display_clock} - ${formatPeriod(liveData.period)}`
              : isFinal ? 'Final' : 'Scheduled'}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnpin();
          }}
          className="p-1 hover:bg-red-500/20 text-gray-600 hover:text-red-500 rounded transition-colors"
          title="Unpin game"
        >
          <X size={14} />
        </button>
      </div>

      {/* Teams and Scores - ESPN style */}
      <div className="space-y-2 mb-3">
        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {liveData?.away_logo && (
              <img
                src={liveData.away_logo}
                alt=""
                className="w-6 h-6 object-contain shrink-0"
              />
            )}
            <span className={cn(
              "text-base font-semibold truncate",
              leadingTeam === 'away' ? "text-white" : "text-gray-300"
            )}>
              {liveData?.away_team || game.away_team || 'Away'}
            </span>
          </div>
          <span className={cn(
            "text-2xl font-mono font-bold shrink-0 ml-2",
            awayScore !== undefined && homeScore !== undefined
              ? awayScore > homeScore ? "text-white" : "text-gray-500"
              : "text-gray-500"
          )}>
            {liveData?.away_score ?? '-'}
          </span>
        </div>

        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {liveData?.home_logo && (
              <img
                src={liveData.home_logo}
                alt=""
                className="w-6 h-6 object-contain shrink-0"
              />
            )}
            <span className={cn(
              "text-base font-semibold truncate",
              leadingTeam === 'home' ? "text-white" : "text-gray-300"
            )}>
              {liveData?.home_team || game.home_team || 'Home'}
            </span>
          </div>
          <span className={cn(
            "text-2xl font-mono font-bold shrink-0 ml-2",
            awayScore !== undefined && homeScore !== undefined
              ? homeScore > awayScore ? "text-white" : "text-gray-500"
              : "text-gray-500"
          )}>
            {liveData?.home_score ?? '-'}
          </span>
        </div>
      </div>

      {/* Sport tag and Win % */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-accent/80 bg-accent/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
          {game.sport}
        </span>
        {isLive && homeWinPct !== undefined && homeWinPct !== null ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 uppercase">Win %</span>
            {leadingTeam === 'home' && liveData?.home_logo && (
              <img
                src={liveData.home_logo}
                alt=""
                className="w-4 h-4 object-contain"
              />
            )}
            {leadingTeam === 'away' && liveData?.away_logo && (
              <img
                src={liveData.away_logo}
                alt=""
                className="w-4 h-4 object-contain"
              />
            )}
            <span className="text-sm font-bold text-white">
              {leadingWinPct !== null ? leadingWinPct.toFixed(1) : '-'}
            </span>
          </div>
        ) : isFinal ? (
          <span className="text-xs text-gray-500 uppercase">Final</span>
        ) : null}
      </div>

      {/* Play-by-play for live games - styled like PropTracker */}
      <AnimatePresence>
        {isLive && liveData?.last_play && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-3 pt-3 border-t border-border/30"
          >
            <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/50 rounded-lg p-3 -mx-1">
              <motion.p
                key={liveData.last_play}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-white leading-relaxed line-clamp-2"
              >
                {liveData.last_play}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
