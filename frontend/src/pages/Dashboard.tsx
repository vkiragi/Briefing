import { useEffect, useState, useMemo, useCallback } from "react";
import { TrendingUp, Activity, Clock, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBets } from "../context/BetContext";
import { useSettings } from "../context/SettingsContext";
import { Card } from "../components/ui/Card";
import { PropTracker } from "../components/PropTracker";
import { api } from "../lib/api";
import { Game, Bet } from "../types";
import { cn } from "../lib/utils";

export const Dashboard = () => {
  const { stats, bets, clearPendingBets } = useBets();
  const { settings, isSectionEnabled } = useSettings();
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [nflGames, setNflGames] = useState<Game[]>([]);
  const [mlbGames, setMlbGames] = useState<Game[]>([]);
  const [eplGames, setEplGames] = useState<Game[]>([]);
  const [laligaGames, setLaligaGames] = useState<Game[]>([]);
  const [uclGames, setUclGames] = useState<Game[]>([]);
  const [tennisGames, setTennisGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingNflGames, setLoadingNflGames] = useState(true);
  const [loadingMlbGames, setLoadingMlbGames] = useState(true);
  const [loadingEplGames, setLoadingEplGames] = useState(true);
  const [loadingLaligaGames, setLoadingLaligaGames] = useState(true);
  const [loadingUclGames, setLoadingUclGames] = useState(true);
  const [loadingTennisGames, setLoadingTennisGames] = useState(true);
  const [propsData, setPropsData] = useState<Map<string, any>>(new Map());
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [gamesLastUpdated, setGamesLastUpdated] = useState<Date | null>(null);
  const [nflGamesLastUpdated, setNflGamesLastUpdated] = useState<Date | null>(null);
  const [mlbGamesLastUpdated, setMlbGamesLastUpdated] = useState<Date | null>(null);
  const [eplGamesLastUpdated, setEplGamesLastUpdated] = useState<Date | null>(null);
  const [laligaGamesLastUpdated, setLaligaGamesLastUpdated] = useState<Date | null>(null);
  const [uclGamesLastUpdated, setUclGamesLastUpdated] = useState<Date | null>(null);
  const [tennisGamesLastUpdated, setTennisGamesLastUpdated] = useState<Date | null>(null);
  // Use refresh interval from settings
  const refreshInterval = settings.refreshInterval;

  // Bet types that support live tracking
  const trackableTypes = ['Prop', '1st Half', '1st Quarter', 'Team Total', 'Moneyline', 'Spread', 'Total'];

  // Get active props that need tracking (exclude expired/completed games)
  const activeProps = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return bets.filter(b => {
      // Basic requirements - must be a trackable type with required fields
      if (b.status !== 'Pending' ||
          !trackableTypes.includes(b.type) ||
          !b.event_id ||
          !b.player_name ||
          !b.market_type ||
          b.line === undefined) {
        return false;
      }
      
      // Filter out props where game has ended
      if (b.game_state === 'post' || b.game_state === 'final') {
        return false;
      }
      
      // Filter out props where prop is already decided (won/lost/push)
      if (b.prop_status === 'won' || b.prop_status === 'lost' || b.prop_status === 'push') {
        return false;
      }
      
      // Parse bet date
      const betDate = new Date(b.date);
      
      // Filter out props from past dates (games that have likely ended)
      const betDateOnly = new Date(betDate.getFullYear(), betDate.getMonth(), betDate.getDate());
      
      // If bet date is before today, it's likely expired unless we have live data
      if (betDateOnly < today) {
        // Only show if we have active live data indicating game is still ongoing
        if (b.game_state === 'in') {
          return true; // Game is still live
        }
        // Otherwise, game likely ended, exclude from tracker
        return false;
      }
      
      // Additional safety: If bet was created more than 24 hours ago and has no live data, exclude
      if (betDate < oneDayAgo && !b.game_state && !b.current_value) {
        return false;
      }
      
      // Include if game is today or in the future
      return true;
    });
  }, [bets]);

  // Combine all games (including pre-game) for matching
  const allGamesForMatching = useMemo(() => {
    return [...liveGames, ...nflGames, ...mlbGames, ...eplGames, ...laligaGames, ...uclGames, ...tennisGames];
  }, [liveGames, nflGames, mlbGames, eplGames, laligaGames, uclGames, tennisGames]);

  // Helper to match a bet to a game by matchup string
  const findMatchingGame = useCallback((bet: Bet) => {
    const matchupLower = bet.matchup.toLowerCase();
    return allGamesForMatching.find(game => {
      const homeTeam = game.home_team.toLowerCase();
      const awayTeam = game.away_team.toLowerCase();

      // Direct containment check
      if (matchupLower.includes(homeTeam) || matchupLower.includes(awayTeam)) {
        return true;
      }

      // Check parts of matchup (e.g., "New York Knicks @ Toronto Raptors")
      const parts = matchupLower.split('@').map(p => p.trim());
      if (parts.length === 2) {
        const [awayPart, homePart] = parts;
        // Check if team names contain the parts or vice versa
        if ((awayTeam.includes(awayPart) || awayPart.includes(awayTeam)) &&
            (homeTeam.includes(homePart) || homePart.includes(homeTeam))) {
          return true;
        }
      }

      // Check selection field too (for Moneyline bets)
      if (bet.selection) {
        const selectionLower = bet.selection.toLowerCase();
        if (homeTeam.includes(selectionLower) || selectionLower.includes(homeTeam) ||
            awayTeam.includes(selectionLower) || selectionLower.includes(awayTeam)) {
          return true;
        }
      }

      return false;
    });
  }, [allGamesForMatching]);

  // Get all pending bets (for the pending bets section)
  // Include ALL pending bets regardless of date - they need to be resolved
  const pendingBets = useMemo(() => {
    return bets.filter(b => {
      if (b.status !== 'Pending') return false;

      // Exclude bets where outcome is already decided in stored data
      // (These should have been resolved already)
      if (b.prop_status === 'won' || b.prop_status === 'lost' || b.prop_status === 'push') {
        return false;
      }

      return true;
    });
  }, [bets]);

  // Combine all props that need tracking
  const allPropsToTrack = useMemo(() =>
    activeProps.map(b => b.id),
    [activeProps]
  );

  // Compute enriched pending bets with prop_status from game matching
  const enrichedPendingBets = useMemo(() => {
    return pendingBets.map(bet => {
      // First check if we have live tracking data
      const liveData = propsData.get(bet.id);
      if (liveData) {
        return { ...bet, ...liveData };
      }

      // Otherwise, try to match to a game and compute prop_status
      const matchingGame = findMatchingGame(bet);
      if (matchingGame) {
        const homeScore = parseInt(matchingGame.home_score || '0');
        const awayScore = parseInt(matchingGame.away_score || '0');
        const isGameOver = matchingGame.state === 'post' || matchingGame.completed;

        // Determine prop_status for Moneyline bets
        let propStatus: string | undefined;
        if (isGameOver && bet.type === 'Moneyline' && bet.selection) {
          const selectionLower = bet.selection.toLowerCase();
          const homeTeamLower = matchingGame.home_team.toLowerCase();
          const awayTeamLower = matchingGame.away_team.toLowerCase();

          const betOnHome = selectionLower.includes(homeTeamLower) || homeTeamLower.includes(selectionLower);
          const betOnAway = selectionLower.includes(awayTeamLower) || awayTeamLower.includes(selectionLower);

          if (betOnHome) {
            propStatus = homeScore > awayScore ? 'won' : 'lost';
          } else if (betOnAway) {
            propStatus = awayScore > homeScore ? 'won' : 'lost';
          }
        }

        return {
          ...bet,
          game_state: matchingGame.state,
          prop_status: propStatus,
        };
      }

      return bet;
    });
  }, [pendingBets, propsData, findMatchingGame]);

  // Check if all pending bets have finished games (can be resolved)
  const canResolveAll = useMemo(() => {
    if (enrichedPendingBets.length === 0) return false;

    return enrichedPendingBets.every(bet => {
      // Check if bet has a decided outcome
      if (bet.prop_status === 'won' || bet.prop_status === 'lost' || bet.prop_status === 'push') {
        return true;
      }

      // Check if bet's game_state indicates finished (fallback)
      if (bet.game_state === 'post') {
        return true;
      }

      return false;
    });
  }, [enrichedPendingBets]);

  // Refresh props data
  const refreshPropsData = useCallback(async () => {
    if (allPropsToTrack.length === 0) return;
    
    setRefreshing(true);
    try {
      const result = await api.refreshProps(allPropsToTrack);
      
      setPropsData(prev => {
        const newPropsData = new Map(prev);
        result.bets.forEach((propData: any) => {
          newPropsData.set(propData.id, propData);
        });
        return newPropsData;
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh props:', error);
    } finally {
      setRefreshing(false);
    }
  }, [allPropsToTrack]);

  // Auto-refresh props based on user setting
  useEffect(() => {
    if (allPropsToTrack.length > 0) {
      refreshPropsData(); // Initial load
      
      const interval = setInterval(() => {
        refreshPropsData();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [allPropsToTrack.length, refreshPropsData, refreshInterval]); // Re-run when props to track change or interval changes

  // Fetch NBA games
  useEffect(() => {
    const fetchLive = async () => {
      try {
        // Fetch both live games and recent scores (includes completed games)
        const [liveGamesData, recentScores] = await Promise.all([
          api.getScores('nba', 6, true),
          api.getScores('nba', 10, false)  // Get recent scores including completed
        ]);

        // Combine live and completed games, deduplicating by event_id
        const seenIds = new Set<string>();
        const combinedGames: Game[] = [];

        // Add live games first
        for (const game of liveGamesData) {
          if (game.event_id && !seenIds.has(game.event_id) && game.status !== 'No live games') {
            seenIds.add(game.event_id);
            combinedGames.push(game);
          }
        }

        // Add completed/recent games
        for (const game of recentScores) {
          if (game.event_id && !seenIds.has(game.event_id)) {
            seenIds.add(game.event_id);
            combinedGames.push(game);
          }
        }

        if (combinedGames.length === 0) {
          const scheduled = await api.getSchedule('nba', 6);
          setLiveGames(scheduled);
        } else {
          setLiveGames(combinedGames);
        }
        setGamesLastUpdated(new Date());
      } catch (e) {
        console.error("Failed to fetch NBA games", e);
      } finally {
        setLoadingGames(false);
      }
    };
    fetchLive();

    // Auto-refresh games based on refresh interval
    const interval = setInterval(fetchLive, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Fetch NFL games
  useEffect(() => {
    const fetchNfl = async () => {
      try {
        const games = await api.getScores('nfl', 6, true);
        if (!games || games.length === 0 || (games.length === 1 && games[0].status === 'No live games')) {
            const scheduled = await api.getSchedule('nfl', 6);
            setNflGames(scheduled);
        } else {
            setNflGames(games);
        }
        setNflGamesLastUpdated(new Date());
      } catch (e) {
        console.error("Failed to fetch NFL games", e);
      } finally {
        setLoadingNflGames(false);
      }
    };
    fetchNfl();
    
    // Auto-refresh NFL games based on refresh interval
    const interval = setInterval(fetchNfl, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Fetch MLB games
  useEffect(() => {
    const fetchMlb = async () => {
      try {
        const games = await api.getScores('mlb', 6, true);
        if (!games || games.length === 0 || (games.length === 1 && games[0].status === 'No live games')) {
            const scheduled = await api.getSchedule('mlb', 6);
            setMlbGames(scheduled);
        } else {
            setMlbGames(games);
        }
        setMlbGamesLastUpdated(new Date());
      } catch (e) {
        console.error("Failed to fetch MLB games", e);
      } finally {
        setLoadingMlbGames(false);
      }
    };
    fetchMlb();
    
    const interval = setInterval(fetchMlb, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Fetch Premier League games
  useEffect(() => {
    const fetchEpl = async () => {
      try {
        const games = await api.getScores('epl', 6, true);
        if (!games || games.length === 0 || (games.length === 1 && games[0].status === 'No live games')) {
            const scheduled = await api.getSchedule('epl', 6);
            setEplGames(scheduled);
        } else {
            setEplGames(games);
        }
        setEplGamesLastUpdated(new Date());
      } catch (e) {
        console.error("Failed to fetch EPL games", e);
      } finally {
        setLoadingEplGames(false);
      }
    };
    fetchEpl();

    const interval = setInterval(fetchEpl, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Fetch La Liga games
  useEffect(() => {
    const fetchLaliga = async () => {
      try {
        const games = await api.getScores('laliga', 6, true);
        if (!games || games.length === 0 || (games.length === 1 && games[0].status === 'No live games')) {
            const scheduled = await api.getSchedule('laliga', 6);
            setLaligaGames(scheduled);
        } else {
            setLaligaGames(games);
        }
        setLaligaGamesLastUpdated(new Date());
      } catch (e) {
        console.error("Failed to fetch La Liga games", e);
      } finally {
        setLoadingLaligaGames(false);
      }
    };
    fetchLaliga();

    const interval = setInterval(fetchLaliga, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Fetch Champions League games
  useEffect(() => {
    const fetchUcl = async () => {
      try {
        // Fetch both live/recent scores and scheduled games
        const [liveGamesData, recentScores, scheduled] = await Promise.all([
          api.getScores('ucl', 6, true),
          api.getScores('ucl', 10, false),
          api.getSchedule('ucl', 6)
        ]);

        // Combine live, recent, and scheduled games, deduplicating by event_id
        const seenIds = new Set<string>();
        const combinedGames: Game[] = [];

        // Add live games first
        for (const game of liveGamesData) {
          if (game.event_id && !seenIds.has(game.event_id) && game.status !== 'No live games') {
            seenIds.add(game.event_id);
            combinedGames.push(game);
          }
        }

        // Add recent/completed games
        for (const game of recentScores) {
          if (game.event_id && !seenIds.has(game.event_id)) {
            seenIds.add(game.event_id);
            combinedGames.push(game);
          }
        }

        // Add scheduled games
        for (const game of scheduled) {
          if (game.event_id && !seenIds.has(game.event_id) && game.state !== 'tbd') {
            seenIds.add(game.event_id);
            combinedGames.push(game);
          } else if (!game.event_id && game.state === 'pre') {
            // Include scheduled games without event_id
            combinedGames.push(game);
          }
        }

        if (combinedGames.length > 0) {
          setUclGames(combinedGames.slice(0, 10));
        } else {
          setUclGames([{
            home_team: 'No games available',
            away_team: 'Check back later',
            home_score: '-',
            away_score: '-',
            status: 'TBD',
            completed: false,
            date: '-',
            state: 'tbd',
          }]);
        }
        setUclGamesLastUpdated(new Date());
      } catch (e) {
        console.error("Failed to fetch UCL games", e);
      } finally {
        setLoadingUclGames(false);
      }
    };
    fetchUcl();

    const interval = setInterval(fetchUcl, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Fetch Tennis games
  useEffect(() => {
    const fetchTennis = async () => {
      try {
        // Fetch all tennis matches - this includes live, recent, AND upcoming matches
        const games = await api.getScores('tennis-atp-singles', 10, false);
        if (games && games.length > 0 && games[0].state !== 'no_live') {
          setTennisGames(games);
        } else {
          // Fallback to schedule if no matches at all
          const scheduled = await api.getSchedule('tennis-atp-singles', 6);
          setTennisGames(scheduled);
        }
        setTennisGamesLastUpdated(new Date());
      } catch (e) {
        console.error("Failed to fetch Tennis games", e);
      } finally {
        setLoadingTennisGames(false);
      }
    };
    fetchTennis();

    const interval = setInterval(fetchTennis, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Helper function to format game time based on sport
  const formatGameTime = (game: Game, sport: string) => {
    if (game.state === 'pre') {
      // Format scheduled game time in PST
      if (!game.date || game.date === 'TBD' || game.date === 'Unknown date') {
        return game.date || 'TBD';
      }
      try {
        const date = new Date(game.date);
        if (isNaN(date.getTime())) {
          return game.date;
        }
        const pstFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Los_Angeles',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        return pstFormatter.format(date) + ' PST';
      } catch {
        return game.date || 'TBD';
      }
    }
    
    if (game.state === 'post' || game.completed) {
      return 'Final';
    }
    
    // Tennis uses sets instead of quarters/periods
    if (sport.includes('tennis')) {
      const statusLower = (game.status || '').toLowerCase();
      if (statusLower.includes('set')) {
        return game.status || 'Live';
      }
      return game.status || 'Live';
    }
    
    // Check for halftime
    const statusLower = (game.status || '').toLowerCase();
    const isHalftime = 
      statusLower.includes('half') || 
      statusLower.includes('halftime') ||
      (game.period === 2 && game.clock_seconds === 0 && game.state === 'in');
    
    if (isHalftime) {
      return 'Halftime';
    }
    
    // Live game - show period/quarter and time
    if (game.state === 'in' && game.period) {
      const period = sport === 'mlb' ? `Inning ${game.period}` : `Q${game.period}`;
      
      // If we have clock_seconds, format as MM:SS
      if (game.clock_seconds !== undefined && game.clock_seconds > 0) {
        const minutes = Math.floor(game.clock_seconds / 60);
        const seconds = game.clock_seconds % 60;
        const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        return `${period} ${formattedTime}`;
      }
      
      // Fallback to display_clock if available
      if (game.display_clock) {
        return `${period} ${game.display_clock}`;
      }
      
      return period;
    }
    
    return game.display_clock || game.status || 'Live';
  };

  // Helper function to render game cards
  const renderGameSection = (
    title: string,
    games: Game[],
    loading: boolean,
    lastUpdated: Date | null,
    sport: string
  ) => {
    const hasLiveGames = games.some(game => game.state === 'in');
    const isCompact = settings.compactMode;

    return (
      <div className={cn("space-y-4", isCompact && "space-y-2")}>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className={cn("font-bold text-white", isCompact ? "text-lg" : "text-xl")}>{title}</h2>
            {hasLiveGames && (
              <>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  Live
                </span>
                {lastUpdated && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={12} />
                    <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                  </div>
                )}
              </>
            )}
          </div>
          {/* Accent line under title */}
          <div className="w-full h-0.5 bg-accent/40 rounded-full" />
        </div>

        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 gap-4",
          isCompact ? "lg:grid-cols-4 gap-2" : "lg:grid-cols-3 gap-4"
        )}>
          {loading ? (
            <>
              {[1,2,3,4,5].map(i => (
                <div key={i} className={cn("bg-card/50 animate-pulse rounded-lg", isCompact ? "h-16" : "h-24")} />
              ))}
            </>
          ) : games.length > 0 ? (
            games.map((game, i) => {
              const isLive = game.state === 'in';
              const isTennis = sport === 'tennis';
              const showTournament = isTennis && game.tournament && game.match_type !== 'tournament';
              const isTennisMatch = isTennis && game.match_type !== 'tournament';
              const isTennisTournament = isTennis && game.match_type === 'tournament';

              // For upcoming tennis tournaments (no matches yet), show a clean card
              if (isTennisTournament) {
                return (
                  <div
                    key={i}
                    className={cn(
                      "bg-card border border-border rounded-lg hover:bg-card/80 transition-all",
                      isCompact ? "p-2" : "p-4"
                    )}
                  >
                    <div className="text-center">
                      <div className={cn("font-mono text-gray-400", isCompact ? "text-xs mb-1" : "text-sm mb-2")}>
                        {formatGameTime(game, sport)}
                      </div>
                      <div className={cn("font-semibold text-white", isCompact ? "text-sm" : "text-base")}>
                        {game.tournament || game.home_team}
                      </div>
                      {!isCompact && (
                        <div className="text-xs text-gray-500 mt-1">
                          Upcoming Tournament
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // For tennis matches, render a special layout
              if (isTennisMatch) {
                return (
                  <div
                    key={i}
                    className={cn(
                      "bg-card border border-border rounded-lg hover:bg-card/80 transition-all",
                      isCompact ? "p-2" : "p-4"
                    )}
                  >
                    {/* Tournament name */}
                    {showTournament && (
                      <div className="text-xs text-gray-400 font-medium mb-2 truncate">
                        {game.tournament}
                      </div>
                    )}
                    {/* Status/Time */}
                    <div className={cn(
                      "flex items-center mb-3",
                      isLive ? "justify-between" : "justify-center"
                    )}>
                      {isLive && (
                        <span className="text-xs uppercase font-medium text-red-500">
                          Live
                        </span>
                      )}
                      <span className="text-sm font-mono font-semibold text-gray-400">
                        {formatGameTime(game, sport)}
                      </span>
                    </div>
                    {/* Player 1 */}
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {game.home_winner && (
                          <span className="text-green-500 text-sm">✓</span>
                        )}
                        <span className={cn(
                          "text-sm truncate",
                          game.home_winner ? "font-semibold text-white" : "text-gray-400"
                        )}>{game.home_team}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className={cn(
                          "text-lg font-mono font-bold w-4 text-center",
                          game.home_winner ? "text-white" : "text-gray-400"
                        )}>{game.home_score}</span>
                        {game.home_set_scores && (
                          <span className="text-xs font-mono text-gray-500 whitespace-nowrap">
                            {game.home_set_scores}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Player 2 */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {game.away_winner && (
                          <span className="text-green-500 text-sm">✓</span>
                        )}
                        <span className={cn(
                          "text-sm truncate",
                          game.away_winner ? "font-semibold text-white" : "text-gray-400"
                        )}>{game.away_team}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className={cn(
                          "text-lg font-mono font-bold w-4 text-center",
                          game.away_winner ? "text-white" : "text-gray-400"
                        )}>{game.away_score}</span>
                        {game.away_set_scores && (
                          <span className="text-xs font-mono text-gray-500 whitespace-nowrap">
                            {game.away_set_scores}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Standard layout for other sports
              return (
                <div
                  key={i}
                  className={cn(
                    "bg-card border border-border rounded-lg hover:bg-card/80 transition-all",
                    isCompact ? "p-2" : "p-4"
                  )}
                >
                  {/* Tournament name for tennis tournaments list */}
                  {showTournament && !isCompact && (
                    <div className="text-xs text-accent font-medium mb-2 truncate">
                      {game.tournament}
                    </div>
                  )}
                  <div className={cn(
                    "flex items-center",
                    isCompact ? "mb-1" : "mb-3",
                    isLive ? "justify-between" : "justify-center"
                  )}>
                    {isLive && (
                      <span className={cn("uppercase font-medium text-red-500", isCompact ? "text-[10px]" : "text-xs")}>
                        Live
                      </span>
                    )}
                    <span className={cn("font-mono font-semibold text-gray-400", isCompact ? "text-xs" : "text-sm")}>
                      {formatGameTime(game, sport)}
                    </span>
                  </div>
                  <div className={cn("flex justify-between items-center", isCompact ? "mb-1" : "mb-2")}>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {game.home_logo && (
                        <img
                          src={game.home_logo}
                          alt={game.home_team}
                          className={cn("object-contain flex-shrink-0", isCompact ? "w-5 h-5" : "w-6 h-6")}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <span className={cn("font-semibold text-white truncate", isCompact ? "text-sm" : "text-base")}>{game.home_team}</span>
                    </div>
                    <span className={cn("font-mono font-semibold text-white ml-2", isCompact ? "text-base" : "text-xl")}>{game.home_score}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {game.away_logo && (
                        <img
                          src={game.away_logo}
                          alt={game.away_team}
                          className={cn("object-contain flex-shrink-0", isCompact ? "w-5 h-5" : "w-6 h-6")}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <span className={cn("font-semibold text-white truncate", isCompact ? "text-sm" : "text-base")}>{game.away_team}</span>
                    </div>
                    <span className={cn("font-mono font-semibold text-white ml-2", isCompact ? "text-base" : "text-xl")}>{game.away_score}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-gray-500 text-sm text-center py-8 col-span-full">No {title} games available</div>
          )}
        </div>

      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="px-2 md:px-4 py-2 md:py-4 max-w-[2400px] mx-auto space-y-6"
    >
      {/* Header Bar */}
      <div className="text-center p-2 md:p-4 mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Briefing Sports Tracking
        </h1>
        <p className="text-sm md:text-base text-gray-400">
          Your comprehensive sports betting dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Win Rate Card */}
        <Card>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Win Rate</h3>
            <div className="p-2 bg-blue-500/10 rounded-full">
              <Activity size={16} className="text-blue-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">
            {stats.wins}W - {stats.losses}L
          </div>
        </Card>

        {/* ROI Card */}
        <Card>
           <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-sm font-medium">ROI</h3>
            <div className="p-2 bg-purple-500/10 rounded-full">
              <TrendingUp size={16} className="text-purple-500" />
            </div>
          </div>
          <div className={cn("text-3xl font-bold mb-1", stats.roi >= 0 ? "text-accent" : "text-red-500")}>
            {stats.roi.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">
            Return on investment
          </div>
        </Card>
        
         {/* Pending Card */}
         <Card>
           <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Pending Bets</h3>
            <div className="p-2 bg-yellow-500/10 rounded-full">
              <Activity size={16} className="text-yellow-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {stats.pending}
          </div>
          <div className="text-xs text-gray-500">
            Active wagers
          </div>
        </Card>
      </div>

      {/* Pending Bets Section */}
      {pendingBets.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">Pending Bets</h2>
              <button
                onClick={refreshPropsData}
                disabled={refreshing}
                className="text-sm text-accent hover:underline disabled:opacity-50"
              >
                {refreshing ? 'Refreshing...' : 'Refresh Now'}
              </button>
              {lastUpdated && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={12} />
                  <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => clearPendingBets(enrichedPendingBets)}
              disabled={!canResolveAll}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                canResolveAll
                  ? "text-gray-400 hover:text-orange-500"
                  : "text-gray-600 cursor-not-allowed"
              )}
              title={canResolveAll ? "Resolve all pending bets based on their outcomes" : "Wait for all games to finish"}
            >
              <Trash2 size={14} />
              <span>Resolve All</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
                {pendingBets.map(bet => {
                  const liveData = propsData.get(bet.id);
                  let enrichedBet = liveData ? { ...bet, ...liveData } : bet;

                  // For bets without tracking data, try to match to a game
                  if (!liveData) {
                    const matchingGame = findMatchingGame(bet);
                    if (matchingGame) {
                      const homeScore = parseInt(matchingGame.home_score || '0');
                      const awayScore = parseInt(matchingGame.away_score || '0');
                      const totalScore = homeScore + awayScore;
                      const isGameOver = matchingGame.state === 'post' || matchingGame.completed;
                      const isLive = matchingGame.state === 'in';
                      const isPreGame = matchingGame.state === 'pre';

                      // Determine prop_status for Moneyline bets (only for live/finished games)
                      let propStatus: string | undefined;
                      if ((isLive || isGameOver) && bet.type === 'Moneyline' && bet.selection) {
                        const selectionLower = bet.selection.toLowerCase();
                        const homeTeamLower = matchingGame.home_team.toLowerCase();
                        const awayTeamLower = matchingGame.away_team.toLowerCase();

                        // Check which team was selected
                        const betOnHome = selectionLower.includes(homeTeamLower) || homeTeamLower.includes(selectionLower);
                        const betOnAway = selectionLower.includes(awayTeamLower) || awayTeamLower.includes(selectionLower);

                        if (betOnHome) {
                          const isWinning = homeScore > awayScore;
                          propStatus = isGameOver ? (isWinning ? 'won' : 'lost') : (isWinning ? 'live_hit' : 'live_miss');
                        } else if (betOnAway) {
                          const isWinning = awayScore > homeScore;
                          propStatus = isGameOver ? (isWinning ? 'won' : 'lost') : (isWinning ? 'live_hit' : 'live_miss');
                        }
                      }

                      // Determine game status text
                      let gameStatusText = matchingGame.status;
                      if (isGameOver) {
                        gameStatusText = 'Final';
                      } else if (isLive && matchingGame.display_clock) {
                        gameStatusText = `Q${matchingGame.period} ${matchingGame.display_clock}`;
                      }

                      enrichedBet = {
                        ...bet,
                        game_state: matchingGame.state,
                        game_status_text: gameStatusText,
                        current_value_str: isPreGame ? undefined : `${awayScore}-${homeScore}`,
                        current_value: bet.type === 'Total' && !isPreGame ? totalScore : undefined,
                        prop_status: propStatus,
                        // Use the game's actual date for better accuracy
                        date: matchingGame.date || bet.date,
                      };
                    }
                  }

                  return (
                    <motion.div
                      key={bet.id}
                      initial={false}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <PropTracker bet={enrichedBet} />
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Sports Sections - rendered based on settings order and enabled state */}
      {settings.homeScreen.sectionOrder.map(sectionId => {
        if (!isSectionEnabled(sectionId)) return null;

        switch (sectionId) {
          case 'nba':
            return <div key="nba">{renderGameSection('NBA Action', liveGames, loadingGames, gamesLastUpdated, 'nba')}</div>;
          case 'nfl':
            return <div key="nfl">{renderGameSection('NFL Action', nflGames, loadingNflGames, nflGamesLastUpdated, 'nfl')}</div>;
          case 'mlb':
            return <div key="mlb">{renderGameSection('MLB Action', mlbGames, loadingMlbGames, mlbGamesLastUpdated, 'mlb')}</div>;
          case 'epl':
            return <div key="epl">{renderGameSection('Premier League', eplGames, loadingEplGames, eplGamesLastUpdated, 'epl')}</div>;
          case 'laliga':
            return <div key="laliga">{renderGameSection('La Liga', laligaGames, loadingLaligaGames, laligaGamesLastUpdated, 'laliga')}</div>;
          case 'ucl':
            return <div key="ucl">{renderGameSection('Champions League', uclGames, loadingUclGames, uclGamesLastUpdated, 'ucl')}</div>;
          case 'tennis':
            return <div key="tennis">{renderGameSection('Tennis Action', tennisGames, loadingTennisGames, tennisGamesLastUpdated, 'tennis')}</div>;
          default:
            return null;
        }
      })}
    </motion.div>
  );
};
