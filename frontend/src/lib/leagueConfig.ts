import { Game } from "../types";

// Cache configuration
export const CACHE_KEY = 'briefing_league_cache';
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface CachedLeagueData {
  games: Game[];
  timestamp: number;
}

export interface LeagueCache {
  [leagueId: string]: CachedLeagueData;
}

// Helper to get cached data
export const getCachedData = (): LeagueCache => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Failed to read cache:', e);
  }
  return {};
};

// Helper to set cached data for a league
export const setCachedData = (leagueId: string, games: Game[]) => {
  try {
    const cache = getCachedData();
    cache[leagueId] = {
      games,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to write cache:', e);
  }
};

// Check if cached data is still valid
export const isCacheValid = (cached: CachedLeagueData | undefined): boolean => {
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_TTL;
};

// League configuration for fetching
export const LEAGUE_CONFIG: Record<string, { apiId: string; title: string; isSoccer: boolean; useScheduleFallback: boolean; isF1?: boolean; isBoxing?: boolean }> = {
  nba: { apiId: 'nba', title: 'NBA Action', isSoccer: false, useScheduleFallback: true },
  ncaab: { apiId: 'ncaab', title: 'NCAA Basketball', isSoccer: false, useScheduleFallback: true },
  nfl: { apiId: 'nfl', title: 'NFL Action', isSoccer: false, useScheduleFallback: true },
  ncaaf: { apiId: 'ncaaf', title: 'NCAA Football', isSoccer: false, useScheduleFallback: true },
  mlb: { apiId: 'mlb', title: 'MLB Action', isSoccer: false, useScheduleFallback: true },
  epl: { apiId: 'epl', title: 'Premier League', isSoccer: true, useScheduleFallback: true },
  laliga: { apiId: 'laliga', title: 'La Liga', isSoccer: true, useScheduleFallback: true },
  seriea: { apiId: 'seriea', title: 'Serie A', isSoccer: true, useScheduleFallback: true },
  bundesliga: { apiId: 'bundesliga', title: 'Bundesliga', isSoccer: true, useScheduleFallback: true },
  ligue1: { apiId: 'ligue1', title: 'Ligue 1', isSoccer: true, useScheduleFallback: true },
  ucl: { apiId: 'ucl', title: 'Champions League', isSoccer: true, useScheduleFallback: true },
  europa: { apiId: 'europa', title: 'Europa League', isSoccer: true, useScheduleFallback: true },
  ligaportugal: { apiId: 'ligaportugal', title: 'Liga Portugal', isSoccer: true, useScheduleFallback: true },
  saudi: { apiId: 'saudi', title: 'Saudi Pro League', isSoccer: true, useScheduleFallback: true },
  mls: { apiId: 'mls', title: 'MLS', isSoccer: true, useScheduleFallback: true },
  brasileirao: { apiId: 'brasileirao', title: 'Brasileirão', isSoccer: true, useScheduleFallback: true },
  ligamx: { apiId: 'ligamx', title: 'Liga MX', isSoccer: true, useScheduleFallback: true },
  scottish: { apiId: 'scottish', title: 'Scottish Premiership', isSoccer: true, useScheduleFallback: true },
  greek: { apiId: 'greek', title: 'Greek Super League', isSoccer: true, useScheduleFallback: true },
  russian: { apiId: 'russian', title: 'Russian Premier League', isSoccer: true, useScheduleFallback: true },
  turkish: { apiId: 'turkish', title: 'Turkish Süper Lig', isSoccer: true, useScheduleFallback: true },
  austrian: { apiId: 'austrian', title: 'Austrian Bundesliga', isSoccer: true, useScheduleFallback: true },
  tennis: { apiId: 'tennis-atp-singles', title: 'Tennis Action', isSoccer: false, useScheduleFallback: true },
  f1: { apiId: 'f1', title: 'Formula 1', isSoccer: false, useScheduleFallback: false, isF1: true },
  boxing: { apiId: 'boxing', title: 'Boxing', isSoccer: false, useScheduleFallback: false, isBoxing: true },
};

// F1 Race type
export interface F1Race {
  name: string;
  round: number;
  date: string;
  location: string;
  status: string;
  completed: boolean;
  winner?: string;
}

// F1 state
export interface F1State {
  races: F1Race[];
  loading: boolean;
  lastUpdated: Date | null;
}

// Boxing Fight type
export interface BoxingFight {
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
  fighter1_record?: string;
  fighter1_ko_pct?: number;
  fighter1_age?: number;
  fighter1_stance?: string;
  fighter2_record?: string;
  fighter2_ko_pct?: number;
  fighter2_age?: number;
  fighter2_stance?: string;
}

// Boxing state
export interface BoxingState {
  fights: BoxingFight[];
  loading: boolean;
  lastUpdated: Date | null;
}

export interface LeagueState {
  games: Game[];
  loading: boolean;
  lastUpdated: Date | null;
}

// Soccer leagues for game time formatting
export const SOCCER_LEAGUES = [
  'epl', 'laliga', 'seriea', 'bundesliga', 'ligue1', 'ucl', 'europa',
  'ligaportugal', 'saudi', 'mls', 'brasileirao', 'ligamx', 'scottish',
  'greek', 'russian', 'turkish', 'austrian', 'soccer'
];

// Sports with box score support
export const BOX_SCORE_SPORTS = [
  'nba', 'nfl', 'mlb', 'ncaab', 'ncaaf',
  ...SOCCER_LEAGUES,
  'tennis', 'tennis-atp-singles', 'tennis-atp-doubles', 'tennis-wta-singles', 'tennis-wta-doubles'
];
