"""
Soccer specific fetcher logic.
"""

import requests
from typing import List, Dict, Any

class SoccerFetcherMixin:
    """Mixin for Soccer specific fetcher logic."""

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
            # self.session and self.timeout provided by BaseSportsFetcher
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

