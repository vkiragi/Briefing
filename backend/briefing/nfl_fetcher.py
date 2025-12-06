"""
NFL specific fetcher logic.
"""

from typing import Dict, Optional, Any

class NFLFetcherMixin:
    """Mixin for NFL specific fetcher logic."""

    def fetch_nfl_game_player_stats(self, event_id: str) -> Dict:
        """
        Fetch detailed NFL player stats for a single game using the ESPN summary endpoint.

        Args:
            event_id: ESPN event id for the game

        Returns:
            Parsed JSON payload focused on player stats.
        """
        # Assumes self has _fetch_game_summary from BaseSportsFetcher
        return self._fetch_game_summary('nfl', event_id)

    def get_nfl_player_stat(
        self,
        event_id: str,
        player_name: str,
        market_type: str,
        stats_payload: Optional[Dict] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Look up a specific NFL player stat (e.g., rushing yards) from the summary payload.

        Args:
            event_id: ESPN event id
            player_name: Player display name (case-insensitive substring match)
            market_type: 'rushing_yards', 'receiving_yards', 'passing_yards', 
                         'passing_completions', 'passing_touchdowns', etc.
            stats_payload: Optional pre-fetched summary payload to avoid re-requesting

        Returns:
            Dict with 'value' (float), 'team' (str), and 'player' (str) if found, otherwise None.
        """
        # If caller didn't pass stats, fetch them now.
        data = stats_payload or self.fetch_nfl_game_player_stats(event_id)

        # --- Derived / Composite Stats ---
        if market_type == "rushing_receiving_yards":
            rush = self.get_nfl_player_stat(event_id, player_name, "rushing_yards", data)
            rec = self.get_nfl_player_stat(event_id, player_name, "receiving_yards", data)
            val = (rush['value'] if rush else 0.0) + (rec['value'] if rec else 0.0)
            base = rush or rec
            if base:
                return {"value": val, "team": base['team'], "player": base['player']}
            return None

        if market_type == "passing_rushing_yards":
            pas = self.get_nfl_player_stat(event_id, player_name, "passing_yards", data)
            rush = self.get_nfl_player_stat(event_id, player_name, "rushing_yards", data)
            val = (pas['value'] if pas else 0.0) + (rush['value'] if rush else 0.0)
            base = pas or rush
            if base:
                return {"value": val, "team": base['team'], "player": base['player']}
            return None
            
        if market_type == "anytime_touchdowns":
            # Sum of Rushing + Receiving TDs. 
            # Note: This misses return TDs or defensive TDs, but covers the vast majority of props.
            # Could also check 'scoring' category if available.
            rush_td = self.get_nfl_player_stat(event_id, player_name, "rushing_touchdowns", data)
            rec_td = self.get_nfl_player_stat(event_id, player_name, "receiving_touchdowns", data)
            val = (rush_td['value'] if rush_td else 0.0) + (rec_td['value'] if rec_td else 0.0)
            
            # Check for return/defensive TDs via general 'touchdowns' category if needed?
            # For now, explicit sum is safer than assuming a 'total' column exists everywhere.
            base = rush_td or rec_td
            if not base:
                # Try finding player to at least return 0
                finder = self.find_player("nfl", event_id, player_name)
                if finder:
                    return {"value": 0.0, "team": finder['team_name'], "player": finder['display_name']}
                return None
                
            return {"value": val, "team": base['team'], "player": base['player']}

        # --- Event-Based Stats (First/Last TD) ---
        if market_type in ("first_touchdown", "last_touchdown"):
            scoring_plays = data.get("scoringPlays", [])
            # Filter for touchdowns
            td_plays = [
                play for play in scoring_plays 
                if "touchdown" in play.get("scoringType", {}).get("displayName", "").lower() 
                or "td" in play.get("type", {}).get("text", "").lower()
            ]
            
            if not td_plays:
                # No TDs yet
                # Return 0.0 (not hit) but we need player info.
                finder = self.find_player("nfl", event_id, player_name)
                if finder:
                    return {"value": 0.0, "team": finder['team_name'], "player": finder['display_name']}
                return None

            target_play = td_plays[0] if market_type == "first_touchdown" else td_plays[-1]
            text = target_play.get("text", "").lower()
            
            # Check if player name is in the text
            # This is a heuristic. Ideally we'd check player IDs in the play metadata.
            finder = self.find_player("nfl", event_id, player_name)
            if not finder:
                 return None
                 
            p_name = finder['display_name'].lower()
            # Simple check: is last name in text? or full name?
            # "Christian McCaffrey 6 yd Run"
            # "McCaffrey"
            last_name = p_name.split()[-1]
            
            hit = (p_name in text) or (last_name in text)
            
            return {
                "value": 1.0 if hit else 0.0,
                "team": finder['team_name'],
                "player": finder['display_name']
            }

        # --- Standard Column Mappings ---
        # Map market types to stat group + list of possible column keys
        # We check both 'keys' (API key name) and 'labels' (header text) just in case
        stat_mapping = {
            # Passing
            "passing_yards": ("passing", ["passingYards", "passYds"]),
            "passing_completions": ("passing", ["completions/passingAttempts", "C/ATT"]),
            "passing_attempts": ("passing", ["completions/passingAttempts", "C/ATT"]),
            "passing_touchdowns": ("passing", ["passingTouchdowns", "TD"]),
            "passing_interceptions": ("passing", ["interceptions", "INT"]),
            "longest_passing_completion": ("passing", ["longPassing", "LNG"]),
            
            # Rushing
            "rushing_yards": ("rushing", ["rushingYards", "rushYds"]),
            "rushing_attempts": ("rushing", ["rushingAttempts", "CAR"]),
            "rushing_touchdowns": ("rushing", ["rushingTouchdowns", "TD"]),
            "longest_rush": ("rushing", ["longRushing", "LNG"]),

            # Receiving
            "receiving_yards": ("receiving", ["receivingYards", "recYds"]),
            "receptions": ("receiving", ["receptions", "REC"]),
            "receiving_touchdowns": ("receiving", ["receivingTouchdowns", "TD"]),
            "longest_reception": ("receiving", ["longReception", "LNG"]),
            
            # Defensive
            "sacks": ("defensive", ["sacks", "SACK"]),
            "tackles_assists": ("defensive", ["totalTackles", "TOT"]),
            "tackle_assists": ("defensive", ["assists", "AST"]),
            
            # Kicking
            "field_goals_made": ("kicking", ["fieldGoalsMade", "FG"]),
            "extra_points_made": ("kicking", ["extraPointsMade", "XP"]),
            "kicking_points": ("kicking", ["points", "PTS"]),
        }

        if market_type not in stat_mapping:
            return None

        group_key, target_keys = stat_mapping[market_type]

        # Player stats are usually under 'boxscore' -> 'players' -> list by team
        box = data.get("boxscore", {})
        players_by_team = box.get("players", [])

        target_name_lower = player_name.lower()

        for team_block in players_by_team:
            # Capture team name
            team_info = team_block.get("team", {})
            team_name = team_info.get("displayName") or team_info.get("name", "Unknown")

            for cat in team_block.get("statistics", []):
                # category: passing / rushing / receiving, etc.
                if cat.get("name") != group_key:
                    continue
                
                # Determine which index contains our target stat
                # The 'keys' list in the category metadata tells us the order
                # e.g. keys: ['completions/passingAttempts', 'passingYards', ...]
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
                
                # If still not found, we can't reliably parse the list of values
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
                    
                    # Special handling for "completions/attempts" (e.g. "20/30")
                    if market_type == "passing_completions":
                        if isinstance(raw_val, str) and "/" in raw_val:
                            try:
                                val = float(raw_val.split("/")[0])
                                return {"value": val, "team": team_name, "player": display_name}
                            except (ValueError, IndexError):
                                pass
                    elif market_type == "passing_attempts":
                        if isinstance(raw_val, str) and "/" in raw_val:
                            try:
                                val = float(raw_val.split("/")[1])
                                return {"value": val, "team": team_name, "player": display_name}
                            except (ValueError, IndexError):
                                pass

                    # Special handling for "made/attempts" (e.g. "1/2" for FG/XP)
                    if market_type in ("field_goals_made", "extra_points_made"):
                         if isinstance(raw_val, str) and "/" in raw_val:
                            try:
                                val = float(raw_val.split("/")[0])
                                return {"value": val, "team": team_name, "player": display_name}
                            except (ValueError, IndexError):
                                pass
                    
                    try:
                        return {"value": float(raw_val), "team": team_name, "player": display_name}
                    except (TypeError, ValueError):
                        continue

        return None

