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
  type: 'Moneyline' | 'Spread' | 'Total' | 'Parlay' | 'Prop';
  matchup: string;
  selection: string;
  odds: number; // American odds
  stake: number;
  status: 'Pending' | 'Won' | 'Lost' | 'Pushed';
  date: string;
  book?: string;
  potentialPayout: number;
}

export interface BankrollTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bet_placed' | 'bet_won' | 'bet_pushed';
  amount: number;
  date: string;
  note?: string;
}



