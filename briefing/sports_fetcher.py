"""
Sports fetcher module for retrieving data from ESPN public APIs.
"""

import requests
from typing import List, Dict, Optional, Any
from datetime import datetime
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class SportsFetcher:
    """Fetches sports scores and news from ESPN public JSON endpoints."""

    BASE_URL = "https://site.api.espn.com/apis/site/v2/sports"

    SPORTS = {
        'nfl': 'football/nfl',
        'nba': 'basketball/nba',
        'mlb': 'baseball/mlb',
        'nhl': 'hockey/nhl',
        'soccer': 'soccer/eng.1',  # Premier League (default)
        'epl': 'soccer/eng.1',  # English Premier League
        'laliga': 'soccer/esp.1',  # Spanish La Liga
        'ucl': 'soccer/uefa.champions',  # UEFA Champions League
        'europa': 'soccer/uefa.europa',  # UEFA Europa League
        'ncaaf': 'football/college-football',
        'ncaab': 'basketball/mens-college-basketball',
        'f1': 'racing/f1',  # Formula 1
        'tennis-atp-singles': 'tennis/atp',  # ATP Men's Singles
        'tennis-atp-doubles': 'tennis/atp',  # ATP Men's Doubles
        'tennis-wta-singles': 'tennis/wta',  # WTA Women's Singles
        'tennis-wta-doubles': 'tennis/wta',  # WTA Women's Doubles
    }

    def __init__(self, timeout: int = 10):
        """
        Initialize the sports fetcher.

        Args:
            timeout: Request timeout in seconds
        """
        self.timeout = timeout
        self.session = self._create_session()

    def _create_session(self) -> requests.Session:
        """Create a requests session with retry logic."""
        session = requests.Session()
        retry = Retry(
            total=3,
            backoff_factor=0.3,
            status_forcelist=[500, 502, 503, 504]
        )
        adapter = HTTPAdapter(max_retries=retry)
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        return session

    def fetch_scores(self, sport: str, limit: int = 10) -> List[Dict]:
        """
        Fetch recent scores for a specific sport.

        Args:
            sport: Sport name (e.g., 'nfl', 'nba', 'mlb')
            limit: Maximum number of games to return

        Returns:
            List of game information dictionaries
        """
        sport_path = self.SPORTS.get(sport.lower())
        if not sport_path:
            raise ValueError(f"Unknown sport: {sport}. Available: {', '.join(self.SPORTS.keys())}")

        url = f"{self.BASE_URL}/{sport_path}/scoreboard"

        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            games = []
            events = data.get('events', [])

            # Check if this is tennis (has groupings instead of direct competitions)
            is_tennis = sport.lower().startswith('tennis-')

            # Determine if we need to filter by singles or doubles
            filter_singles = sport.lower().endswith('-singles')
            filter_doubles = sport.lower().endswith('-doubles')

            if is_tennis:
                # Tennis has events -> groupings -> competitions structure
                for event in events:
                    groupings = event.get('groupings', [])

                    # Organize competitions by grouping and sort by date (newest first)
                    grouping_competitions = []
                    for grouping in groupings:
                        grouping_name = grouping.get('grouping', {}).get('displayName', '')

                        # Filter based on match type if specified
                        if filter_singles and 'Singles' not in grouping_name:
                            continue
                        if filter_doubles and 'Doubles' not in grouping_name:
                            continue

                        competitions = grouping.get('competitions', [])
                        # Sort by date in descending order (most recent first)
                        sorted_competitions = sorted(competitions, key=lambda c: c.get('date', ''), reverse=True)
                        grouping_competitions.append((grouping_name, sorted_competitions))

                    # Interleave competitions from different groupings (singles/doubles)
                    max_len = max(len(comps) for _, comps in grouping_competitions) if grouping_competitions else 0
                    for i in range(max_len):
                        for grouping_name, competitions in grouping_competitions:
                            if i < len(competitions):
                                competition = competitions[i]
                                # Create a modified event with the competition
                                tennis_event = {
                                    'name': event.get('name', ''),
                                    'competitions': [competition],
                                    'date': competition.get('date', event.get('date')),
                                    'status': competition.get('status', {}),
                                }
                                game_info = self._parse_game(tennis_event)
                                if game_info:
                                    # Add tournament name and match type for context
                                    game_info['tournament'] = event.get('name', 'Unknown Tournament')
                                    game_info['match_type'] = grouping_name
                                    games.append(game_info)

                                if len(games) >= limit:
                                    break
                        if len(games) >= limit:
                            break

                    if len(games) >= limit:
                        break
            else:
                # Standard sports structure
                for event in events[:limit]:
                    game_info = self._parse_game(event)
                    if game_info:
                        games.append(game_info)

            return games

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching {sport} scores: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing {sport} data: {str(e)}")

    def fetch_news(self, sport: str, limit: int = 10) -> List[Dict]:
        """
        Fetch recent news for a specific sport.

        Args:
            sport: Sport name (e.g., 'nfl', 'nba', 'mlb')
            limit: Maximum number of news items to return

        Returns:
            List of news article dictionaries
        """
        sport_path = self.SPORTS.get(sport.lower())
        if not sport_path:
            raise ValueError(f"Unknown sport: {sport}. Available: {', '.join(self.SPORTS.keys())}")

        url = f"{self.BASE_URL}/{sport_path}/news"

        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            news_items = []
            articles = data.get('articles', [])[:limit]

            for article in articles:
                news_item = {
                    'title': article.get('headline', 'No title'),
                    'description': article.get('description', 'No description'),
                    'link': article.get('links', {}).get('web', {}).get('href', ''),
                    'published': self._parse_timestamp(article.get('published')),
                }
                news_items.append(news_item)

            return news_items

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching {sport} news: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing {sport} news: {str(e)}")

    def fetch_schedule(self, sport: str, limit: int = 10) -> List[Dict]:
        """
        Fetch upcoming games schedule for a specific sport.

        Args:
            sport: Sport name (e.g., 'nfl', 'nba', 'mlb')
            limit: Maximum number of games to return

        Returns:
            List of scheduled game dictionaries
        """
        sport_path = self.SPORTS.get(sport.lower())
        if not sport_path:
            raise ValueError(f"Unknown sport: {sport}. Available: {', '.join(self.SPORTS.keys())}")

        url = f"{self.BASE_URL}/{sport_path}/scoreboard"

        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            games = []
            events = data.get('events', [])

            # Check if this is tennis (has groupings instead of direct competitions)
            is_tennis = sport.lower().startswith('tennis-')

            # Determine if we need to filter by singles or doubles
            filter_singles = sport.lower().endswith('-singles')
            filter_doubles = sport.lower().endswith('-doubles')

            if is_tennis:
                # Tennis has events -> groupings -> competitions structure
                for event in events:
                    groupings = event.get('groupings', [])

                    # Organize scheduled competitions by grouping and sort by date (newest first)
                    grouping_competitions = []
                    for grouping in groupings:
                        grouping_name = grouping.get('grouping', {}).get('displayName', '')

                        # Filter based on match type if specified
                        if filter_singles and 'Singles' not in grouping_name:
                            continue
                        if filter_doubles and 'Doubles' not in grouping_name:
                            continue

                        competitions = grouping.get('competitions', [])
                        scheduled_comps = []
                        for comp in competitions:
                            status = comp.get('status', {})
                            status_type = status.get('type', {})
                            state = status_type.get('state', 'pre')
                            if state == 'pre':
                                scheduled_comps.append(comp)
                        # Sort by date in descending order (most recent first)
                        sorted_scheduled = sorted(scheduled_comps, key=lambda c: c.get('date', ''), reverse=True)
                        if sorted_scheduled:
                            grouping_competitions.append((grouping_name, sorted_scheduled))

                    # Interleave competitions from different groupings
                    max_len = max(len(comps) for _, comps in grouping_competitions) if grouping_competitions else 0
                    for i in range(max_len):
                        for grouping_name, competitions in grouping_competitions:
                            if i < len(competitions):
                                competition = competitions[i]
                                tennis_event = {
                                    'name': event.get('name', ''),
                                    'competitions': [competition],
                                    'date': competition.get('date', event.get('date')),
                                    'status': competition.get('status', {}),
                                }
                                game_info = self._parse_game(tennis_event)
                                if game_info:
                                    game_info['tournament'] = event.get('name', 'Unknown Tournament')
                                    game_info['match_type'] = grouping_name
                                    games.append(game_info)

                                if len(games) >= limit:
                                    break
                        if len(games) >= limit:
                            break

                    if len(games) >= limit:
                        break
            else:
                # Filter for upcoming games only (state == 'pre')
                for event in events:
                    status = event.get('status', {})
                    status_type = status.get('type', {})
                    state = status_type.get('state', 'pre')

                    # Only include pre-game (scheduled) events
                    if state == 'pre':
                        game_info = self._parse_game(event)
                        if game_info:
                            games.append(game_info)

                        if len(games) >= limit:
                            break

            # If no upcoming games in current scoreboard, try fetching future dates
            if not games:
                # Get calendar dates from the API response
                calendar = data.get('leagues', [{}])[0].get('calendar', []) if data.get('leagues') else []

                if calendar:
                    from datetime import datetime, timezone
                    now = datetime.now(timezone.utc)

                    # Find the next upcoming date in the calendar
                    for date_str in calendar:
                        try:
                            event_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                            # If this date is in the future, try fetching it
                            if event_date > now:
                                date_param = event_date.strftime('%Y%m%d')
                                future_url = f"{url}?dates={date_param}"

                                future_response = self.session.get(future_url, timeout=self.timeout)
                                future_response.raise_for_status()
                                future_data = future_response.json()

                                future_events = future_data.get('events', [])
                                for event in future_events:
                                    status = event.get('status', {})
                                    status_type = status.get('type', {})
                                    state = status_type.get('state', 'pre')

                                    if state == 'pre':
                                        game_info = self._parse_game(event)
                                        if game_info:
                                            games.append(game_info)

                                        if len(games) >= limit:
                                            break

                                # If we found games, stop searching
                                if games:
                                    break
                        except Exception:
                            continue

            # If still no upcoming games, return TBD message
            if not games:
                return [{
                    'home_team': 'Season ended or no upcoming games',
                    'away_team': 'Check back later',
                    'home_score': 'TBD',
                    'away_score': 'TBD',
                    'status': 'TBD',
                    'completed': False,
                    'date': 'TBD',
                    'state': 'tbd',
                }]

            return games

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching {sport} schedule: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing {sport} schedule: {str(e)}")

    def fetch_live(self, sport: str, limit: int = 10) -> List[Dict]:
        """
        Fetch only live/in-progress games for a specific sport.

        Args:
            sport: Sport name (e.g., 'nfl', 'nba', 'mlb')
            limit: Maximum number of games to return

        Returns:
            List of live game dictionaries
        """
        sport_path = self.SPORTS.get(sport.lower())
        if not sport_path:
            raise ValueError(f"Unknown sport: {sport}. Available: {', '.join(self.SPORTS.keys())}")

        url = f"{self.BASE_URL}/{sport_path}/scoreboard"

        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            games = []
            events = data.get('events', [])

            # Check if this is tennis (has groupings instead of direct competitions)
            is_tennis = sport.lower().startswith('tennis-')

            # Determine if we need to filter by singles or doubles
            filter_singles = sport.lower().endswith('-singles')
            filter_doubles = sport.lower().endswith('-doubles')

            if is_tennis:
                # Tennis has events -> groupings -> competitions structure
                for event in events:
                    groupings = event.get('groupings', [])

                    # Organize live competitions by grouping and sort by date (newest first)
                    grouping_competitions = []
                    for grouping in groupings:
                        grouping_name = grouping.get('grouping', {}).get('displayName', '')

                        # Filter based on match type if specified
                        if filter_singles and 'Singles' not in grouping_name:
                            continue
                        if filter_doubles and 'Doubles' not in grouping_name:
                            continue

                        competitions = grouping.get('competitions', [])
                        live_comps = []
                        for comp in competitions:
                            status = comp.get('status', {})
                            status_type = status.get('type', {})
                            state = status_type.get('state', '')
                            if state == 'in':
                                live_comps.append(comp)
                        # Sort by date in descending order (most recent first)
                        sorted_live = sorted(live_comps, key=lambda c: c.get('date', ''), reverse=True)
                        if sorted_live:
                            grouping_competitions.append((grouping_name, sorted_live))

                    # Interleave competitions from different groupings
                    max_len = max(len(comps) for _, comps in grouping_competitions) if grouping_competitions else 0
                    for i in range(max_len):
                        for grouping_name, competitions in grouping_competitions:
                            if i < len(competitions):
                                competition = competitions[i]
                                tennis_event = {
                                    'name': event.get('name', ''),
                                    'competitions': [competition],
                                    'date': competition.get('date', event.get('date')),
                                    'status': competition.get('status', {}),
                                }
                                game_info = self._parse_game(tennis_event)
                                if game_info:
                                    game_info['tournament'] = event.get('name', 'Unknown Tournament')
                                    game_info['match_type'] = grouping_name
                                    games.append(game_info)

                                if len(games) >= limit:
                                    break
                        if len(games) >= limit:
                            break

                    if len(games) >= limit:
                        break
            else:
                # Standard sports structure - filter for live games only (state == 'in')
                for event in events:
                    status = event.get('status', {})
                    status_type = status.get('type', {})
                    state = status_type.get('state', '')

                    # Only include in-progress (live) events
                    if state == 'in':
                        game_info = self._parse_game(event)
                        if game_info:
                            games.append(game_info)

                        if len(games) >= limit:
                            break

            # If no live games, return a message
            if not games:
                return [{
                    'home_team': 'No live games at the moment',
                    'away_team': 'Check back later',
                    'home_score': '-',
                    'away_score': '-',
                    'status': 'No live games',
                    'completed': False,
                    'date': '-',
                    'state': 'no_live',
                }]

            return games

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching {sport} live scores: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing {sport} live scores: {str(e)}")

    def _fetch_game_summary(self, sport: str, event_id: str) -> Dict:
        """
        Fetch game summary/boxscore for a specific sport and event.

        Args:
            sport: Sport name ('nfl' or 'nba')
            event_id: ESPN event id

        Returns:
            Parsed JSON payload with added _game_state field.
        """
        sport_path = self.SPORTS.get(sport.lower())
        if not sport_path:
            raise ValueError(f"Unknown sport: {sport}")

        url = f"{self.BASE_URL}/{sport_path}/summary?event={event_id}"

        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            # Determine basic game state from header/status if available
            header = data.get("header", {})
            status = header.get("status", {})
            status_type = status.get("type", {})
            state = status_type.get("state", "").lower()

            # Fallback: check competitions[0] if state missing in header
            if not state:
                comps = header.get("competitions", [])
                if comps:
                    state = comps[0].get("status", {}).get("type", {}).get("state", "").lower()
            
            state = state or "unknown"

            # Extract detailed status for display (e.g. "5:09 - 2nd" or "Final")
            status_detail = ""
            
            # Try to find the status object
            target_status = header.get("status")
            if not target_status or not target_status.get("type"):
                 comps = header.get("competitions", [])
                 if comps:
                     target_status = comps[0].get("status")
            
            if target_status:
                # Prefer shortDetail (e.g. "5:09 - 2nd")
                status_detail = target_status.get("type", {}).get("shortDetail")

                # Parse and reformat time if it's a date string (e.g. "11/25 - 8:00 PM EST")
                # We want to display PST first: "11/25 - 5:00 PM PST / 8:00 PM EST"
                # ESPN usually returns EST.
                if status_detail and (" PM " in status_detail or " AM " in status_detail) and (" EST" in status_detail or " EDT" in status_detail):
                    try:
                        # Extract the time part
                        # Typical format: "11/25 - 8:00 PM EST" or "Mon, November 25 - 8:00 PM EST"
                        # Simple string replacement for EST->PST calculation (-3 hours)
                        # This is a heuristic and might need full datetime parsing for robustness,
                        # but avoiding heavy datetime dependencies/parsing logic here for simplicity if possible.
                        
                        from datetime import datetime, timedelta
                        from dateutil import parser

                        # Clean up the string to parse it
                        # Remove " - " to make it easier or split
                        parts = status_detail.rsplit(' - ', 1)
                        if len(parts) == 2:
                             date_part = parts[0]
                             time_part_full = parts[1] # "8:00 PM EST"
                             
                             # Extract time and timezone
                             time_str = time_part_full.replace(" EST", "").replace(" EDT", "").strip()
                             is_dst = "EDT" in time_part_full
                             
                             # Parse full datetime string to handle date rollovers
                             # parser.parse handles missing year (defaults to current)
                             full_dt_str = f"{date_part} {time_str}"
                             dt = parser.parse(full_dt_str)
                             
                             # Subtract 3 hours for PST
                             t_pst = dt - timedelta(hours=3)
                             pst_time_str = t_pst.strftime("%I:%M %p").lstrip("0")
                             pst_zone = "PDT" if is_dst else "PST"
                             
                             # Reconstruct string, handling date change if needed
                             if t_pst.date() == dt.date():
                                 status_detail = f"{date_part} - {pst_time_str} {pst_zone} / {time_part_full}"
                             else:
                                 # Date rolled back (e.g. 2 AM EST -> 11 PM PST prev day)
                                 # Match input format style
                                 if "/" in date_part:
                                     pst_date_str = f"{t_pst.month}/{t_pst.day}"
                                 else:
                                     pst_date_str = t_pst.strftime("%a, %B %d")
                                 
                                 # Show both full timestamps
                                 status_detail = f"{pst_date_str} - {pst_time_str} {pst_zone} / {date_part} - {time_part_full}"
                    except Exception:
                        # If parsing fails, leave as is
                        pass
                
                # Fallback if shortDetail missing but we have clock/period
                if not status_detail and state == "in":
                    clock = target_status.get("displayClock", "")
                    period = target_status.get("period", "")
                    if clock and period:
                        status_detail = f"Q{period} {clock}"

            # Attach a lightweight game_state hint at the top level
            data["_game_state"] = state
            data["_game_status_detail"] = status_detail if status_detail else state
            return data
        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching {sport} summary for event {event_id}: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing {sport} summary for event {event_id}: {str(e)}")

    def fetch_nfl_game_player_stats(self, event_id: str) -> Dict:
        """
        Fetch detailed NFL player stats for a single game using the ESPN summary endpoint.

        Args:
            event_id: ESPN event id for the game

        Returns:
            Parsed JSON payload focused on player stats.
        """
        return self._fetch_game_summary('nfl', event_id)

    def fetch_nba_game_player_stats(self, event_id: str) -> Dict:
        """
        Fetch detailed NBA player stats for a single game using the ESPN summary endpoint.

        Args:
            event_id: ESPN event id for the game

        Returns:
            Parsed JSON payload focused on player stats.
        """
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
            market_type: One of 'rushing_yards', 'receiving_yards', 'passing_yards'
            stats_payload: Optional pre-fetched summary payload to avoid re-requesting

        Returns:
            Dict with 'value' (float), 'team' (str), and 'player' (str) if found, otherwise None.
        """
        # If caller didn't pass stats, fetch them now.
        data = stats_payload or self.fetch_nfl_game_player_stats(event_id)

        # Map market types to stat group + stat name used by ESPN
        # This is based on common ESPN JSON structures for NFL boxscores.
        stat_mapping = {
            "rushing_yards": ("rushing", ["rushingYards", "rushYds"]),
            "receiving_yards": ("receiving", ["receivingYards", "recYds"]),
            "passing_yards": ("passing", ["passingYards", "passYds"]),
        }

        if market_type not in stat_mapping:
            return None

        group_key, stat_keys = stat_mapping[market_type]

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

                for athlete_stat in cat.get("athletes", []):
                    athlete = athlete_stat.get("athlete", {})
                    display_name = athlete.get("displayName", "")
                    if target_name_lower not in display_name.lower():
                        continue

                    # Within this athlete's stats, look for yards fields
                    for stat_obj in athlete_stat.get("stats", []):
                        # Some schemas have 'name' + 'value', others may be positional
                        name = stat_obj.get("name")
                        value = stat_obj.get("value")

                        if name in stat_keys and value is not None:
                            try:
                                return {"value": float(value), "team": team_name, "player": display_name}
                            except (TypeError, ValueError):
                                continue

                    # Fallback: some variants pack stats differently (e.g., 'yards' field)
                    # Try a generic 'yards' key if present.
                    yards = athlete_stat.get("yards")
                    if yards is not None:
                        try:
                            return {"value": float(yards), "team": team_name, "player": display_name}
                        except (TypeError, ValueError):
                            pass

        return None

    def fetch_team_roster(self, sport: str, team_id: str) -> List[Dict]:
        """
        Fetch team roster from ESPN.
        """
        sport_path = self.SPORTS.get(sport.lower())
        if not sport_path:
            return []

        url = f"{self.BASE_URL}/{sport_path}/teams/{team_id}/roster"
        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            return data.get('athletes', [])
        except Exception:
            return []

    def find_player(self, sport: str, event_id: str, player_name: str) -> Optional[Dict[str, str]]:
        """
        Check if a player exists in a game and return their details.

        Args:
            sport: 'nfl' or 'nba'
            event_id: Game event ID
            player_name: Name fragment to search for

        Returns:
            Dict with 'display_name' and 'team_name' if found, else None.
        """
        # Fetch game stats
        if sport == 'nba':
            data = self.fetch_nba_game_player_stats(event_id)
        else:
            data = self.fetch_nfl_game_player_stats(event_id)

        # Search in boxscore
        box = data.get("boxscore", {})
        players_by_team = box.get("players", [])
        target_name_lower = player_name.lower()

        for team_block in players_by_team:
            team_info = team_block.get("team", {})
            team_name = team_info.get("displayName") or team_info.get("name", "Unknown")

            # Check all statistic categories
            for cat in team_block.get("statistics", []):
                for athlete_stat in cat.get("athletes", []):
                    athlete = athlete_stat.get("athlete", {})
                    display_name = athlete.get("displayName", "")

                    if target_name_lower in display_name.lower():
                        return {
                            "display_name": display_name,
                            "team_name": team_name
                        }

        # Fallback: Check rosters if player not found in boxscore stats (e.g. pre-game or DNP)
        try:
            header = data.get('header', {})
            competitions = header.get('competitions', [])
            if competitions:
                competitors = competitions[0].get('competitors', [])
                for comp in competitors:
                    team = comp.get('team', {})
                    team_id = team.get('id')
                    team_name = team.get('displayName') or team.get('name')

                    if team_id:
                        roster = self.fetch_team_roster(sport, team_id)
                        for athlete in roster:
                            display_name = athlete.get('displayName') or athlete.get('fullName', '')
                            if target_name_lower in display_name.lower():
                                return {
                                    "display_name": display_name,
                                    "team_name": team_name
                                }
        except Exception:
            pass

        return None

    def _parse_game(self, event: Dict) -> Optional[Dict]:
        """Parse game data from ESPN API response into a compact dict.

        Note: For NFL props, we also need the ESPN event id so we can call the
        summary/boxscore endpoint for detailed player stats. When present, the
        `event['id']` field will be propagated as `event_id` in the result.
        """
        try:
            competitions = event.get('competitions', [])
            if not competitions:
                return None

            competition = competitions[0]
            competitors = competition.get('competitors', [])

            if len(competitors) < 2:
                return None

            # ESPN usually has home team at index 0, away at index 1
            home_team = competitors[0]
            away_team = competitors[1]

            status = event.get('status', {})
            status_type = status.get('type', {})

            # Check if game has started
            state = status_type.get('state', 'pre')
            completed = status_type.get('completed', False)

            # Check if this is tennis (has roster or athlete instead of team)
            # Tennis doubles: 'roster.displayName', Singles: 'athlete.displayName', Regular sports: 'team.displayName'
            is_tennis = 'roster' in home_team or 'athlete' in home_team

            if 'roster' in home_team:
                # Tennis doubles
                home_name = home_team.get('roster', {}).get('shortDisplayName') or home_team.get('roster', {}).get('displayName', 'Unknown')
                away_name = away_team.get('roster', {}).get('shortDisplayName') or away_team.get('roster', {}).get('displayName', 'Unknown')
            elif 'athlete' in home_team:
                # Tennis singles
                home_name = home_team.get('athlete', {}).get('displayName', 'Unknown')
                away_name = away_team.get('athlete', {}).get('displayName', 'Unknown')
            else:
                # Regular team sports
                home_name = home_team.get('team', {}).get('displayName', 'Unknown')
                away_name = away_team.get('team', {}).get('displayName', 'Unknown')

            # Get scores - tennis uses linescores (sets won), other sports use score field
            if state == 'pre':
                home_score = 'TBD'
                away_score = 'TBD'
                set_scores_str = None  # No set scores for pre-game
            elif is_tennis:
                # For tennis, count sets won from linescores
                home_linescores = home_team.get('linescores', [])
                away_linescores = away_team.get('linescores', [])

                home_sets_won = sum(1 for ls in home_linescores if ls.get('winner', False))
                away_sets_won = sum(1 for ls in away_linescores if ls.get('winner', False))

                home_score = str(home_sets_won)
                away_score = str(away_sets_won)

                # Build set-by-set score string (e.g., "6-4, 4-6, 7-6(3)")
                # Note: Scores are shown from away player's perspective (away-home)
                set_scores = []
                for i in range(len(home_linescores)):
                    if i < len(away_linescores):
                        home_games = int(home_linescores[i].get('value', 0))
                        away_games = int(away_linescores[i].get('value', 0))

                        # Check for tiebreak - winner of the set has the tiebreak score
                        home_tiebreak = home_linescores[i].get('tiebreak')
                        away_tiebreak = away_linescores[i].get('tiebreak')

                        if home_tiebreak is not None or away_tiebreak is not None:
                            # Show tiebreak score (the winner's tiebreak score is what's recorded)
                            tb = home_tiebreak if home_tiebreak is not None else away_tiebreak
                            # Always show away-home to match the score column
                            set_scores.append(f"{away_games}-{home_games}({int(tb)})")
                        else:
                            # Regular set - show away-home
                            set_scores.append(f"{away_games}-{home_games}")

                set_scores_str = ", ".join(set_scores) if set_scores else ""
            else:
                # Regular sports use score field
                home_score = home_team.get('score', '0')
                away_score = away_team.get('score', '0')
                set_scores_str = None  # Not tennis, no set scores

            # Extract detailed game status info (period/quarter and time)
            period = status.get('period')
            display_clock = status.get('displayClock', '')
            clock_seconds = status.get('clock', 0)

            game_info = {
                'home_team': home_name,
                'home_score': home_score,
                'away_team': away_name,
                'away_score': away_score,
                'status': status_type.get('description', 'Unknown'),
                'completed': completed,
                'date': self._parse_timestamp(event.get('date')),
                'state': state,
                'period': period,
                'display_clock': display_clock,
                'clock_seconds': clock_seconds,
            }

            # Include ESPN event id and competition id when available for downstream
            # use (e.g., detailed player stats for props dashboard).
            event_id = event.get('id')
            if event_id:
                game_info['event_id'] = str(event_id)

            comp_id = competition.get('id')
            if comp_id:
                game_info['competition_id'] = str(comp_id)

            # Add set scores for tennis
            if is_tennis and set_scores_str:
                game_info['set_scores'] = set_scores_str

            return game_info

        except Exception as e:
            print(f"Warning: Error parsing game data: {str(e)}")
            return None

    @staticmethod
    def _parse_timestamp(timestamp: Optional[str]) -> str:
        """Parse ISO timestamp to readable format in local time."""
        if not timestamp:
            return 'Unknown date'

        try:
            # Parse the ISO timestamp
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))

            # Convert to local timezone
            local_dt = dt.astimezone()

            # Format as readable date/time
            # Show day of week, date, and time
            return local_dt.strftime('%a, %b %d - %I:%M %p')
        except:
            return timestamp

    def fetch_f1_standings(self) -> List[Dict]:
        """
        Fetch F1 driver standings using OpenF1/Jolpica F1 API.

        Returns:
            List of driver standings with position, name, points, and team
        """
        # Use Jolpica F1 API for standings data (2025 season)
        url = "http://api.jolpi.ca/ergast/f1/2025/driverStandings"

        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            standings = []

            # Parse Jolpica/Ergast API response
            standings_table = data.get('MRData', {}).get('StandingsTable', {})
            standings_lists = standings_table.get('StandingsLists', [])

            if standings_lists and len(standings_lists) > 0:
                driver_standings = standings_lists[0].get('DriverStandings', [])

                for standing in driver_standings:
                    driver = standing.get('Driver', {})
                    constructors = standing.get('Constructors', [])
                    team_name = constructors[0].get('name', 'Unknown') if constructors else 'Unknown'

                    driver_info = {
                        'position': standing.get('position', 'N/A'),
                        'driver': f"{driver.get('givenName', '')} {driver.get('familyName', 'Unknown')}".strip(),
                        'team': team_name,
                        'points': standing.get('points', '0'),
                    }
                    standings.append(driver_info)

            return standings

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching F1 standings: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing F1 standings: {str(e)}")

    def fetch_f1_races(self, limit: Optional[int] = None) -> List[Dict]:
        """
        Fetch F1 race schedule and results using Jolpica F1 API.

        Args:
            limit: Maximum number of races to return (None = all races)

        Returns:
            List of race information with name, date, location, and winner if completed
        """
        try:
            # First, fetch the full schedule (2025 season)
            schedule_url = "http://api.jolpi.ca/ergast/f1/2025.json"
            schedule_response = self.session.get(schedule_url, timeout=self.timeout)
            schedule_response.raise_for_status()
            schedule_data = schedule_response.json()

            # Then, fetch the results to get winners
            results_url = "http://api.jolpi.ca/ergast/f1/2025/results/1.json"
            results_response = self.session.get(results_url, timeout=self.timeout)
            results_response.raise_for_status()
            results_data = results_response.json()

            # Create a map of race round to winner
            race_results = {}
            results_races = results_data.get('MRData', {}).get('RaceTable', {}).get('Races', [])
            for race in results_races:
                round_num = race.get('round')
                results = race.get('Results', [])
                if results and len(results) > 0:
                    winner_data = results[0]
                    driver = winner_data.get('Driver', {})
                    winner = f"{driver.get('givenName', '')} {driver.get('familyName', 'Unknown')}".strip()
                    race_results[round_num] = winner

            # Process the full schedule
            races = []
            race_table = schedule_data.get('MRData', {}).get('RaceTable', {})
            race_list = race_table.get('Races', [])

            for race in race_list[:limit] if limit else race_list:
                # Get race information
                race_name = race.get('raceName', 'Unknown Race')
                round_num = race.get('round')
                circuit = race.get('Circuit', {})
                location = circuit.get('Location', {})
                location_str = f"{location.get('locality', 'Unknown')}, {location.get('country', 'Unknown')}"

                # Parse date
                race_date = race.get('date', '')
                race_time = race.get('time', '00:00:00Z')

                # Combine date and time for proper parsing
                if race_date and race_time:
                    datetime_str = f"{race_date}T{race_time}"
                    formatted_date = self._parse_timestamp(datetime_str)
                else:
                    formatted_date = race_date

                # Check if race has been completed (has a winner)
                if round_num in race_results:
                    winner = race_results[round_num]
                    status = 'Completed'
                    completed = True
                else:
                    winner = 'TBD'
                    status = 'Scheduled'
                    completed = False

                race_info = {
                    'name': race_name,
                    'date': formatted_date,
                    'location': location_str,
                    'status': status,
                    'completed': completed,
                    'winner': winner,
                }

                races.append(race_info)

            return races

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching F1 races: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing F1 races: {str(e)}")

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

    def fetch_soccer_standings(self, league: str = 'epl') -> List[Dict]:
        """
        Fetch soccer league standings (2025-26 season).

        Args:
            league: League code (epl, laliga, ucl, europa)

        Returns:
            List of team standings for the specified league
        """
        # Map league codes to API paths
        league_paths = {
            'soccer': 'eng.1',
            'epl': 'eng.1',
            'laliga': 'esp.1',
            'ucl': 'uefa.champions',
            'europa': 'uefa.europa',
        }

        league_path = league_paths.get(league.lower(), 'eng.1')
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{league_path}/standings?season=2025"

        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            standings = []

            # Premier League has a single table (no conferences/divisions)
            children = data.get('children', [])
            if children and len(children) > 0:
                entries = children[0].get('standings', {}).get('entries', [])

                for entry in entries:
                    team = entry.get('team', {})
                    stats = entry.get('stats', [])

                    # Extract relevant stats
                    rank = next((s['displayValue'] for s in stats if s['name'] == 'rank'), '0')
                    played = next((s['displayValue'] for s in stats if s['name'] == 'gamesPlayed'), '0')
                    wins = next((s['displayValue'] for s in stats if s['name'] == 'wins'), '0')
                    draws = next((s['displayValue'] for s in stats if s['name'] == 'ties'), '0')
                    losses = next((s['displayValue'] for s in stats if s['name'] == 'losses'), '0')
                    points = next((s['displayValue'] for s in stats if s['name'] == 'points'), '0')
                    goal_diff = next((s['displayValue'] for s in stats if s['name'] == 'pointDifferential'), '0')

                    # Get qualification note (Champions League, Europa, etc.)
                    note = entry.get('note', {})
                    note_desc = note.get('description', '')

                    team_info = {
                        'rank': rank,
                        'team': team.get('displayName', 'Unknown'),
                        'played': played,
                        'wins': wins,
                        'draws': draws,
                        'losses': losses,
                        'goal_diff': goal_diff,
                        'points': points,
                        'note': note_desc,
                    }

                    standings.append(team_info)

            return standings

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching Premier League standings: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing Premier League standings: {str(e)}")

    @classmethod
    def list_available_sports(cls) -> List[str]:
        """Get list of available sports."""
        return list(cls.SPORTS.keys())
