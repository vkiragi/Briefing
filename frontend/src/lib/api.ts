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
};






