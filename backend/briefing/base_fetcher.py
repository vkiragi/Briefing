"""
Base sports fetcher module for retrieving data from ESPN public APIs.
"""

import requests
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from dateutil import parser

class BaseSportsFetcher:
    """Base class for fetching sports scores and news from ESPN public JSON endpoints."""

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
        'tennis': 'tennis/atp', # Default to ATP
        'tennis-atp-singles': 'tennis/atp',  # ATP Men's Singles
        'tennis-atp-doubles': 'tennis/atp',  # ATP Men's Doubles
        'tennis-wta-singles': 'tennis/wta',  # WTA Women's Singles
        'tennis-wta-doubles': 'tennis/wta',  # WTA Women's Doubles
        'ufc': 'mma/ufc', # UFC
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

            # Standard sports structure
            for event in events[:limit]:
                game_info = self._parse_game(event)
                if game_info:
                    games.append(game_info)

            return games

        except requests.exceptions.RequestException as e:
            print(f"Fetch scores request error for {sport}: {e}")
            return []
        except Exception as e:
            print(f"Fetch scores parsing error for {sport}: {e}")
            return []

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
                
                # Strategy 1: Try to use the calendar provided by ESPN
                if calendar:
                    from datetime import datetime, timezone
                    now = datetime.now(timezone.utc)

                    # Find the next upcoming date in the calendar
                    for date_str in calendar:
                        try:
                            # Handle different calendar formats
                            if isinstance(date_str, str):
                                # Try ISO format first
                                try:
                                    event_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                                except ValueError:
                                    # Try simple date format YYYY-MM-DD
                                    event_date = datetime.strptime(date_str[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                            elif isinstance(date_str, dict):
                                # Sometimes calendar is a list of objects
                                ds = date_str.get('startDate', '') or date_str.get('date', '')
                                try:
                                    event_date = datetime.fromisoformat(ds.replace('Z', '+00:00'))
                                except ValueError:
                                    event_date = datetime.strptime(ds[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                            else:
                                continue

                            # If this date is in the future (or today), try fetching it
                            if event_date.date() >= now.date():
                                date_param = event_date.strftime('%Y%m%d')
                                future_url = f"{url}?dates={date_param}"

                                try:
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
                                except Exception:
                                    continue

                                # If we found games, stop searching
                                if games:
                                    break
                        except Exception:
                            continue
                
                # Strategy 2: If calendar failed or empty, brute force check future dates
                # Check daily for first week, then weekly up to 60 days (for tournaments with long breaks like UCL)
                if not games:
                    from datetime import datetime, timedelta
                    now = datetime.now()

                    # Build list of days to check: daily for 7 days, then weekly for 8 more weeks
                    days_to_check = list(range(1, 8))  # Days 1-7
                    days_to_check.extend(range(14, 61, 7))  # Days 14, 21, 28, 35, 42, 49, 56

                    for i in days_to_check:
                        try:
                            next_date = now + timedelta(days=i)
                            date_param = next_date.strftime("%Y%m%d")
                            future_url = f"{url}?dates={date_param}"

                            future_response = self.session.get(future_url, timeout=self.timeout)
                            if future_response.status_code != 200:
                                continue

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

                            if games:
                                break
                        except Exception:
                            continue

            # If still no upcoming games, return TBD message

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
            print(f"Fetch schedule request error for {sport}: {e}")
            # Return empty list or TBD instead of crashing
            return [{
                'home_team': 'Failed to load schedule',
                'away_team': 'Please try again later',
                'home_score': '-',
                'away_score': '-',
                'status': 'Error',
                'completed': False,
                'date': '-',
                'state': 'error',
            }]
        except Exception as e:
            print(f"Fetch schedule parsing error for {sport}: {e}")
            return [{
                'home_team': 'Error parsing schedule',
                'away_team': 'Please try again later',
                'home_score': '-',
                'away_score': '-',
                'status': 'Error',
                'completed': False,
                'date': '-',
                'state': 'error',
            }]

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
            print(f"Fetch live request error for {sport}: {e}")
            return [{
                'home_team': 'Failed to load live games',
                'away_team': 'Please try again later',
                'home_score': '-',
                'away_score': '-',
                'status': 'Error',
                'completed': False,
                'date': '-',
                'state': 'error',
            }]
        except Exception as e:
            print(f"Fetch live parsing error for {sport}: {e}")
            return [{
                'home_team': 'Error parsing live games',
                'away_team': 'Please try again later',
                'home_score': '-',
                'away_score': '-',
                'status': 'Error',
                'completed': False,
                'date': '-',
                'state': 'error',
            }]

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
            
            # Extract Quarter/Half scores for props
            # Competitors -> Linescores
            # Note: Competitors are usually [home, away] or vice versa
            
            try:
                comps = header.get("competitions", [])
                if comps:
                    competitors = comps[0].get("competitors", [])
                    home_linescores = []
                    away_linescores = []
                    home_id = ""
                    away_id = ""
                    
                    for c in competitors:
                        ha = c.get("homeAway")
                        ls = c.get("linescores", [])
                        ls_vals = [float(x.get("value", 0)) for x in ls]
                        tid = c.get("team", {}).get("displayName", "")
                        
                        if ha == "home":
                            home_linescores = ls_vals
                            home_id = tid
                        else:
                            away_linescores = ls_vals
                            away_id = tid
                            
                    data["_linescores"] = {
                        "home": home_linescores,
                        "away": away_linescores,
                        "home_team": home_id,
                        "away_team": away_id
                    }
            except Exception:
                pass
            
            return data
        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching {sport} summary for event {event_id}: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing {sport} summary for event {event_id}: {str(e)}")

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
            athletes = data.get('athletes', [])

            # Handle grouped roster (e.g. NFL has groups by position)
            if athletes and 'items' in athletes[0]:
                flat_roster = []
                for group in athletes:
                    flat_roster.extend(group.get('items', []))
                return flat_roster

            return athletes
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
            # Assumes mixin availability
            if hasattr(self, 'fetch_nba_game_player_stats'):
                data = self.fetch_nba_game_player_stats(event_id)
            else:
                return None
        elif sport == 'mlb':
            if hasattr(self, 'fetch_mlb_game_player_stats'):
                data = self.fetch_mlb_game_player_stats(event_id)
            else:
                return None
        else:
            if hasattr(self, 'fetch_nfl_game_player_stats'):
                data = self.fetch_nfl_game_player_stats(event_id)
            else:
                return None

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

    def search_players(self, sport: str, event_id: str, query: str, limit: int = 10) -> List[Dict[str, str]]:
        """
        Search for players in a game matching a query string.
        Returns a list of matching players with their display names and team names.

        Args:
            sport: 'nfl' or 'nba' or 'mlb'
            event_id: Game event ID
            query: Search query (player name fragment)
            limit: Maximum number of results to return

        Returns:
            List of dicts with 'display_name' and 'team_name', sorted by relevance.
        """
        if not query or len(query.strip()) < 1:
            return []

        # Fetch game stats
        if sport == 'nba':
            if hasattr(self, 'fetch_nba_game_player_stats'):
                data = self.fetch_nba_game_player_stats(event_id)
            else:
                return []
        elif sport == 'mlb':
            if hasattr(self, 'fetch_mlb_game_player_stats'):
                data = self.fetch_mlb_game_player_stats(event_id)
            else:
                return []
        else:
            if hasattr(self, 'fetch_nfl_game_player_stats'):
                data = self.fetch_nfl_game_player_stats(event_id)
            else:
                return []

        query_lower = query.lower().strip()
        matches = []
        seen_players = set()

        # Search in boxscore stats
        box = data.get("boxscore", {})
        players_by_team = box.get("players", [])

        for team_block in players_by_team:
            team_info = team_block.get("team", {})
            team_name = team_info.get("displayName") or team_info.get("name", "Unknown")

            for cat in team_block.get("statistics", []):
                for athlete_stat in cat.get("athletes", []):
                    athlete = athlete_stat.get("athlete", {})
                    display_name = athlete.get("displayName", "")
                    if not display_name:
                        continue

                    # Create unique key for deduplication
                    player_key = f"{display_name}|{team_name}"
                    if player_key in seen_players:
                        continue

                    display_name_lower = display_name.lower()
                    
                    # Check if query matches (starts with or contains)
                    if display_name_lower.startswith(query_lower):
                        matches.append({
                            "display_name": display_name,
                            "team_name": team_name,
                            "relevance": 1  # Exact start match
                        })
                        seen_players.add(player_key)
                    elif query_lower in display_name_lower:
                        matches.append({
                            "display_name": display_name,
                            "team_name": team_name,
                            "relevance": 2  # Contains match
                        })
                        seen_players.add(player_key)

                    if len(matches) >= limit:
                        break

                if len(matches) >= limit:
                    break
            if len(matches) >= limit:
                break

        # If not enough matches, also search rosters (for pre-game scenarios)
        if len(matches) < limit:
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
                            try:
                                roster = self.fetch_team_roster(sport, team_id)
                                for athlete in roster:
                                    display_name = athlete.get('displayName') or athlete.get('fullName', '')
                                    if not display_name:
                                        continue

                                    player_key = f"{display_name}|{team_name}"
                                    if player_key in seen_players:
                                        continue

                                    display_name_lower = display_name.lower()
                                    
                                    if display_name_lower.startswith(query_lower):
                                        matches.append({
                                            "display_name": display_name,
                                            "team_name": team_name,
                                            "relevance": 1
                                        })
                                        seen_players.add(player_key)
                                    elif query_lower in display_name_lower:
                                        matches.append({
                                            "display_name": display_name,
                                            "team_name": team_name,
                                            "relevance": 2
                                        })
                                        seen_players.add(player_key)

                                    if len(matches) >= limit:
                                        break
                            except Exception:
                                continue  # Skip if roster fetch fails

                        if len(matches) >= limit:
                            break
            except Exception:
                pass

        # Sort by relevance (1 = starts with, 2 = contains), then alphabetically
        matches.sort(key=lambda x: (x["relevance"], x["display_name"]))
        
        # Remove relevance key before returning
        return [{"display_name": m["display_name"], "team_name": m["team_name"]} for m in matches[:limit]]

    def _parse_game(self, event: Dict) -> Optional[Dict]:
        """Parse game data from ESPN API response into a compact dict."""
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

            # Extract odds info
            odds_info = {}
            if competition.get('odds'):
                try:
                    odds_data = competition['odds'][0]
                    odds_info = {
                        'details': odds_data.get('details', ''),
                        'over_under': odds_data.get('overUnder'),
                        'spread': odds_data.get('spread'),
                    }
                    
                    # Extract moneyline if available
                    if 'homeTeamOdds' in odds_data:
                        odds_info['home_moneyline'] = odds_data['homeTeamOdds'].get('moneyLine')
                        odds_info['home_spread_odds'] = odds_data['homeTeamOdds'].get('spreadOdds')
                    
                    if 'awayTeamOdds' in odds_data:
                        odds_info['away_moneyline'] = odds_data['awayTeamOdds'].get('moneyLine')
                        odds_info['away_spread_odds'] = odds_data['awayTeamOdds'].get('spreadOdds')
                        
                except Exception:
                    pass

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
                'odds': odds_info,
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
        """Return ISO timestamp for frontend to handle timezone conversion."""
        if not timestamp:
            return 'Unknown date'

        try:
            # Parse and normalize to ISO format with timezone info
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            # Return ISO format string - frontend will convert to user's timezone
            return dt.isoformat()
        except:
            return timestamp

    @classmethod
    def list_available_sports(cls) -> List[str]:
        """Get list of available sports."""
        return list(cls.SPORTS.keys())
