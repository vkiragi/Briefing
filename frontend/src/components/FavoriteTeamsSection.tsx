import React, { useEffect, useState, useCallback } from 'react';
import { Star, Settings } from 'lucide-react';
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
  const [selectedGame, setSelectedGame] = useState<{ game: Game; sport: string } | null>(null);

  const fetchResults = useCallback(async () => {
    if (settings.favoriteTeams.length === 0) return;

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

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {settings.favoriteTeams.map((team, index) => {
            const isLastItem = index === settings.favoriteTeams.length - 1;
            const isOddTotal = settings.favoriteTeams.length % 2 === 1;
            const shouldSpanFull = isLastItem && isOddTotal;

            return (
              <div
                key={team.id}
                className={cn(
                  "bg-gradient-to-br from-gray-900/90 to-gray-800/50 border border-gray-700/50 rounded-xl p-3 animate-pulse",
                  shouldSpanFull && "col-span-2"
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
                  <div className="h-4 w-16 bg-gray-700 rounded" />
                </div>
                <div className="h-3 w-full bg-gray-700 rounded mb-2" />
                <div className="h-3 w-3/4 bg-gray-700 rounded" />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {results.map((result, index) => {
            const team = settings.favoriteTeams.find(t => t.id === result.team_id);
            const isLastItem = index === results.length - 1;
            const isOddTotal = results.length % 2 === 1;
            const shouldSpanFull = isLastItem && isOddTotal;

            return (
              <div key={result.team_id} className={shouldSpanFull ? "col-span-2" : ""}>
                <FavoriteTeamCard
                  result={result}
                  team={team}
                  onGameClick={(game, sport) => setSelectedGame({ game, sport })}
                />
              </div>
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
    <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/50 border border-gray-700/50 rounded-xl p-3 transition-all hover:border-accent/40 shadow-lg">
      {/* Team Header with logo and sport badge */}
      <div className="flex items-center gap-2 mb-1">
        {result.logo && (
          <img
            src={result.logo}
            alt=""
            className="w-8 h-8 object-contain flex-shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm text-white font-bold truncate leading-tight">{result.team_name}</h3>
          <span className="text-[9px] font-medium text-accent/80 uppercase tracking-wide">
            {team?.sportDisplay || result.sport}
          </span>
        </div>
      </div>

      {/* Priority: Today's Game or Live Game as main display */}
      {(hasTodayGame || isLive) && nextGame ? (
        <>
          {/* Today's Game - Main Display */}
          <button
            onClick={() => handleGameClick(nextGame, false)}
            className={cn(
              "w-full rounded-lg p-2 mb-2 text-left transition-colors cursor-pointer",
              isLive ? "bg-red-500/10 border border-red-500/30" : "bg-accent/10 border border-accent/30"
            )}
          >
            <div className="flex items-center gap-1 mb-1">
              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              <span className={cn(
                "text-[9px] uppercase tracking-wide font-semibold",
                isLive ? "text-red-400" : "text-accent"
              )}>
                {isLive ? 'LIVE' : 'Today'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {nextGame.opponent_logo && (
                <img
                  src={nextGame.opponent_logo}
                  alt=""
                  className="w-5 h-5 object-contain flex-shrink-0"
                />
              )}
              <span className="text-xs text-white font-medium truncate">
                {nextGame.is_home ? 'vs' : '@'} {nextGame.opponent_abbreviation || nextGame.opponent_name}
              </span>
            </div>
          </button>

          {/* Last Game - Small insight */}
          {lastGame && (
            <button
              onClick={() => handleGameClick(lastGame, true)}
              className="w-full flex items-center justify-between pt-1.5 border-t border-gray-700/30 hover:bg-gray-800/30 rounded transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-gray-500 uppercase">Last</span>
                {lastGame.opponent_logo && (
                  <img src={lastGame.opponent_logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className={cn(
                  "text-[10px] font-bold",
                  lastGame.result === 'W' ? "text-green-400" : lastGame.result === 'L' ? "text-red-400" : "text-gray-400"
                )}>
                  {lastGame.result}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
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
              className="w-full bg-gray-800/60 rounded-lg p-2 mb-2 text-left hover:bg-gray-800/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-gray-500 uppercase">Last Game</span>
                <span className="text-[9px] text-gray-600">{formatLastGameDate(lastGame.date)}</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  lastGame.result === 'W' ? "bg-green-500/20 text-green-400" :
                  lastGame.result === 'L' ? "bg-red-500/20 text-red-400" :
                  "bg-gray-500/20 text-gray-400"
                )}>
                  {lastGame.result === 'W' ? 'WIN' : lastGame.result === 'L' ? 'LOSS' : 'TIE'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {lastGame.opponent_logo && (
                    <img
                      src={lastGame.opponent_logo}
                      alt=""
                      className="w-5 h-5 object-contain flex-shrink-0"
                    />
                  )}
                  <span className="text-[10px] text-gray-400">
                    {lastGame.is_home ? 'vs' : '@'} {lastGame.opponent_abbreviation}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <span className={cn(
                    "text-base font-bold font-mono",
                    lastGame.result === 'W' ? "text-white" : "text-gray-400"
                  )}>
                    {lastGame.our_score}
                  </span>
                  <span className="text-gray-600 text-sm">-</span>
                  <span className={cn(
                    "text-base font-bold font-mono",
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
              "space-y-1",
              lastGame && "pt-1.5 border-t border-gray-700/30"
            )}>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-gray-500 uppercase">Next</span>
                <span className="text-[10px] text-gray-400">
                  {nextGame.is_home ? 'vs' : '@'}
                </span>
                {nextGame.opponent_logo && (
                  <img
                    src={nextGame.opponent_logo}
                    alt=""
                    className="w-4 h-4 object-contain flex-shrink-0"
                  />
                )}
                <span className="text-[10px] text-gray-300 font-medium truncate">
                  {nextGame.opponent_abbreviation || nextGame.opponent_name}
                </span>
              </div>
              <span className="text-[9px] text-accent font-medium block">
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
