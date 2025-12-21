import React, { useEffect, useState, useCallback } from 'react';
import { Pin, X, RefreshCw } from 'lucide-react';
import { usePinnedGames, PinnedGame } from '../context/PinnedGamesContext';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface GameLiveData {
  event_id: string;
  home_team: string;
  away_team: string;
  home_score?: number;
  away_score?: number;
  status: string;
  display_clock?: string;
  period?: number;
  is_live: boolean;
  is_final: boolean;
}

export const PinnedGamesSection: React.FC = () => {
  const { pinnedGames, unpinGame, isLoading } = usePinnedGames();
  const [liveData, setLiveData] = useState<Map<string, GameLiveData>>(new Map());
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiveData = useCallback(async () => {
    if (pinnedGames.length === 0) return;

    setRefreshing(true);
    try {
      // Group games by sport
      const gamesBySport = pinnedGames.reduce((acc, game) => {
        if (!acc[game.sport]) acc[game.sport] = [];
        acc[game.sport].push(game);
        return acc;
      }, {} as Record<string, PinnedGame[]>);

      const newLiveData = new Map<string, GameLiveData>();

      // Fetch scores for each sport
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
    } catch (error) {
      console.error('Failed to fetch live data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [pinnedGames]);

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
}

const PinnedGameCard: React.FC<PinnedGameCardProps> = ({ game, liveData, onUnpin }) => {
  const isLive = liveData?.is_live;
  const isFinal = liveData?.is_final;

  const getStatusText = () => {
    if (!liveData) {
      // No live data found - show as scheduled with stored team names
      return 'Scheduled';
    }
    if (isLive) {
      if (liveData.display_clock && liveData.period) {
        return `${liveData.display_clock} - Q${liveData.period}`;
      }
      return 'LIVE';
    }
    if (isFinal) return 'Final';
    return liveData.status || 'Scheduled';
  };

  return (
    <div className={cn(
      "relative bg-card border rounded-lg p-3 transition-all",
      isLive ? "border-red-500/50 bg-red-500/5" : "border-border"
    )}>
      {/* Unpin button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUnpin();
        }}
        className="absolute top-2 right-2 p-1 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
        title="Unpin game"
      >
        <X size={14} />
      </button>

      {/* Sport badge */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-accent bg-accent/20 px-1.5 py-0.5 rounded uppercase">
          {game.sport}
        </span>
        {isLive && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-500">LIVE</span>
          </span>
        )}
      </div>

      {/* Teams and scores */}
      <div className="space-y-1.5">
        {/* Away team */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300 truncate max-w-[140px]">
            {liveData?.away_team || game.away_team || 'Away'}
          </span>
          <span className={cn(
            "text-lg font-mono font-bold",
            liveData?.away_score !== undefined && liveData?.home_score !== undefined
              ? liveData.away_score > liveData.home_score ? "text-white" : "text-gray-500"
              : "text-gray-500"
          )}>
            {liveData?.away_score ?? '-'}
          </span>
        </div>

        {/* Home team */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300 truncate max-w-[140px]">
            {liveData?.home_team || game.home_team || 'Home'}
          </span>
          <span className={cn(
            "text-lg font-mono font-bold",
            liveData?.away_score !== undefined && liveData?.home_score !== undefined
              ? liveData.home_score > liveData.away_score ? "text-white" : "text-gray-500"
              : "text-gray-500"
          )}>
            {liveData?.home_score ?? '-'}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="mt-2 pt-2 border-t border-border/50">
        <span className={cn(
          "text-xs font-medium",
          isLive ? "text-red-400" : isFinal ? "text-gray-400" : "text-gray-500"
        )}>
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};
