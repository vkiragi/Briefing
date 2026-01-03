import React, { useEffect, useState, useCallback } from 'react';
import { Star, RefreshCw, Settings } from 'lucide-react';
import { useSettings, FavoriteTeam } from '../context/SettingsContext';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { Game } from '../types';
import { GameDetailModal } from './GameDetailModal';

interface TeamResult {
  team_id: string;
  team_name: string;
  sport: string;
  logo: string | null;
  last_game: {
    event_id: string;
    date: string;
    opponent_name: string;
    opponent_abbreviation: string;
    opponent_logo: string;
    is_home: boolean;
    our_score: string;
    opponent_score: string;
    result: 'W' | 'L' | 'T' | null;
    status: string;
    state: string;
  } | null;
  next_game: {
    event_id: string;
    date: string;
    opponent_name: string;
    opponent_abbreviation: string;
    opponent_logo: string;
    is_home: boolean;
    status: string;
    state: string;
  } | null;
}

interface FavoriteTeamsSectionProps {
  onOpenSettings?: () => void;
}

export const FavoriteTeamsSection: React.FC<FavoriteTeamsSectionProps> = ({ onOpenSettings }) => {
  const { settings } = useSettings();
  const [results, setResults] = useState<TeamResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGame, setSelectedGame] = useState<{ game: Game; sport: string } | null>(null);

  const fetchResults = useCallback(async () => {
    if (settings.favoriteTeams.length === 0) return;

    setRefreshing(true);
    try {
      const teamsToFetch = settings.favoriteTeams.map(t => ({
        id: t.id,
        name: t.name,
        sport: t.sport,
      }));
      const data = await api.getFavoriteTeamsResults(teamsToFetch);
      setResults(data);
    } catch (error) {
      console.error('Failed to fetch favorite teams results:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [settings.favoriteTeams]);

  // Initial load
  useEffect(() => {
    if (settings.favoriteTeams.length > 0) {
      setLoading(true);
      fetchResults();
    }
  }, [settings.favoriteTeams.length, fetchResults]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (settings.favoriteTeams.length === 0) return;

    const interval = setInterval(fetchResults, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [settings.favoriteTeams.length, fetchResults]);

  if (settings.favoriteTeams.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star size={18} className="text-yellow-500 fill-yellow-500" />
          <h2 className="text-lg font-semibold text-white">My Teams</h2>
          <span className="text-xs text-gray-500">({settings.favoriteTeams.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchResults}
            disabled={refreshing}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={cn(refreshing && "animate-spin")} />
          </button>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Manage favorite teams"
            >
              <Settings size={16} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {settings.favoriteTeams.map((team) => (
            <div
              key={team.id}
              className="bg-gradient-to-br from-gray-900/90 to-gray-800/50 border border-gray-700/50 rounded-xl p-4 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-700" />
                <div className="h-5 w-24 bg-gray-700 rounded" />
              </div>
              <div className="h-4 w-32 bg-gray-700 rounded mb-2" />
              <div className="h-4 w-28 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {results.map((result) => {
            const team = settings.favoriteTeams.find(t => t.id === result.team_id);
            return (
              <FavoriteTeamCard
                key={result.team_id}
                result={result}
                team={team}
                onGameClick={(game, sport) => setSelectedGame({ game, sport })}
              />
            );
          })}
        </div>
      )}

      {/* Game Details Modal */}
      <GameDetailModal
        isOpen={!!selectedGame}
        onClose={() => setSelectedGame(null)}
        game={selectedGame?.game || null}
        sport={selectedGame?.sport || ''}
      />
    </div>
  );
};

interface FavoriteTeamCardProps {
  result: TeamResult;
  team?: FavoriteTeam;
  onGameClick?: (game: Game, sport: string) => void;
}

const FavoriteTeamCard: React.FC<FavoriteTeamCardProps> = ({ result, team, onGameClick }) => {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      if (date.toDateString() === now.toDateString()) {
        return `Today ${timeStr}`;
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return `Tom ${timeStr}`;
      } else {
        const dateFormatted = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `${dateFormatted} ${timeStr}`;
      }
    } catch {
      return dateStr;
    }
  };

  const formatLastGameDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Check if a game is today
  const isGameToday = (dateStr: string): boolean => {
    try {
      const gameDate = new Date(dateStr);
      const now = new Date();
      return gameDate.toDateString() === now.toDateString();
    } catch {
      return false;
    }
  };

  // Create a Game object for the modal
  const createGameObject = (gameData: typeof result.last_game | typeof result.next_game, isCompleted: boolean): Game | null => {
    if (!gameData) return null;

    // Determine home/away based on is_home flag
    const ourTeamName = result.team_name;
    const opponentName = gameData.opponent_name;

    return {
      event_id: gameData.event_id,
      home_team: gameData.is_home ? ourTeamName : opponentName,
      away_team: gameData.is_home ? opponentName : ourTeamName,
      home_score: gameData.is_home ? (gameData as typeof result.last_game)?.our_score || '0' : (gameData as typeof result.last_game)?.opponent_score || '0',
      away_score: gameData.is_home ? (gameData as typeof result.last_game)?.opponent_score || '0' : (gameData as typeof result.last_game)?.our_score || '0',
      home_logo: gameData.is_home ? result.logo || undefined : gameData.opponent_logo || undefined,
      away_logo: gameData.is_home ? gameData.opponent_logo || undefined : result.logo || undefined,
      status: gameData.status,
      state: gameData.state,
      completed: isCompleted,
      date: gameData.date,
    };
  };

  const handleGameClick = (gameData: typeof result.last_game | typeof result.next_game, isCompleted: boolean) => {
    if (!gameData || !onGameClick) return;
    const game = createGameObject(gameData, isCompleted);
    if (game) {
      onGameClick(game, result.sport);
    }
  };

  const lastGame = result.last_game;
  const nextGame = result.next_game;

  // Determine if there's a game today (next game is today or in progress)
  const hasTodayGame = nextGame && isGameToday(nextGame.date);
  const isLive = nextGame?.state === 'in';

  return (
    <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/50 border border-gray-700/50 rounded-xl p-4 transition-all hover:border-accent/40 shadow-lg">
      {/* Sport badge */}
      <div className="absolute top-3 right-3">
        <span className="text-[10px] font-medium text-accent/80 bg-accent/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
          {team?.sportDisplay || result.sport}
        </span>
      </div>

      {/* Team Header with logo */}
      <div className="flex items-center gap-3 mb-4">
        {result.logo && (
          <img
            src={result.logo}
            alt=""
            className="w-10 h-10 object-contain"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg text-white font-bold truncate leading-tight">{result.team_name}</h3>
        </div>
      </div>

      {/* Priority: Today's Game or Live Game as main display */}
      {(hasTodayGame || isLive) && nextGame ? (
        <>
          {/* Today's Game - Main Display */}
          <button
            onClick={() => handleGameClick(nextGame, false)}
            className={cn(
              "w-full rounded-lg p-3 mb-3 text-left transition-colors cursor-pointer",
              isLive ? "bg-red-500/10 border border-red-500/30" : "bg-accent/10 border border-accent/30"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                <span className={cn(
                  "text-[10px] uppercase tracking-wide font-semibold",
                  isLive ? "text-red-400" : "text-accent"
                )}>
                  {isLive ? 'LIVE' : 'Today'}
                </span>
              </div>
              <span className={cn(
                "text-xs font-medium",
                isLive ? "text-red-400" : "text-accent"
              )}>
                {formatDate(nextGame.date)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {nextGame.opponent_logo && (
                  <img
                    src={nextGame.opponent_logo}
                    alt=""
                    className="w-7 h-7 object-contain"
                  />
                )}
                <span className="text-base text-white font-medium">
                  {nextGame.is_home ? 'vs' : '@'} {nextGame.opponent_name}
                </span>
              </div>
            </div>
          </button>

          {/* Last Game - Small insight */}
          {lastGame && (
            <button
              onClick={() => handleGameClick(lastGame, true)}
              className="w-full flex items-center justify-between pt-2 border-t border-gray-700/30 hover:bg-gray-800/30 rounded px-1 -mx-1 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Last</span>
                {lastGame.opponent_logo && (
                  <img src={lastGame.opponent_logo} alt="" className="w-4 h-4 object-contain" />
                )}
                <span className="text-xs text-gray-400">
                  {lastGame.is_home ? 'vs' : '@'} {lastGame.opponent_abbreviation}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-xs font-bold",
                  lastGame.result === 'W' ? "text-green-400" : lastGame.result === 'L' ? "text-red-400" : "text-gray-400"
                )}>
                  {lastGame.result}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {lastGame.our_score}-{lastGame.opponent_score}
                </span>
              </div>
            </button>
          )}
        </>
      ) : (
        <>
          {/* No game today - Show Last Game as main display */}
          {lastGame && (
            <button
              onClick={() => handleGameClick(lastGame, true)}
              className="w-full bg-gray-800/60 rounded-lg p-3 mb-3 text-left hover:bg-gray-800/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wide">Last Game</span>
                  <span className="text-[10px] text-gray-600">{formatLastGameDate(lastGame.date)}</span>
                </div>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full",
                  lastGame.result === 'W' ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                  lastGame.result === 'L' ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                  "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                )}>
                  {lastGame.result === 'W' ? 'WIN' : lastGame.result === 'L' ? 'LOSS' : 'TIE'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {lastGame.opponent_logo && (
                    <img
                      src={lastGame.opponent_logo}
                      alt=""
                      className="w-6 h-6 object-contain"
                    />
                  )}
                  <span className="text-sm text-gray-300">
                    {lastGame.is_home ? 'vs' : '@'} {lastGame.opponent_abbreviation || lastGame.opponent_name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "text-xl font-bold font-mono",
                    lastGame.result === 'W' ? "text-white" : "text-gray-400"
                  )}>
                    {lastGame.our_score}
                  </span>
                  <span className="text-gray-600 text-lg">-</span>
                  <span className={cn(
                    "text-xl font-bold font-mono",
                    lastGame.result === 'L' ? "text-white" : "text-gray-400"
                  )}>
                    {lastGame.opponent_score}
                  </span>
                </div>
              </div>
            </button>
          )}

          {/* Next Game - Small insight when no game today */}
          {nextGame && (
            <div className={cn(
              "flex items-center justify-between",
              lastGame && "pt-2 border-t border-gray-700/30"
            )}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Next</span>
                <span className="text-sm text-gray-400">
                  {nextGame.is_home ? 'vs' : '@'}
                </span>
                {nextGame.opponent_logo && (
                  <img
                    src={nextGame.opponent_logo}
                    alt=""
                    className="w-5 h-5 object-contain"
                  />
                )}
                <span className="text-sm text-gray-300 font-medium">
                  {nextGame.opponent_abbreviation || nextGame.opponent_name}
                </span>
              </div>
              <span className="text-xs text-accent font-medium">
                {formatDate(nextGame.date)}
              </span>
            </div>
          )}
        </>
      )}

      {/* No games available */}
      {!lastGame && !nextGame && (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">No recent or upcoming games</p>
        </div>
      )}
    </div>
  );
};
