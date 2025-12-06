"""
Tennis specific fetcher logic.
"""

import requests
from typing import List, Dict, Optional

class TennisFetcherMixin:
    """Mixin for Tennis specific fetcher logic."""

    def fetch_scores(self, sport: str, limit: int = 10) -> List[Dict]:
        """
        Fetch recent scores. If sport is tennis, use specific logic.
        Otherwise delegate to parent.
        """
        if not (sport.lower().startswith('tennis-') or sport.lower() == 'tennis'):
            # Delegate to next class in MRO (BaseSportsFetcher)
            return super().fetch_scores(sport, limit)

        # Tennis specific implementation
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

            filter_singles = sport.lower().endswith('-singles')
            filter_doubles = sport.lower().endswith('-doubles')

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
                            # Use internal helper to parse game
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
            
            return games

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching {sport} scores: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing {sport} data: {str(e)}")

    def fetch_schedule(self, sport: str, limit: int = 10) -> List[Dict]:
        """
        Fetch schedule. If sport is tennis, use specific logic.
        Otherwise delegate to parent.
        """
        if not (sport.lower().startswith('tennis-') or sport.lower() == 'tennis'):
            return super().fetch_schedule(sport, limit)

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

            filter_singles = sport.lower().endswith('-singles')
            filter_doubles = sport.lower().endswith('-doubles')

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
        Fetch live games. If sport is tennis, use specific logic.
        Otherwise delegate to parent.
        """
        if not (sport.lower().startswith('tennis-') or sport.lower() == 'tennis'):
            return super().fetch_live(sport, limit)

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

            filter_singles = sport.lower().endswith('-singles')
            filter_doubles = sport.lower().endswith('-doubles')

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

