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

export interface Bet {
  id: string;
  sport: string;
  type: 'Moneyline' | 'Spread' | 'Total' | 'Parlay' | 'Prop' | '1st Half' | '1st Quarter' | 'Team Total';
  matchup: string;
  selection: string;
  odds: number; // American odds
  stake: number;
  status: 'Pending' | 'Won' | 'Lost' | 'Pushed';
  date: string;
  book?: string;
  potentialPayout: number;
  legs?: {
    sport: string;
    matchup: string;
    selection: string;
    odds: number;
  }[];
  // Prop tracking data
  event_id?: string;
  player_name?: string;
  team_name?: string;
  market_type?: string;
  line?: number;
  side?: string;
  // Live tracking data
  current_value?: number;
  current_value_str?: string;
  game_state?: string;
  game_status_text?: string;
  prop_status?: string;
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
  sport?: string;  // 'nba', 'nfl', 'mlb', 'soccer', or 'tennis'
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






