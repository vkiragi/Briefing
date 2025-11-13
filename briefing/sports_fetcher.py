"""
Sports fetcher module for retrieving data from ESPN public APIs.
"""

import requests
from typing import List, Dict, Optional
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
        'tennis-atp': 'tennis/atp',  # ATP Men's Tennis
        'tennis-wta': 'tennis/wta',  # WTA Women's Tennis
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
            is_tennis = sport.lower() in ['tennis-atp', 'tennis-wta']

            if is_tennis:
                # Tennis has events -> groupings -> competitions structure
                # Interleave singles and doubles to show both types
                for event in events:
                    groupings = event.get('groupings', [])

                    # Organize competitions by grouping
                    grouping_competitions = []
                    for grouping in groupings:
                        grouping_name = grouping.get('grouping', {}).get('displayName', '')
                        competitions = grouping.get('competitions', [])
                        grouping_competitions.append((grouping_name, competitions))

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
            is_tennis = sport.lower() in ['tennis-atp', 'tennis-wta']

            if is_tennis:
                # Tennis has events -> groupings -> competitions structure
                # Interleave singles and doubles to show both types
                for event in events:
                    groupings = event.get('groupings', [])

                    # Organize scheduled competitions by grouping
                    grouping_competitions = []
                    for grouping in groupings:
                        grouping_name = grouping.get('grouping', {}).get('displayName', '')
                        competitions = grouping.get('competitions', [])
                        scheduled_comps = []
                        for comp in competitions:
                            status = comp.get('status', {})
                            status_type = status.get('type', {})
                            state = status_type.get('state', 'pre')
                            if state == 'pre':
                                scheduled_comps.append(comp)
                        if scheduled_comps:
                            grouping_competitions.append((grouping_name, scheduled_comps))

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
            is_tennis = sport.lower() in ['tennis-atp', 'tennis-wta']

            if is_tennis:
                # Tennis has events -> groupings -> competitions structure
                # Interleave singles and doubles to show both types
                for event in events:
                    groupings = event.get('groupings', [])

                    # Organize live competitions by grouping
                    grouping_competitions = []
                    for grouping in groupings:
                        grouping_name = grouping.get('grouping', {}).get('displayName', '')
                        competitions = grouping.get('competitions', [])
                        live_comps = []
                        for comp in competitions:
                            status = comp.get('status', {})
                            status_type = status.get('type', {})
                            state = status_type.get('state', '')
                            if state == 'in':
                                live_comps.append(comp)
                        if live_comps:
                            grouping_competitions.append((grouping_name, live_comps))

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

    def _parse_game(self, event: Dict) -> Optional[Dict]:
        """Parse game data from ESPN API response."""
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
