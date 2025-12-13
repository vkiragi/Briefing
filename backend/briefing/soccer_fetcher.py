"""
Soccer specific fetcher logic.
"""

import requests
from typing import List, Dict, Any, Optional

class SoccerFetcherMixin:
    """Mixin for Soccer specific fetcher logic."""

    # Map league codes to API paths
    SOCCER_LEAGUE_PATHS = {
        'soccer': 'eng.1',
        'epl': 'eng.1',
        'laliga': 'esp.1',
        'seriea': 'ita.1',
        'bundesliga': 'ger.1',
        'ligue1': 'fra.1',
        'ucl': 'uefa.champions',
        'europa': 'uefa.europa',
        'ligaportugal': 'por.1',
        'saudi': 'ksa.1',
        'mls': 'usa.1',
        'brasileirao': 'bra.1',
        'ligamx': 'mex.1',
        'scottish': 'sco.1',
        'greek': 'gre.1',
        'russian': 'rus.1',
        'turkish': 'tur.1',
        'austrian': 'aut.1',
    }

    def fetch_soccer_game_stats(self, league: str, event_id: str) -> Dict:
        """
        Fetch detailed soccer match stats using the ESPN summary endpoint.

        Args:
            league: League code (epl, laliga, ucl, etc.)
            event_id: ESPN event id for the match

        Returns:
            Parsed JSON payload with match and player stats.
        """
        league_path = self.SOCCER_LEAGUE_PATHS.get(league.lower(), 'eng.1')
        url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league_path}/summary?event={event_id}"

        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            # Extract game state
            header = data.get("header", {})
            comps = header.get("competitions", [])
            state = "unknown"
            status_detail = ""

            if comps:
                status = comps[0].get("status", {})
                status_type = status.get("type", {})
                state = status_type.get("state", "").lower() or "unknown"
                status_detail = status_type.get("shortDetail", "") or status_type.get("description", "")

            data["_game_state"] = state
            data["_game_status_detail"] = status_detail

            # Extract half scores (linescores)
            try:
                if comps:
                    competitors = comps[0].get("competitors", [])
                    home_linescores = []
                    away_linescores = []
                    home_id = ""
                    away_id = ""

                    for c in competitors:
                        ha = c.get("homeAway")
                        ls = c.get("linescores", [])
                        ls_vals = []
                        for x in ls:
                            val = x.get("value")
                            if val is None:
                                val = x.get("displayValue", 0)
                            try:
                                ls_vals.append(float(val))
                            except (ValueError, TypeError):
                                ls_vals.append(0)

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
            raise Exception(f"Error fetching soccer summary for event {event_id}: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing soccer summary for event {event_id}: {str(e)}")

    def fetch_soccer_standings(self, league: str = 'epl') -> List[Dict]:
        """
        Fetch soccer league standings (2025-26 season).

        Args:
            league: League code (epl, laliga, ucl, europa)

        Returns:
            List of team standings for the specified league
        """
        league_path = self.SOCCER_LEAGUE_PATHS.get(league.lower(), 'eng.1')
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

