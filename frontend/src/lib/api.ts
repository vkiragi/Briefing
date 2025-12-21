import { supabase } from './supabaseClient';
import { BoxScoreData } from '../types';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

// Helper to get auth headers
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    throw new Error('Not authenticated');
  }
  if (!session?.access_token) {
    console.warn('No session or access token available');
    throw new Error('Not authenticated');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
};

export const api = {
  getSports: async () => {
    const response = await fetch(`${API_BASE_URL}/sports/list`);
    if (!response.ok) throw new Error('Failed to fetch sports list');
    return response.json() as Promise<string[]>;
  },

  getScores: async (sport: string, limit = 10, live = false, date?: string) => {
    let url = `${API_BASE_URL}/sports/scores?sport=${sport}&limit=${limit}&live=${live}`;
    if (date) {
      url += `&date=${date}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch scores for ${sport}`);
    return response.json() as Promise<any[]>;
  },

  getSchedule: async (sport: string, limit = 10, date?: string) => {
    let url = `${API_BASE_URL}/sports/schedule?sport=${sport}&limit=${limit}`;
    if (date) {
      url += `&date=${date}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch schedule for ${sport}`);
    return response.json() as Promise<any[]>;
  },

  getPinnedGamesLive: async (games: Array<{ event_id: string; sport: string }>) => {
    const response = await fetch(`${API_BASE_URL}/sports/pinned-games-live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(games),
    });
    if (!response.ok) throw new Error('Failed to fetch pinned games live data');
    return response.json() as Promise<Array<{
      event_id: string;
      sport: string;
      last_play: string | null;
      last_play_team_id: string | null;
      home_team_id: string | null;
      away_team_id: string | null;
      game_state: string;
      game_status: string;
      home_score: string | number | null;
      away_score: string | number | null;
      home_team: string | null;
      away_team: string | null;
      home_logo: string | null;
      away_logo: string | null;
      display_clock: string | null;
      period: number | null;
      home_win_pct: number | null;
    }>>;
  },

  getNFLWeekInfo: async (date?: string) => {
    let url = `${API_BASE_URL}/sports/nfl/week`;
    if (date) {
      url += `?date=${date}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch NFL week info');
    return response.json() as Promise<{
      week_number: number | null;
      season_year: number;
      start_date: string | null;
      end_date: string | null;
      display_label: string;
      is_regular_season: boolean;
    }>;
  },

  getNews: async (sport: string, limit = 5) => {
    const response = await fetch(`${API_BASE_URL}/sports/news?sport=${sport}&limit=${limit}`);
    if (!response.ok) throw new Error(`Failed to fetch news for ${sport}`);
    return response.json() as Promise<any[]>;
  },

  getBetsWithStats: async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/bets`, { headers });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Not authenticated');
      throw new Error('Failed to fetch bets');
    }
    return response.json() as Promise<{
      bets: any[];
      stats: {
        totalBets: number;
        wins: number;
        losses: number;
        pending: number;
        winRate: number;
        roi: number;
        profit: number;
      };
    }>;
  },

  saveBet: async (bet: any) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/bets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(bet),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Not authenticated');
      throw new Error('Failed to save bet');
    }
    return response.json();
  },

  validatePlayer: async (sport: string, eventId: string, playerName: string) => {
    const response = await fetch(
      `${API_BASE_URL}/sports/validate-player?sport=${sport}&event_id=${eventId}&player_name=${encodeURIComponent(playerName)}`
    );
    if (!response.ok) throw new Error('Failed to validate player');
    return response.json() as Promise<{
      found: boolean;
      displayName?: string;
      teamName?: string;
      message?: string;
    }>;
  },

  searchPlayers: async (sport: string, eventId: string, query: string, limit = 10) => {
    const response = await fetch(
      `${API_BASE_URL}/sports/search-players?sport=${sport}&event_id=${eventId}&query=${encodeURIComponent(query)}&limit=${limit}`
    );
    if (!response.ok) throw new Error('Failed to search players');
    return response.json() as Promise<Array<{
      displayName: string;
      teamName: string;
    }>>;
  },

  updateBet: async (betId: string, updates: Partial<any>) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/bets/${betId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Not authenticated');
      throw new Error('Failed to update bet');
    }
    return response.json();
  },

  deleteBet: async (betId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/bets/${betId}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Not authenticated');
      throw new Error('Failed to delete bet');
    }
    return response.json();
  },

  refreshProps: async (betIds: string[]) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/bets/refresh-props`, {
      method: 'POST',
      headers,
      body: JSON.stringify(betIds),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Not authenticated');
      throw new Error('Failed to refresh props');
    }
    return response.json() as Promise<{
      bets: Array<{
        id: string;
        current_value?: number;
        current_value_str?: string;
        game_state?: string;
        game_status_text?: string;
        prop_status?: string;
      }>;
    }>;
  },

  refreshParlayLegs: async (betIds: string[]) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/bets/refresh-parlay-legs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(betIds),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Not authenticated');
      throw new Error('Failed to refresh parlay legs');
    }
    return response.json() as Promise<{
      parlays: Array<{
        id: string;
        legs: Array<{
          sport: string;
          matchup: string;
          selection: string;
          odds: number;
          event_id?: string;
          player_name?: string;
          team_name?: string;
          market_type?: string;
          line?: number;
          side?: string;
          current_value?: number;
          current_value_str?: string;
          game_state?: string;
          game_status_text?: string;
          prop_status?: string;
        }>;
      }>;
    }>;
  },

  getBoxScore: async (sport: string, eventId: string) => {
    const response = await fetch(
      `${API_BASE_URL}/sports/boxscore?sport=${sport}&event_id=${eventId}`
    );
    if (!response.ok) throw new Error(`Failed to fetch box score for ${sport}`);
    return response.json() as Promise<BoxScoreData>;
  },

  getF1Races: async (limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/sports/f1/races?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch F1 races');
    return response.json() as Promise<Array<{
      name: string;
      round: number;
      date: string;
      location: string;
      status: string;
      completed: boolean;
      winner?: string;
    }>>;
  },

  getF1RaceResults: async (roundNumber: number) => {
    const response = await fetch(`${API_BASE_URL}/sports/f1/race/${roundNumber}`);
    if (!response.ok) throw new Error('Failed to fetch F1 race results');
    return response.json() as Promise<{
      race_name: string;
      round: number;
      date: string;
      time: string;
      location: string;
      circuit: string;
      results: Array<{
        position: string;
        driver: string;
        driver_code: string;
        team: string;
        grid: string;
        laps: string;
        status: string;
        time: string;
        points: string;
        fastest_lap_time: string;
        fastest_lap_rank: string;
      }>;
      has_results: boolean;
    }>;
  },

  getBoxingFights: async (limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/sports/boxing/fights?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch boxing fights');
    return response.json() as Promise<Array<{
      fighter1: string;
      fighter2: string;
      title: string;
      date: string;
      venue: string;
      status: string;
      completed: boolean;
      winner?: string | null;
      method?: string | null;
      rounds?: number | null;
      belt?: string | null;
    }>>;
  },

  // ==================== Pinned Games ====================

  getPinnedGames: async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pinned-games`, { headers });
    if (!response.ok) throw new Error('Failed to fetch pinned games');
    const data = await response.json();
    return data.pinned_games as Array<{
      id: string;
      user_id: string;
      event_id: string;
      sport: string;
      matchup?: string;
      home_team?: string;
      away_team?: string;
      pinned_at: string;
      game_end_time?: string;
    }>;
  },

  pinGame: async (game: {
    event_id: string;
    sport: string;
    matchup?: string;
    home_team?: string;
    away_team?: string;
  }) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pinned-games`, {
      method: 'POST',
      headers,
      body: JSON.stringify(game),
    });
    if (!response.ok) throw new Error('Failed to pin game');
    return response.json();
  },

  unpinGame: async (eventId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pinned-games/${eventId}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to unpin game');
    return response.json();
  },

  isGamePinned: async (eventId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pinned-games/check/${eventId}`, { headers });
    if (!response.ok) throw new Error('Failed to check if game is pinned');
    const data = await response.json();
    return data.is_pinned as boolean;
  },

  updateGameEndTime: async (eventId: string, endTime: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pinned-games/${eventId}/end-time`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ end_time: endTime }),
    });
    if (!response.ok) throw new Error('Failed to update game end time');
    return response.json();
  },
};






