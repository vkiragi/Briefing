"""
Tennis specific fetcher logic using the header API for match data.
"""

import requests
from typing import List, Dict
from datetime import datetime, timedelta


class TennisFetcherMixin:
    """Mixin for Tennis specific fetcher logic using header API."""

    def fetch_scores(self, sport: str, limit: int = 10) -> List[Dict]:
        """
        Fetch recent tennis scores using the header API endpoint.
        Falls back to showing upcoming tournaments if no matches available.
        """
        if not (sport.lower().startswith('tennis-') or sport.lower() == 'tennis'):
            return super().fetch_scores(sport, limit)

        return self._fetch_tennis_scores_from_header(sport, limit)

    def fetch_live(self, sport: str, limit: int = 10) -> List[Dict]:
        """
        Fetch live tennis matches using the header API endpoint.
        """
        if not (sport.lower().startswith('tennis-') or sport.lower() == 'tennis'):
            return super().fetch_live(sport, limit)

        matches = self._fetch_tennis_scores_from_header(sport, limit)
        # Filter for only live matches (state == 'in')
        live_matches = [m for m in matches if m.get('state') == 'in']
        if live_matches:
            return live_matches
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

    def fetch_schedule(self, sport: str, limit: int = 10) -> List[Dict]:
        """
        Fetch upcoming tennis tournaments when no matches are available.
        """
        if not (sport.lower().startswith('tennis-') or sport.lower() == 'tennis'):
            return super().fetch_schedule(sport, limit)

        league = 'wta' if 'wta' in sport.lower() else 'atp'
        return self._fetch_tennis_upcoming_tournaments(league, limit)

    def _fetch_tennis_scores_from_header(self, sport: str, limit: int = 10) -> List[Dict]:
        """
        Fetch tennis scores using the header API endpoint.
        Tennis data structure is different from team sports.
        Falls back to showing upcoming tournaments if no matches available.
        """
        sport_lower = sport.lower()
        if 'wta' in sport_lower:
            league = 'wta'
        else:
            league = 'atp'

        # Determine match type filter (singles or doubles)
        match_type_filter = None
        if 'singles' in sport_lower:
            match_type_filter = 'singles'
        elif 'doubles' in sport_lower:
            match_type_filter = 'doubles'

        url = f"https://site.api.espn.com/apis/v2/scoreboard/header?sport=tennis&league={league}"

        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            games = []
            sports = data.get('sports', [])

            for sport_data in sports:
                for league_data in sport_data.get('leagues', []):
                    events = league_data.get('events', [])

                    for event in events:
                        competitors = event.get('competitors', [])
                        if len(competitors) < 2:
                            continue

                        # Determine if this is singles or doubles based on competitor names
                        # Doubles matches have "/" in the name (e.g., "H. Heliovaara / H. Patten")
                        is_doubles = '/' in competitors[0].get('displayName', '')

                        # Apply match type filter
                        if match_type_filter == 'singles' and is_doubles:
                            continue
                        if match_type_filter == 'doubles' and not is_doubles:
                            continue

                        status = event.get('fullStatus', {}).get('type', {})
                        state = status.get('state', 'pre')
                        completed = status.get('completed', False)

                        # Parse scores - tennis header API uses different format
                        home_score = competitors[0].get('score', 'TBD')
                        away_score = competitors[1].get('score', 'TBD')

                        game_info = {
                            'home_team': competitors[0].get('displayName', 'Unknown'),
                            'home_score': home_score if state != 'pre' else 'TBD',
                            'away_team': competitors[1].get('displayName', 'Unknown'),
                            'away_score': away_score if state != 'pre' else 'TBD',
                            'status': status.get('description', 'Unknown'),
                            'completed': completed,
                            'date': event.get('date', 'Unknown date'),
                            'state': state,
                            'event_name': event.get('name', ''),
                            'tournament': event.get('name', ''),
                            'match_type': 'doubles' if is_doubles else 'singles',
                            'set_scores': home_score if state != 'pre' else None,
                        }

                        # Add event ID if available
                        event_id = event.get('id')
                        if event_id:
                            game_info['event_id'] = str(event_id)

                        games.append(game_info)

                        if len(games) >= limit:
                            break

                    if len(games) >= limit:
                        break
                if len(games) >= limit:
                    break

            # If no matches found, try to get upcoming tournaments
            if not games:
                games = self._fetch_tennis_upcoming_tournaments(league, limit)

            return games

        except requests.exceptions.RequestException as e:
            print(f"Fetch tennis scores request error for {sport}: {e}")
            return []
        except Exception as e:
            print(f"Fetch tennis scores parsing error for {sport}: {e}")
            return []

    def _fetch_tennis_upcoming_tournaments(self, league: str, limit: int = 10) -> List[Dict]:
        """
        Fetch upcoming tennis tournaments when no matches are available.
        """
        sport_path = f"tennis/{league}"
        url = f"{self.BASE_URL}/{sport_path}/scoreboard"

        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            tournaments = []
            events = data.get('events', [])

            # Get tournaments from current scoreboard
            for event in events[:limit]:
                name = event.get('name', 'Unknown Tournament')
                date = event.get('date', '')
                end_date = event.get('endDate', '')

                tournaments.append({
                    'home_team': name,
                    'away_team': 'Upcoming Tournament',
                    'home_score': '-',
                    'away_score': '-',
                    'status': 'Scheduled',
                    'completed': False,
                    'date': date,
                    'state': 'pre',
                    'event_name': name,
                    'tournament': name,
                    'match_type': 'tournament',
                    'end_date': end_date,
                })

            # If no events in current scoreboard, check future dates
            if not tournaments:
                now = datetime.now()

                # Check next 60 days for tournaments
                days_to_check = list(range(1, 8)) + list(range(14, 61, 7))

                for i in days_to_check:
                    next_date = now + timedelta(days=i)
                    date_param = next_date.strftime("%Y%m%d")
                    future_url = f"{url}?dates={date_param}"

                    try:
                        future_response = self.session.get(future_url, timeout=self.timeout)
                        if future_response.status_code != 200:
                            continue

                        future_data = future_response.json()
                        future_events = future_data.get('events', [])

                        for event in future_events:
                            name = event.get('name', 'Unknown Tournament')
                            date = event.get('date', '')
                            end_date = event.get('endDate', '')

                            # Avoid duplicates
                            if any(t['home_team'] == name for t in tournaments):
                                continue

                            tournaments.append({
                                'home_team': name,
                                'away_team': 'Upcoming Tournament',
                                'home_score': '-',
                                'away_score': '-',
                                'status': 'Scheduled',
                                'completed': False,
                                'date': date,
                                'state': 'pre',
                                'event_name': name,
                                'tournament': name,
                                'match_type': 'tournament',
                                'end_date': end_date,
                            })

                            if len(tournaments) >= limit:
                                break

                        if len(tournaments) >= limit:
                            break
                    except Exception:
                        continue

            # If still nothing, return a TBD message
            if not tournaments:
                return [{
                    'home_team': 'No upcoming tournaments',
                    'away_team': 'Check back later',
                    'home_score': '-',
                    'away_score': '-',
                    'status': 'TBD',
                    'completed': False,
                    'date': 'TBD',
                    'state': 'tbd',
                }]

            return tournaments

        except Exception as e:
            print(f"Fetch tennis tournaments error: {e}")
            return [{
                'home_team': 'Error loading tournaments',
                'away_team': 'Check back later',
                'home_score': '-',
                'away_score': '-',
                'status': 'Error',
                'completed': False,
                'date': '-',
                'state': 'error',
            }]
