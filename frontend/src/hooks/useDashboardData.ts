import { useEffect, useState, useMemo, useCallback } from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay } from "date-fns";
import { useBets } from "../context/BetContext";
import { useSettings, SectionId } from "../context/SettingsContext";
import { api } from "../lib/api";
import { Game, Bet, SPORT_NAVIGATION, NFLWeekInfo } from "../types";
import {
  LEAGUE_CONFIG,
  LeagueState,
  F1State,
  BoxingState,
  getCachedData,
  setCachedData,
  isCacheValid,
} from "../lib/leagueConfig";

export const useDashboardData = (selectedSportFilter: string) => {
  const { bets, clearPendingBets } = useBets();
  const { settings, isSectionEnabled } = useSettings();

  // Dynamic state for all leagues - initialize from cache if available
  const [leagueData, setLeagueData] = useState<Record<string, LeagueState>>(() => {
    const initial: Record<string, LeagueState> = {};
    const cache = getCachedData();

    Object.keys(LEAGUE_CONFIG).forEach(id => {
      const cached = cache[id];
      if (cached && cached.games.length > 0) {
        initial[id] = {
          games: cached.games,
          loading: !isCacheValid(cached),
          lastUpdated: new Date(cached.timestamp)
        };
      } else {
        initial[id] = { games: [], loading: true, lastUpdated: null };
      }
    });
    return initial;
  });

  const [propsData, setPropsData] = useState<Map<string, any>>(new Map());
  const [parlayLegsData, setParlayLegsData] = useState<Map<string, any[]>>(new Map());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Date navigation state per league
  const [leagueDates, setLeagueDates] = useState<Record<string, Date>>(() => {
    const initial: Record<string, Date> = {};
    const today = new Date();
    Object.keys(LEAGUE_CONFIG).forEach(id => {
      initial[id] = today;
    });
    return initial;
  });

  // NFL week info cache
  const [nflWeekInfo, setNflWeekInfo] = useState<NFLWeekInfo | null>(null);

  // F1 races state
  const [f1Data, setF1Data] = useState<F1State>({ races: [], loading: true, lastUpdated: null });

  // Boxing fights state
  const [boxingData, setBoxingData] = useState<BoxingState>({ fights: [], loading: true, lastUpdated: null });

  // Boxing date navigation state
  const [boxingSelectedDate, setBoxingSelectedDate] = useState<Date>(new Date());

  // Standings data
  const [nbaStandings, setNbaStandings] = useState<Map<string, { wins: string; losses: string; rank: number }>>(new Map());
  const [nflStandings, setNflStandings] = useState<Map<string, { wins: string; losses: string; ties: string; rank: number }>>(new Map());

  const refreshInterval = settings.refreshInterval;

  // Bet types that support live tracking
  const trackableTypes = ['Prop', '1st Half', '1st Quarter', 'Team Total', 'Moneyline', 'Spread', 'Total'];

  // Get active props that need tracking
  const activeProps = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return bets.filter(b => {
      const hasPlayerInfo = b.player_name || (b.is_combined && b.combined_players && b.combined_players.length > 0);

      if (b.status !== 'Pending' ||
          !trackableTypes.includes(b.type) ||
          !b.event_id ||
          !hasPlayerInfo ||
          !b.market_type ||
          b.line === undefined) {
        return false;
      }

      if (b.game_state === 'post' || b.game_state === 'final') {
        return false;
      }

      if (b.prop_status === 'won' || b.prop_status === 'lost' || b.prop_status === 'push') {
        return false;
      }

      const betDate = new Date(b.date);
      const betDateOnly = new Date(betDate.getFullYear(), betDate.getMonth(), betDate.getDate());

      if (betDateOnly < today) {
        if (b.game_state === 'in') {
          return true;
        }
        return false;
      }

      if (betDate < oneDayAgo && !b.game_state && !b.current_value) {
        return false;
      }

      return true;
    });
  }, [bets]);

  // Combine all games for matching
  const allGamesForMatching = useMemo(() => {
    return Object.values(leagueData).flatMap(data => data.games);
  }, [leagueData]);

  // Helper to match a bet to a game by matchup string
  const findMatchingGame = useCallback((bet: Bet) => {
    const matchupLower = bet.matchup.toLowerCase();
    return allGamesForMatching.find(game => {
      const homeTeam = game.home_team.toLowerCase();
      const awayTeam = game.away_team.toLowerCase();

      if (matchupLower.includes(homeTeam) || matchupLower.includes(awayTeam)) {
        return true;
      }

      const parts = matchupLower.split('@').map(p => p.trim());
      if (parts.length === 2) {
        const [awayPart, homePart] = parts;
        if ((awayTeam.includes(awayPart) || awayPart.includes(awayTeam)) &&
            (homeTeam.includes(homePart) || homePart.includes(homeTeam))) {
          return true;
        }
      }

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

  // Get all pending bets
  const pendingBets = useMemo(() => {
    return bets.filter(b => {
      if (b.status !== 'Pending') return false;
      if (b.prop_status === 'won' || b.prop_status === 'lost' || b.prop_status === 'push') {
        return false;
      }
      return true;
    });
  }, [bets]);

  // Filter pending bets by selected sport
  const filteredPendingBets = useMemo(() => {
    if (selectedSportFilter === 'home') return pendingBets;
    return pendingBets.filter(bet => bet.sport === selectedSportFilter);
  }, [pendingBets, selectedSportFilter]);

  // Filter sections to render based on selected sport
  const sectionsToRender = useMemo((): SectionId[] => {
    if (selectedSportFilter === 'home') return settings.homeScreen.sectionOrder;
    if (LEAGUE_CONFIG[selectedSportFilter]) {
      return [selectedSportFilter as SectionId];
    }
    return [];
  }, [selectedSportFilter, settings.homeScreen.sectionOrder]);

  // Combine all props that need tracking
  const allPropsToTrack = useMemo(() =>
    activeProps.map(b => b.id),
    [activeProps]
  );

  // Get pending parlays that need leg tracking
  const parlaysToTrack = useMemo(() => {
    const parlays = pendingBets.filter(b => b.type === 'Parlay' && b.legs && b.legs.length > 0);
    const trackable = parlays.filter(b => b.legs!.some((leg: any) => leg.event_id));
    return trackable.map(b => b.id);
  }, [pendingBets]);

  // Compute enriched pending bets with prop_status from game matching
  const enrichedPendingBets = useMemo(() => {
    return pendingBets.map(bet => {
      if (bet.type === 'Parlay') {
        const updatedLegs = parlayLegsData.get(bet.id);
        if (updatedLegs) {
          return { ...bet, legs: updatedLegs };
        }
        return bet;
      }

      const liveData = propsData.get(bet.id);
      if (liveData) {
        return { ...bet, ...liveData };
      }

      const matchingGame = findMatchingGame(bet);
      if (matchingGame) {
        const homeScore = parseInt(matchingGame.home_score || '0');
        const awayScore = parseInt(matchingGame.away_score || '0');
        const isGameOver = matchingGame.state === 'post' || matchingGame.completed;

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
  }, [pendingBets, propsData, parlayLegsData, findMatchingGame]);

  // Check if all pending bets have finished games
  const canResolveAll = useMemo(() => {
    if (enrichedPendingBets.length === 0) return false;

    return enrichedPendingBets.every(bet => {
      if (bet.prop_status === 'won' || bet.prop_status === 'lost' || bet.prop_status === 'push') {
        return true;
      }
      if (bet.game_state === 'post') {
        return true;
      }
      return false;
    });
  }, [enrichedPendingBets]);

  // Refresh props data
  const refreshPropsData = useCallback(async () => {
    const hasPropsToRefresh = allPropsToTrack.length > 0;
    const hasParlaysToRefresh = parlaysToTrack.length > 0;

    if (!hasPropsToRefresh && !hasParlaysToRefresh) return;

    try {
      const [propsResult, parlaysResult] = await Promise.all([
        hasPropsToRefresh ? api.refreshProps(allPropsToTrack) : Promise.resolve({ bets: [] }),
        hasParlaysToRefresh ? api.refreshParlayLegs(parlaysToTrack) : Promise.resolve({ parlays: [] }),
      ]);

      if (propsResult.bets.length > 0) {
        setPropsData(prev => {
          const newPropsData = new Map(prev);
          propsResult.bets.forEach((propData: any) => {
            newPropsData.set(propData.id, propData);
          });
          return newPropsData;
        });
      }

      if (parlaysResult.parlays.length > 0) {
        setParlayLegsData(prev => {
          const newParlayData = new Map(prev);
          parlaysResult.parlays.forEach((parlay: any) => {
            newParlayData.set(parlay.id, parlay.legs);
          });
          return newParlayData;
        });
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh props:', error);
    }
  }, [allPropsToTrack, parlaysToTrack]);

  // Auto-refresh props
  useEffect(() => {
    if (allPropsToTrack.length > 0 || parlaysToTrack.length > 0) {
      refreshPropsData();

      const interval = setInterval(() => {
        refreshPropsData();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [allPropsToTrack.length, parlaysToTrack.length, refreshPropsData, refreshInterval]);

  // Fetch F1 races
  const fetchF1Data = useCallback(async () => {
    try {
      const races = await api.getF1Races(10);
      setF1Data({
        races,
        loading: false,
        lastUpdated: new Date()
      });
    } catch (e) {
      console.error('Failed to fetch F1 races', e);
      setF1Data(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Fetch Boxing fights
  const fetchBoxingData = useCallback(async () => {
    try {
      const fights = await api.getBoxingFights(10);
      setBoxingData({
        fights,
        loading: false,
        lastUpdated: new Date()
      });
    } catch (e) {
      console.error('Failed to fetch boxing fights', e);
      setBoxingData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Fetch NBA standings
  const fetchNbaStandings = useCallback(async () => {
    try {
      const standings = await api.getStandings('nba');
      const standingsMap = new Map<string, { wins: string; losses: string; rank: number }>();

      Object.values(standings).forEach(conference => {
        conference.forEach(team => {
          standingsMap.set(team.team.toLowerCase(), {
            wins: team.wins,
            losses: team.losses,
            rank: team.rank
          });
        });
      });

      setNbaStandings(standingsMap);
    } catch (e) {
      console.error('Failed to fetch NBA standings', e);
    }
  }, []);

  // Fetch NFL standings
  const fetchNflStandings = useCallback(async () => {
    try {
      const standings = await api.getStandings('nfl');
      const standingsMap = new Map<string, { wins: string; losses: string; ties: string; rank: number }>();

      Object.values(standings).forEach(conference => {
        conference.forEach((team: { team: string; wins: string; losses: string; ties?: string; rank: number }) => {
          standingsMap.set(team.team.toLowerCase(), {
            wins: team.wins,
            losses: team.losses,
            ties: team.ties || '0',
            rank: team.rank
          });
        });
      });

      setNflStandings(standingsMap);
    } catch (e) {
      console.error('Failed to fetch NFL standings', e);
    }
  }, []);

  // Generic fetch function for all leagues
  const fetchLeagueData = useCallback(async (leagueId: string, dateOverride?: Date) => {
    const config = LEAGUE_CONFIG[leagueId];
    if (!config) return;

    if (config.isF1) {
      await fetchF1Data();
      return;
    }

    if (config.isBoxing) {
      await fetchBoxingData();
      return;
    }

    const targetDate = dateOverride || leagueDates[leagueId] || new Date();
    const isToday = isSameDay(targetDate, new Date());
    const dateParam = isToday ? undefined : format(targetDate, 'yyyyMMdd');

    try {
      const [scoresData, scheduled] = await Promise.all([
        api.getScores(config.apiId, 12, false, dateParam),
        api.getSchedule(config.apiId, 8, dateParam)
      ]);

      const seenIds = new Set<string>();
      const combinedGames: Game[] = [];

      for (const game of scoresData) {
        if (game.event_id && !seenIds.has(game.event_id) && game.status !== 'No live games') {
          seenIds.add(game.event_id);
          combinedGames.push(game);
        }
      }

      for (const game of scheduled) {
        if (game.event_id && !seenIds.has(game.event_id) && game.state !== 'tbd') {
          seenIds.add(game.event_id);
          combinedGames.push(game);
        } else if (!game.event_id && game.state === 'pre') {
          combinedGames.push(game);
        }
      }

      const sortedGames = [...combinedGames].sort((a, b) => {
        const aIsLive = a.state === 'in' ? 1 : 0;
        const bIsLive = b.state === 'in' ? 1 : 0;
        return bIsLive - aIsLive;
      });

      const finalGames = sortedGames.length > 0 ? sortedGames.slice(0, 10) : [];

      setLeagueData(prev => ({
        ...prev,
        [leagueId]: {
          games: finalGames,
          loading: false,
          lastUpdated: new Date()
        }
      }));

      if (isToday && finalGames.length > 0) {
        setCachedData(leagueId, finalGames);
      }
    } catch (e) {
      console.error(`Failed to fetch ${config.title} games`, e);
      setLeagueData(prev => ({
        ...prev,
        [leagueId]: { ...prev[leagueId], loading: false }
      }));
    }
  }, [leagueDates, fetchF1Data, fetchBoxingData]);

  // Date navigation handlers
  const handleDateChange = useCallback((leagueId: string, newDate: Date) => {
    setLeagueDates(prev => ({
      ...prev,
      [leagueId]: newDate
    }));
    setLeagueData(prev => ({
      ...prev,
      [leagueId]: { ...prev[leagueId], loading: true }
    }));
    fetchLeagueData(leagueId, newDate);

    if (leagueId === 'nfl') {
      api.getNFLWeekInfo(format(newDate, 'yyyyMMdd'))
        .then(info => setNflWeekInfo(info))
        .catch(console.error);
    }
  }, [fetchLeagueData]);

  const handlePrevious = useCallback((leagueId: string) => {
    const navType = SPORT_NAVIGATION[leagueId] || 'daily';
    const currentDate = leagueDates[leagueId] || new Date();

    const newDate = navType === 'daily'
      ? subDays(currentDate, 1)
      : subWeeks(currentDate, 1);

    handleDateChange(leagueId, newDate);
  }, [leagueDates, handleDateChange]);

  const handleNext = useCallback((leagueId: string) => {
    const navType = SPORT_NAVIGATION[leagueId] || 'daily';
    const currentDate = leagueDates[leagueId] || new Date();

    const newDate = navType === 'daily'
      ? addDays(currentDate, 1)
      : addWeeks(currentDate, 1);

    handleDateChange(leagueId, newDate);
  }, [leagueDates, handleDateChange]);

  const handleToday = useCallback((leagueId: string) => {
    handleDateChange(leagueId, new Date());
  }, [handleDateChange]);

  // Generate display label for date navigation
  const getDateDisplayLabel = useCallback((leagueId: string): string => {
    const selectedDate = leagueDates[leagueId] || new Date();
    const navType = SPORT_NAVIGATION[leagueId] || 'daily';
    const today = new Date();

    if (leagueId === 'nfl' && nflWeekInfo && nflWeekInfo.week_number) {
      return nflWeekInfo.display_label;
    }

    if (navType === 'daily') {
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const selectedStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const diffDays = Math.round((selectedStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === -1) return 'Yesterday';
      if (diffDays === 1) return 'Tomorrow';

      return format(selectedDate, 'EEE, MMM d');
    }

    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
  }, [leagueDates, nflWeekInfo]);

  // Helper to get team record from standings
  const getTeamRecord = useCallback((teamName: string, sport: string): string | null => {
    const teamLower = teamName.toLowerCase();
    const lastWord = teamLower.split(' ').pop() || '';

    if (sport === 'nba' && nbaStandings.size > 0) {
      let record = nbaStandings.get(teamLower);
      if (record) return `${record.wins}-${record.losses}`;

      for (const [name, rec] of nbaStandings) {
        if (name.endsWith(lastWord) || name.includes(teamLower) || teamLower.includes(name)) {
          return `${rec.wins}-${rec.losses}`;
        }
      }
    }

    if (sport === 'nfl' && nflStandings.size > 0) {
      let record = nflStandings.get(teamLower);
      if (record) {
        const ties = parseInt(record.ties);
        return ties > 0 ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
      }

      for (const [name, rec] of nflStandings) {
        if (name.endsWith(lastWord) || name.includes(teamLower) || teamLower.includes(name)) {
          const ties = parseInt(rec.ties);
          return ties > 0 ? `${rec.wins}-${rec.losses}-${rec.ties}` : `${rec.wins}-${rec.losses}`;
        }
      }
    }

    return null;
  }, [nbaStandings, nflStandings]);

  // Fetch leagues in batches
  useEffect(() => {
    const enabledLeagues = settings.homeScreen.sectionOrder.filter(id =>
      isSectionEnabled(id) && LEAGUE_CONFIG[id]
    );

    const selectedSportId = selectedSportFilter !== 'home' && LEAGUE_CONFIG[selectedSportFilter]
      ? selectedSportFilter
      : null;

    const allLeaguesToFetch = selectedSportId && !enabledLeagues.includes(selectedSportId as SectionId)
      ? [...enabledLeagues, selectedSportId as SectionId]
      : enabledLeagues;

    const BATCH_SIZE = 2;
    const BATCH_DELAY = 500;

    let cancelled = false;
    let isRefreshing = false;
    const cache = getCachedData();

    const fetchBatches = async (forceRefresh = false) => {
      if (isRefreshing) {
        return;
      }
      isRefreshing = true;

      try {
        const leaguesToFetch = forceRefresh
          ? allLeaguesToFetch
          : allLeaguesToFetch.filter(id => !isCacheValid(cache[id]));

        if (leaguesToFetch.length === 0) return;

        for (let i = 0; i < leaguesToFetch.length; i += BATCH_SIZE) {
          if (cancelled) break;

          const batch = leaguesToFetch.slice(i, i + BATCH_SIZE);

          for (const leagueId of batch) {
            if (cancelled) break;
            try {
              await fetchLeagueData(leagueId);
            } catch (e) {
              console.error(`Failed to fetch ${leagueId}:`, e);
            }
            if (!cancelled) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          if (i + BATCH_SIZE < leaguesToFetch.length && !cancelled) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
          }
        }
      } finally {
        isRefreshing = false;
      }
    };

    fetchBatches(false);

    setTimeout(() => {
      if (!cancelled) {
        api.getNFLWeekInfo()
          .then(info => setNflWeekInfo(info))
          .catch(console.error);
      }
    }, 1000);

    const sportsRefreshInterval = Math.max(refreshInterval, 30000);
    const interval = setInterval(() => {
      fetchBatches(true);
    }, sportsRefreshInterval);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchLeagueData, refreshInterval, settings.homeScreen.sectionOrder, isSectionEnabled, selectedSportFilter]);

  // Fetch standings when sections are enabled
  useEffect(() => {
    if (isSectionEnabled('nba')) {
      fetchNbaStandings();
    }
  }, [isSectionEnabled, fetchNbaStandings]);

  useEffect(() => {
    if (isSectionEnabled('nfl')) {
      fetchNflStandings();
    }
  }, [isSectionEnabled, fetchNflStandings]);

  return {
    leagueData,
    leagueDates,
    propsData,
    parlayLegsData,
    lastUpdated,
    f1Data,
    boxingData,
    boxingSelectedDate,
    setBoxingSelectedDate,
    pendingBets,
    filteredPendingBets,
    enrichedPendingBets,
    sectionsToRender,
    canResolveAll,
    refreshPropsData,
    clearPendingBets,
    findMatchingGame,
    handlePrevious,
    handleNext,
    handleToday,
    handleDateChange,
    getDateDisplayLabel,
    getTeamRecord,
  };
};
