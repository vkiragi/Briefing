export interface Game {
  home_team: string;
  away_team: string;
  home_score: string;
  away_score: string;
  status: string;
  completed: boolean;
  date: string;
  state: string; // 'pre', 'in', 'post'
  period?: number;
  display_clock?: string;
  clock_seconds?: number;
  event_id?: string;
  competition_id?: string;
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






