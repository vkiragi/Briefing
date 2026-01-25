"""
Supabase Service for Bets Management
Handles all database operations for bets using Supabase
"""
import os
from typing import List, Optional, Dict, Any
from supabase import create_client, Client


class SupabaseService:
    _instance: Optional['SupabaseService'] = None
    _client: Optional[Client] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._client is None:
            self._init_client()

    def _init_client(self):
        """Initialize the Supabase client by reading env from frontend/.env"""
        # Read from frontend/.env if environment variables not set
        if not os.getenv('SUPABASE_URL'):
            env_file = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', '.env')
            if os.path.exists(env_file):
                with open(env_file) as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            if key.startswith('VITE_'):
                                clean_key = key.replace('VITE_', '')
                                os.environ[clean_key] = value

        url = os.getenv('SUPABASE_URL')
        # Use service role key for backend (bypasses RLS)
        # Fall back to anon key if service role not available
        key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')

        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) must be set")

        self._client = create_client(url, key)

    @property
    def client(self) -> Client:
        if self._client is None:
            self._init_client()
        return self._client

    def get_bets(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all bets for a user"""
        result = self.client.table('bets').select('*, parlay_legs(*)').eq('user_id', user_id).order('created_at', desc=True).execute()
        return self._transform_bets_from_db(result.data)

    def get_bet(self, bet_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a single bet by ID"""
        try:
            result = self.client.table('bets').select('*, parlay_legs(*)').eq('id', bet_id).eq('user_id', user_id).maybe_single().execute()
            if result.data:
                return self._transform_bet_from_db(result.data)
        except Exception as e:
            print(f"Error fetching bet: {e}")
        return None

    def create_bet(self, user_id: str, bet_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new bet"""
        print(f"[SupabaseService.create_bet] Starting with bet_data: {bet_data}")

        # Transform from frontend format to DB format
        db_bet = self._transform_bet_to_db(bet_data, user_id)
        print(f"[SupabaseService.create_bet] Transformed db_bet: {db_bet}")

        # Extract legs if parlay
        legs = db_bet.pop('legs', None)
        print(f"[SupabaseService.create_bet] Extracted legs: {legs}")

        # Insert bet
        print(f"[SupabaseService.create_bet] Inserting bet...")
        result = self.client.table('bets').insert(db_bet).execute()
        bet = result.data[0]
        print(f"[SupabaseService.create_bet] Bet inserted: {bet['id']}")

        # Insert parlay legs if any
        if legs and bet['type'] == 'Parlay':
            print(f"[SupabaseService.create_bet] Inserting {len(legs)} parlay legs...")
            for i, leg in enumerate(legs):
                print(f"[SupabaseService.create_bet] Processing leg {i}: is_combined={leg.get('is_combined')}, combined_players={leg.get('combined_players')}")
                leg_data = {
                    'bet_id': bet['id'],
                    'sport': leg.get('sport', bet['sport']),
                    'matchup': leg.get('matchup', ''),
                    'selection': leg.get('selection', ''),
                    'odds': leg.get('odds', 0),
                    'leg_order': i,
                    # Tracking fields
                    'event_id': leg.get('event_id'),
                    'player_name': leg.get('player_name'),
                    'team_name': leg.get('team_name'),
                    'market_type': leg.get('market_type'),
                    'line': leg.get('line'),
                    'side': leg.get('side'),
                    # Combined prop fields
                    'is_combined': leg.get('is_combined'),
                    # Supabase handles JSONB serialization automatically
                    'combined_players': leg.get('combined_players'),
                }
                print(f"[SupabaseService.create_bet] Inserting leg_data: {leg_data}")
                self.client.table('parlay_legs').insert(leg_data).execute()
                print(f"[SupabaseService.create_bet] Leg {i} inserted successfully")

        # Update user stats
        self._update_user_stats(user_id)

        return self._transform_bet_from_db(bet)

    def update_bet(self, bet_id: str, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a bet"""
        # Transform field names
        db_updates = {}
        field_map = {
            'potentialPayout': 'potential_payout',
            'eventId': 'event_id',
            'playerName': 'player_name',
            'teamName': 'team_name',
            'marketType': 'market_type',
            'gameState': 'game_state',
            'gameStatusText': 'game_status_text',
            'propStatus': 'prop_status',
            'currentValue': 'current_value',
            'currentValueStr': 'current_value_str',
        }

        for key, value in updates.items():
            db_key = field_map.get(key, key)
            db_updates[db_key] = value

        result = self.client.table('bets').update(db_updates).eq('id', bet_id).eq('user_id', user_id).execute()

        if result.data:
            # Update user stats if status changed
            if 'status' in updates:
                self._update_user_stats(user_id)
            return self._transform_bet_from_db(result.data[0])
        return None

    def delete_bet(self, bet_id: str, user_id: str) -> bool:
        """Delete a bet"""
        result = self.client.table('bets').delete().eq('id', bet_id).eq('user_id', user_id).execute()
        if result.data:
            self._update_user_stats(user_id)
            return True
        return False

    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics"""
        try:
            result = self.client.table('user_stats').select('*').eq('user_id', user_id).maybe_single().execute()
            if result.data:
                return {
                    'totalBets': result.data['total_bets'],
                    'wins': result.data['wins'],
                    'losses': result.data['losses'],
                    'pending': result.data['pending'],
                    'winRate': float(result.data['win_rate']),
                    'roi': float(result.data['roi']),
                    'profit': float(result.data['total_profit']),
                }
        except Exception as e:
            print(f"Error fetching user stats: {e}")

        return {
            'totalBets': 0,
            'wins': 0,
            'losses': 0,
            'pending': 0,
            'winRate': 0,
            'roi': 0,
            'profit': 0,
        }

    def _update_user_stats(self, user_id: str):
        """Recalculate and update user stats"""
        from datetime import date

        # Get all bets for user
        result = self.client.table('bets').select('*').eq('user_id', user_id).execute()
        bets = result.data

        today = date.today()

        # Calculate stats
        total_bets = len(bets)
        wins = sum(1 for b in bets if b['status'] == 'Won')
        losses = sum(1 for b in bets if b['status'] == 'Lost')
        pushes = sum(1 for b in bets if b['status'] == 'Pushed')

        # Only count as pending if status is Pending AND date is today or future
        pending = sum(1 for b in bets if b['status'] == 'Pending' and b['date'] >= str(today))

        completed = wins + losses
        win_rate = (wins / completed * 100) if completed > 0 else 0

        total_staked = sum(float(b['stake']) for b in bets if b['status'] in ('Won', 'Lost'))
        total_profit = sum(
            float(b['potential_payout']) if b['status'] == 'Won'
            else -float(b['stake']) if b['status'] == 'Lost'
            else 0
            for b in bets
        )
        roi = (total_profit / total_staked * 100) if total_staked > 0 else 0

        # Upsert stats
        self.client.table('user_stats').upsert({
            'user_id': user_id,
            'total_bets': total_bets,
            'wins': wins,
            'losses': losses,
            'pushes': pushes,
            'pending': pending,
            'win_rate': round(win_rate, 2),
            'total_staked': round(total_staked, 2),
            'total_profit': round(total_profit, 2),
            'roi': round(roi, 2),
        }).execute()

    def _transform_bet_to_db(self, bet: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Transform frontend bet format to database format"""
        # Only allow valid side values (over/under) - other values like team names should be null
        side = bet.get('side')
        if side and side.lower() not in ('over', 'under'):
            side = None

        return {
            'id': bet.get('id'),
            'user_id': user_id,
            'sport': bet.get('sport'),
            'type': bet.get('type'),
            'matchup': bet.get('matchup'),
            'selection': bet.get('selection'),
            'odds': bet.get('odds'),
            'stake': bet.get('stake', 0),
            'status': bet.get('status', 'Pending'),
            'date': bet.get('date'),
            'book': bet.get('book'),
            'potential_payout': bet.get('potentialPayout', 0),
            'event_id': bet.get('event_id'),
            'player_name': bet.get('player_name'),
            'team_name': bet.get('team_name'),
            'market_type': bet.get('market_type'),
            'line': bet.get('line'),
            'side': side,
            'current_value': bet.get('current_value'),
            'current_value_str': bet.get('current_value_str'),
            'game_state': bet.get('game_state'),
            'game_status_text': bet.get('game_status_text'),
            'prop_status': bet.get('prop_status'),
            'legs': bet.get('legs'),  # Will be extracted before insert
        }

    def _transform_bet_from_db(self, db_bet: Dict[str, Any]) -> Dict[str, Any]:
        """Transform database bet format to frontend format"""
        bet = {
            'id': db_bet['id'],
            'sport': db_bet['sport'],
            'type': db_bet['type'],
            'matchup': db_bet['matchup'],
            'selection': db_bet['selection'],
            'odds': float(db_bet['odds']),
            'stake': float(db_bet['stake']),
            'status': db_bet['status'],
            'date': db_bet['date'],
            'book': db_bet.get('book'),
            'potentialPayout': float(db_bet['potential_payout']),
            'event_id': db_bet.get('event_id'),
            'player_name': db_bet.get('player_name'),
            'team_name': db_bet.get('team_name'),
            'market_type': db_bet.get('market_type'),
            'line': float(db_bet['line']) if db_bet.get('line') is not None else None,
            'side': db_bet.get('side'),
            'current_value': float(db_bet['current_value']) if db_bet.get('current_value') is not None else None,
            'current_value_str': db_bet.get('current_value_str'),
            'game_state': db_bet.get('game_state'),
            'game_status_text': db_bet.get('game_status_text'),
            'prop_status': db_bet.get('prop_status'),
        }

        # Add parlay legs if present
        if 'parlay_legs' in db_bet and db_bet['parlay_legs']:
            processed_legs = []
            for leg in sorted(db_bet['parlay_legs'], key=lambda x: x['leg_order']):
                processed_legs.append({
                    'sport': leg['sport'],
                    'matchup': leg['matchup'],
                    'selection': leg['selection'],
                    'odds': float(leg['odds']),
                    # Tracking fields
                    'event_id': leg.get('event_id'),
                    'player_name': leg.get('player_name'),
                    'team_name': leg.get('team_name'),
                    'market_type': leg.get('market_type'),
                    'line': float(leg['line']) if leg.get('line') is not None else None,
                    'side': leg.get('side'),
                    # Combined prop fields - Supabase returns JSONB as Python objects
                    'is_combined': leg.get('is_combined'),
                    'combined_players': leg.get('combined_players'),
                })
            bet['legs'] = processed_legs

        return bet

    def _transform_bets_from_db(self, db_bets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Transform a list of database bets to frontend format"""
        return [self._transform_bet_from_db(b) for b in db_bets]

    # ==================== Pinned Games Methods ====================

    def get_pinned_games(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all pinned games for a user"""
        result = self.client.table('pinned_games').select('*').eq('user_id', user_id).order('pinned_at', desc=True).execute()
        return result.data

    def pin_game(self, user_id: str, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Pin a game for a user"""
        pin_data = {
            'user_id': user_id,
            'event_id': game_data['event_id'],
            'sport': game_data['sport'],
            'matchup': game_data.get('matchup'),
            'home_team': game_data.get('home_team'),
            'away_team': game_data.get('away_team'),
        }

        # Use upsert to handle duplicate pins gracefully
        result = self.client.table('pinned_games').upsert(pin_data, on_conflict='user_id,event_id').execute()
        return result.data[0] if result.data else pin_data

    def unpin_game(self, user_id: str, event_id: str) -> bool:
        """Unpin a game for a user"""
        result = self.client.table('pinned_games').delete().eq('user_id', user_id).eq('event_id', event_id).execute()
        return len(result.data) > 0 if result.data else False

    def is_game_pinned(self, user_id: str, event_id: str) -> bool:
        """Check if a game is pinned by a user"""
        result = self.client.table('pinned_games').select('id').eq('user_id', user_id).eq('event_id', event_id).execute()
        return len(result.data) > 0

    def update_game_end_time(self, event_id: str, end_time: str):
        """Update the game end time for auto-cleanup"""
        self.client.table('pinned_games').update({'game_end_time': end_time}).eq('event_id', event_id).execute()

    def cleanup_ended_games(self, user_id: str) -> int:
        """Remove pinned games that ended more than 60 minutes ago"""
        from datetime import datetime, timedelta

        cutoff_time = datetime.utcnow() - timedelta(minutes=60)
        cutoff_str = cutoff_time.isoformat()

        # Delete games where game_end_time is set and is older than 60 minutes
        result = self.client.table('pinned_games').delete().eq('user_id', user_id).lt('game_end_time', cutoff_str).execute()
        return len(result.data) if result.data else 0

    # ==================== Favorite Teams Methods ====================

    def get_favorite_teams(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all favorite teams for a user"""
        result = self.client.table('favorite_teams').select('*').eq('user_id', user_id).order('added_at', desc=False).execute()
        return [self._transform_favorite_team_from_db(t) for t in result.data]

    def add_favorite_team(self, user_id: str, team_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a favorite team for a user"""
        db_data = {
            'user_id': user_id,
            'team_id': team_data['id'],
            'team_name': team_data['name'],
            'abbreviation': team_data.get('abbreviation'),
            'logo': team_data.get('logo'),
            'sport': team_data['sport'],
            'sport_display': team_data.get('sportDisplay'),
        }

        # Use upsert to handle duplicates gracefully
        result = self.client.table('favorite_teams').upsert(
            db_data,
            on_conflict='user_id,team_id,sport'
        ).execute()

        return self._transform_favorite_team_from_db(result.data[0]) if result.data else team_data

    def remove_favorite_team(self, user_id: str, team_id: str, sport: str) -> bool:
        """Remove a favorite team for a user"""
        result = self.client.table('favorite_teams').delete().eq('user_id', user_id).eq('team_id', team_id).eq('sport', sport).execute()
        return len(result.data) > 0 if result.data else False

    def sync_favorite_teams(self, user_id: str, teams: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Sync favorite teams - replaces all current favorites with the provided list.
        This is used when the frontend sends its full list of favorites.
        """
        # Delete all current favorites for user
        self.client.table('favorite_teams').delete().eq('user_id', user_id).execute()

        # Insert all new favorites
        if teams:
            db_teams = []
            for team in teams:
                db_teams.append({
                    'user_id': user_id,
                    'team_id': team['id'],
                    'team_name': team['name'],
                    'abbreviation': team.get('abbreviation'),
                    'logo': team.get('logo'),
                    'sport': team['sport'],
                    'sport_display': team.get('sportDisplay'),
                })

            result = self.client.table('favorite_teams').insert(db_teams).execute()
            return [self._transform_favorite_team_from_db(t) for t in result.data]

        return []

    def _transform_favorite_team_from_db(self, db_team: Dict[str, Any]) -> Dict[str, Any]:
        """Transform database favorite team format to frontend format"""
        return {
            'id': db_team['team_id'],
            'name': db_team['team_name'],
            'abbreviation': db_team.get('abbreviation', ''),
            'logo': db_team.get('logo', ''),
            'sport': db_team['sport'],
            'sportDisplay': db_team.get('sport_display', ''),
        }

    def delete_user_data(self, user_id: str) -> Dict[str, Any]:
        """
        Delete all user data from the database.
        This removes: bets, parlay_legs (via cascade), bankroll_transactions,
        user_stats, pinned_games, favorite_teams, and profile.
        """
        deleted = {
            'bets': 0,
            'bankroll_transactions': 0,
            'pinned_games': 0,
            'favorite_teams': 0,
            'user_stats': 0,
            'profile': 0,
        }

        # Delete bets (parlay_legs will cascade delete)
        result = self.client.table('bets').delete().eq('user_id', user_id).execute()
        deleted['bets'] = len(result.data) if result.data else 0

        # Delete bankroll transactions
        result = self.client.table('bankroll_transactions').delete().eq('user_id', user_id).execute()
        deleted['bankroll_transactions'] = len(result.data) if result.data else 0

        # Delete pinned games
        result = self.client.table('pinned_games').delete().eq('user_id', user_id).execute()
        deleted['pinned_games'] = len(result.data) if result.data else 0

        # Delete favorite teams
        result = self.client.table('favorite_teams').delete().eq('user_id', user_id).execute()
        deleted['favorite_teams'] = len(result.data) if result.data else 0

        # Delete user stats
        result = self.client.table('user_stats').delete().eq('user_id', user_id).execute()
        deleted['user_stats'] = len(result.data) if result.data else 0

        # Delete profile
        result = self.client.table('profiles').delete().eq('id', user_id).execute()
        deleted['profile'] = len(result.data) if result.data else 0

        return deleted


# Singleton instance
supabase_service = SupabaseService()
