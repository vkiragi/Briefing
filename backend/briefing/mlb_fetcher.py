"""
MLB specific fetcher logic.
"""

import requests
from typing import List, Dict, Optional, Any

class MLBFetcherMixin:
    """Mixin for MLB specific fetcher logic."""

    def fetch_mlb_game_player_stats(self, event_id: str) -> Dict:
        """
        Fetch detailed MLB player stats for a single game using the ESPN summary endpoint.

        Args:
            event_id: ESPN event id for the game

        Returns:
            Parsed JSON payload focused on player stats.
        """
        # Assumes self has _fetch_game_summary from BaseSportsFetcher
        return self._fetch_game_summary('mlb', event_id)

    def get_mlb_player_stat(
        self,
        event_id: str,
        player_name: str,
        market_type: str,
        stats_payload: Optional[Dict] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Look up a specific MLB player stat (e.g., hits, strikeouts) from the summary payload.

        Args:
            event_id: ESPN event id
            player_name: Player display name (case-insensitive substring match)
            market_type: 'hits', 'runs', 'rbi', 'home_runs', 'strikeouts_pitching', 'earned_runs'
            stats_payload: Optional pre-fetched summary payload to avoid re-requesting

        Returns:
            Dict with 'value' (float), 'team' (str), and 'player' (str) if found, otherwise None.
        """
        # If caller didn't pass stats, fetch them now.
        data = stats_payload or self.fetch_mlb_game_player_stats(event_id)

        # Map market types to category type + list of possible column keys
        # We identify category by looking for specific keys since 'name' is often None for MLB
        # Category types: 'batting', 'pitching'
        
        stat_mapping = {
            # Batting markets
            "hits": ("batting", ["hits", "H"]),
            "runs": ("batting", ["runs", "R"]),
            "rbi": ("batting", ["RBIs", "RBI"]),
            "home_runs": ("batting", ["homeRuns", "HR"]),
            "total_bases": ("batting", ["totalBases", "TB"]), # Derived or direct? Check later, maybe not available directly
            
            # Pitching markets
            "strikeouts_pitching": ("pitching", ["strikeouts", "K"]),
            "earned_runs": ("pitching", ["earnedRuns", "ER"]),
            "innings_pitched": ("pitching", ["fullInnings.partInnings", "IP"]),
        }

        if market_type not in stat_mapping:
            return None

        cat_type, target_keys = stat_mapping[market_type]

        # Player stats are usually under 'boxscore' -> 'players' -> list by team
        box = data.get("boxscore", {})
        players_by_team = box.get("players", [])

        target_name_lower = player_name.lower()

        for team_block in players_by_team:
            # Capture team name
            team_info = team_block.get("team", {})
            team_name = team_info.get("displayName") or team_info.get("name", "Unknown")

            for cat in team_block.get("statistics", []):
                # Identify category type
                keys = cat.get("keys", [])
                
                is_batting = "atBats" in keys or "plateAppearances" in keys
                is_pitching = "pitches" in keys and ("fullInnings.partInnings" in keys or "inningsPitched" in keys)
                
                current_cat_type = "unknown"
                if is_batting:
                    current_cat_type = "batting"
                elif is_pitching:
                    current_cat_type = "pitching"
                
                if current_cat_type != cat_type:
                    continue

                # Determine which index contains our target stat
                available_keys = cat.get("keys", [])
                available_labels = cat.get("labels", [])
                
                target_index = -1
                
                # Try to find index by key match
                for i, k in enumerate(available_keys):
                    if k in target_keys:
                        target_index = i
                        break
                
                # If not found by key, try by label
                if target_index == -1:
                    for i, l in enumerate(available_labels):
                        if l in target_keys:
                            target_index = i
                            break
                
                if target_index == -1:
                    continue

                for athlete_stat in cat.get("athletes", []):
                    athlete = athlete_stat.get("athlete", {})
                    display_name = athlete.get("displayName", "")
                    if target_name_lower not in display_name.lower():
                        continue

                    stats_values = athlete_stat.get("stats", [])
                    if not isinstance(stats_values, list) or target_index >= len(stats_values):
                        continue
                        
                    raw_val = stats_values[target_index]
                    
                    try:
                        val = float(raw_val)
                        return {"value": val, "team": team_name, "player": display_name}
                    except (TypeError, ValueError):
                        continue

        return None

    def fetch_mlb_standings(self) -> Dict[str, List[Dict]]:
        """
        Fetch MLB standings for both leagues (2025 season).

        Returns:
            Dictionary mapping league names (American/National) to list of team standings
        """
        url = "https://site.api.espn.com/apis/v2/sports/baseball/mlb/standings?season=2025"

        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            standings = {}

            # Process both leagues (American and National)
            for league in data.get('children', []):
                league_name = league.get('name', 'Unknown')
                league_standings = []

                entries = league.get('standings', {}).get('entries', [])

                for entry in entries:
                    team = entry.get('team', {})
                    stats = entry.get('stats', [])

                    # Extract relevant stats
                    wins = next((s['displayValue'] for s in stats if s['name'] == 'wins'), '0')
                    losses = next((s['displayValue'] for s in stats if s['name'] == 'losses'), '0')
                    win_pct = next((s['displayValue'] for s in stats if s['name'] == 'winPercent'), '.000')
                    games_back = next((s['displayValue'] for s in stats if s['name'] == 'gamesBehind'), '-')
                    streak = next((s['displayValue'] for s in stats if s['name'] == 'streak'), '-')

                    team_info = {
                        'rank': len(league_standings) + 1,
                        'team': team.get('displayName', 'Unknown'),
                        'wins': wins,
                        'losses': losses,
                        'win_pct': win_pct,
                        'games_back': games_back,
                        'streak': streak,
                    }

                    league_standings.append(team_info)

                # Reverse the standings to show best teams first and update ranks
                reversed_standings = list(reversed(league_standings))
                for i, team in enumerate(reversed_standings, 1):
                    team['rank'] = i

                standings[league_name] = reversed_standings

            return standings

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching MLB standings: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing MLB standings: {str(e)}")

