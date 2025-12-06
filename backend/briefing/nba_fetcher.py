"""
NBA specific fetcher logic.
"""

import requests
from typing import List, Dict, Optional, Any

class NBAFetcherMixin:
    """Mixin for NBA specific fetcher logic."""

    def fetch_nba_game_player_stats(self, event_id: str) -> Dict:
        """
        Fetch detailed NBA player stats for a single game using the ESPN summary endpoint.

        Args:
            event_id: ESPN event id for the game

        Returns:
            Parsed JSON payload focused on player stats.
        """
        # Assumes self has _fetch_game_summary from BaseSportsFetcher
        return self._fetch_game_summary('nba', event_id)

    def get_nba_player_stat(
        self,
        event_id: str,
        player_name: str,
        market_type: str,
        stats_payload: Optional[Dict] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Look up a specific NBA player stat (e.g., points) from the summary payload.

        Args:
            event_id: ESPN event id
            player_name: Player display name (case-insensitive substring match)
            market_type: One of 'points', 'rebounds', 'assists', 'three_pointers_made'
            stats_payload: Optional pre-fetched summary payload to avoid re-requesting

        Returns:
            Dict with 'value' (float), 'team' (str), and 'player' (str) if found, otherwise None.
        """
        # If caller didn't pass stats, fetch them now.
        data = stats_payload or self.fetch_nba_game_player_stats(event_id)

        # Map market types to column NAMES found in the stats block
        # Based on debug output: ['MIN', 'PTS', 'FG', '3PT', 'FT', 'REB', 'AST', 'TO', 'STL', 'BLK', ...]
        market_to_col = {
            "points": "PTS",
            "rebounds": "REB",
            "assists": "AST",
            "three_pointers_made": "3PT",
            "blocks": "BLK",
            "steals": "STL",
            # double_double handled specially below
        }

        # Handle derived markets like double_double
        if market_type == "double_double":
            target_cols = ["PTS", "REB", "AST", "BLK", "STL"]
        else:
            target_col = market_to_col.get(market_type)
            if not target_col:
                return None
            target_cols = [target_col]

        # Player stats structure: boxscore -> players -> statistics -> athletes
        box = data.get("boxscore", {})
        players_by_team = box.get("players", [])

        target_name_lower = player_name.lower()

        for team_block in players_by_team:
            # Capture team name
            team_info = team_block.get("team", {})
            team_name = team_info.get("displayName") or team_info.get("name", "Unknown")

            # Usually we check all statistics blocks
            for cat in team_block.get("statistics", []):
                col_names = cat.get("names", [])
                if not col_names:
                    continue

                # Find indices for all needed columns
                col_indices = {}
                missing_col = False
                for col in target_cols:
                    if col in col_names:
                        col_indices[col] = col_names.index(col)
                    elif market_type != "double_double":
                         # For single stat markets, if column is missing in this category, skip category
                         missing_col = True
                         break
                
                if missing_col:
                    continue

                # For double_double, we need at least some stats to be present, but not necessarily all
                # usually PTS, REB, AST etc are in the same block.

                for athlete_stat in cat.get("athletes", []):
                    athlete = athlete_stat.get("athlete", {})
                    display_name = athlete.get("displayName", "")
                    if target_name_lower not in display_name.lower():
                        continue

                    # Found the athlete, get the stat from the positional list
                    stats_values = athlete_stat.get("stats", [])
                    if not isinstance(stats_values, list):
                        continue

                    if market_type == "double_double":
                        # Check count of stats >= 10
                        double_digit_stats = 0
                        stats_found = [] # List of (value, label) tuples

                        for col in target_cols:
                            idx = col_indices.get(col)
                            if idx is not None and idx < len(stats_values):
                                raw_val = stats_values[idx]
                                try:
                                    val = float(raw_val)
                                    stats_found.append((val, col))
                                    if val >= 10:
                                        double_digit_stats += 1
                                except (ValueError, TypeError):
                                    continue
                        
                        # Sort stats by value descending to show the most relevant ones
                        stats_found.sort(key=lambda x: x[0], reverse=True)
                        
                        # Construct display string from top 2 stats
                        # e.g. "12 PTS, 10 REB"
                        top_stats = stats_found[:2]
                        display_parts = [f"{int(v) if v.is_integer() else v} {k}" for v, k in top_stats]
                        display_str = ", ".join(display_parts) if display_parts else "0 PTS, 0 REB"

                        # Value is 1 if double double achieved, 0 otherwise
                        val = 1.0 if double_digit_stats >= 2 else 0.0
                        return {
                            "value": val, 
                            "team": team_name, 
                            "player": display_name,
                            "display_value": display_str
                        }
                    
                    else:
                        # Standard single stat lookup
                        target_col = target_cols[0]
                        col_idx = col_indices.get(target_col)
                        
                        if col_idx is None or col_idx >= len(stats_values):
                            continue
                        
                        raw_val = stats_values[col_idx]
                        
                        # Handle "M-A" format (e.g. "1-5" for 3PT)
                        if target_col == "3PT" and isinstance(raw_val, str) and "-" in raw_val:
                            try:
                                val = float(raw_val.split("-")[0])
                                return {"value": val, "team": team_name, "player": display_name}
                            except (ValueError, IndexError):
                                continue
                        
                        # Handle regular numeric values
                        try:
                            return {"value": float(raw_val), "team": team_name, "player": display_name}
                        except (TypeError, ValueError):
                            continue

        return None

    def fetch_nba_standings(self) -> Dict[str, List[Dict]]:
        """
        Fetch NBA standings for both conferences (2025-26 season).

        Returns:
            Dictionary mapping conference names to list of team standings
        """
        url = "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=2026"

        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            standings = {}

            # Process both conferences (Eastern and Western)
            for conference in data.get('children', []):
                if not conference.get('isConference'):
                    continue

                conf_name = conference.get('name', 'Unknown')
                conf_standings = []

                entries = conference.get('standings', {}).get('entries', [])

                for entry in entries:
                    team = entry.get('team', {})
                    stats = entry.get('stats', [])

                    # Extract relevant stats
                    wins = next((s['displayValue'] for s in stats if s['name'] == 'wins'), '0')
                    losses = next((s['displayValue'] for s in stats if s['name'] == 'losses'), '0')
                    win_pct = next((s['displayValue'] for s in stats if s['name'] == 'winPercent'), '0.000')
                    games_back = next((s['displayValue'] for s in stats if s['name'] == 'gamesBehind'), '-')
                    streak = next((s['displayValue'] for s in stats if s['name'] == 'streak'), '-')

                    team_info = {
                        'rank': len(conf_standings) + 1,
                        'team': team.get('displayName', 'Unknown'),
                        'wins': wins,
                        'losses': losses,
                        'win_pct': win_pct,
                        'games_back': games_back,
                        'streak': streak,
                    }

                    conf_standings.append(team_info)

                # Reverse the standings to show best teams first and update ranks
                reversed_standings = list(reversed(conf_standings))
                for i, team in enumerate(reversed_standings, 1):
                    team['rank'] = i

                standings[conf_name] = reversed_standings

            return standings

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching NBA standings: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing NBA standings: {str(e)}")

