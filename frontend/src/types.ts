export interface Game {
  home_team: string;
  away_team: string;
  home_score: string;
  away_score: string;
  home_logo?: string; // Team/player logo URL from ESPN
  away_logo?: string; // Team/player logo URL from ESPN
  status: string;
  completed: boolean;
  date: string;
  state: string; // 'pre', 'in', 'post'
  period?: number;
  display_clock?: string;
  clock_seconds?: number;
  event_id?: string;
  competition_id?: string;
  tournament?: string; // For tennis matches
  match_type?: string; // For tennis: 'singles', 'doubles', 'tournament'
  // Tennis-specific fields
  home_set_scores?: string; // e.g., "6-7(4-7) 5-7"
  away_set_scores?: string; // e.g., "7-6(7-4) 7-5"
  home_winner?: boolean;
  away_winner?: boolean;
  end_date?: string; // For tournaments
  location?: string; // For tournaments
}

export interface NewsItem {
  title: string;
  description: string;
  link: string;
  published: string;
}

// Individual player in a combined prop
export interface CombinedPropPlayer {
  player_name: string;
  team_name?: string;
  event_id?: string;
  current_value?: number;
  game_state?: string;
}

// Parlay leg with tracking support
export interface ParlayLeg {
  sport: string;
  matchup: string;
  selection: string;
  odds: number;
  // Tracking fields
  event_id?: string;
  player_name?: string;
  team_name?: string;
  market_type?: string;
  line?: number;
  side?: string;
  // Combined prop support (e.g., "Smith + Brown + Barkley 4+ TDs")
  is_combined?: boolean;
  combined_players?: CombinedPropPlayer[];
  // Live tracking data (populated by refresh)
  current_value?: number;
  current_value_str?: string;
  game_state?: string;
  game_status_text?: string;
  prop_status?: string; // 'pending', 'live_hit', 'live_miss', 'won', 'lost'
  last_play?: string;  // Last play description for live games
  live_situation?: LiveSituation;  // Rich live game data
}

// Rich live game situation data
export interface LiveSituation {
  display_clock?: string;
  period?: number;
  home_logo?: string;
  away_logo?: string;
  home_score?: string;
  away_score?: string;
  home_abbrev?: string;
  away_abbrev?: string;
  home_win_pct?: number;
}

export interface Bet {
  id: string;
  sport: string;
  type: 'Moneyline' | 'Spread' | 'Total' | 'Parlay' | 'Prop' | '1st Half' | '1st Quarter' | 'Team Total' | 'Combined Prop';
  matchup: string;
  selection: string;
  odds: number; // American odds
  stake: number;
  status: 'Pending' | 'Won' | 'Lost' | 'Pushed';
  date: string;
  book?: string;
  potentialPayout: number;
  legs?: ParlayLeg[];
  // Prop tracking data
  event_id?: string;
  player_name?: string;
  team_name?: string;
  market_type?: string;
  line?: number;
  side?: string;
  // Combined prop support
  is_combined?: boolean;
  combined_players?: CombinedPropPlayer[];
  // Live tracking data
  current_value?: number;
  current_value_str?: string;
  game_state?: string;
  game_status_text?: string;
  prop_status?: string;
  last_play?: string;  // Last play description for live games
  live_situation?: LiveSituation;  // Rich live game data
}

export interface BankrollTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bet_placed' | 'bet_won' | 'bet_pushed';
  amount: number;
  date: string;
  note?: string;
}

// Box Score Types
export interface BoxScorePlayer {
  id: string;
  name: string;
  position: string;
  jersey: string;
  starter: boolean;
  stats: Record<string, string> | string[];  // NBA uses dict, NFL uses array
}

// NFL-specific category with players
export interface NFLStatCategory {
  name: string;  // e.g., 'passing', 'rushing', 'receiving'
  labels: string[];  // Column headers like ['C/ATT', 'YDS', 'TD', 'INT']
  players: BoxScorePlayer[];
}

export interface BoxScoreTeam {
  team_id: string;
  team_name: string;
  team_abbrev: string;
  logo: string;
  players: BoxScorePlayer[];  // Used for NBA and Soccer
  categories?: NFLStatCategory[];  // Used for NFL and MLB
  formation?: string;  // Used for Soccer
}

export interface LineScores {
  home: number[];
  away: number[];
  home_team: string;
  away_team: string;
}

export interface BoxScoreData {
  game_state: string;
  game_status: string;
  linescores: LineScores;
  teams: BoxScoreTeam[];
  sport?: string;  // 'nba', 'nfl', 'mlb', 'soccer', 'tennis', 'ncaab', or 'ncaaf'
}

// Tennis Match Types
export interface TennisSetScore {
  games: number;
  winner: boolean;
  tiebreak?: number;
}

export interface TennisPlayer {
  name: string;
  seed?: number;
  rank?: number;
  winner: boolean;
  score: string;  // e.g., "7-5 6-3"
  sets: TennisSetScore[];
  country?: string;
  record?: string;
}

export interface TennisMatchData {
  tournament: string;
  location: string;
  round: string;
  competition_type: string;  // "Men's Singles", "Women's Doubles", etc.
  match_note: string;
  venue: string;
  status: string;
  state: string;
  completed: boolean;
  players: TennisPlayer[];
  sport: 'tennis';
}

// Date Navigation Types
export type NavigationType = 'daily' | 'weekly';

export const SPORT_NAVIGATION: Record<string, NavigationType> = {
  // Daily sports
  nba: 'daily',
  ncaab: 'daily',
  mlb: 'daily',
  tennis: 'daily',
  'tennis-atp-singles': 'daily',
  'tennis-atp-doubles': 'daily',
  'tennis-wta-singles': 'daily',
  'tennis-wta-doubles': 'daily',

  // Weekly sports
  nfl: 'weekly',
  ncaaf: 'weekly',

  // Soccer leagues (all weekly)
  epl: 'weekly',
  laliga: 'weekly',
  seriea: 'weekly',
  bundesliga: 'weekly',
  ligue1: 'weekly',
  ucl: 'weekly',
  europa: 'weekly',
  ligaportugal: 'weekly',
  saudi: 'weekly',
  mls: 'weekly',
  brasileirao: 'weekly',
  ligamx: 'weekly',
  scottish: 'weekly',
  greek: 'weekly',
  russian: 'weekly',
  turkish: 'weekly',
  austrian: 'weekly',
};

export interface NFLWeekInfo {
  week_number: number | null;
  season_year: number;
  start_date: string | null;
  end_date: string | null;
  display_label: string;
  is_regular_season: boolean;
}






