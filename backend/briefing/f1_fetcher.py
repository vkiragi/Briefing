"""
F1 specific fetcher logic.
"""

import requests
from typing import List, Dict, Optional, Any

class F1FetcherMixin:
    """Mixin for F1 specific fetcher logic."""

    def fetch_f1_standings(self) -> List[Dict]:
        """
        Fetch F1 driver standings using OpenF1/Jolpica F1 API.

        Returns:
            List of driver standings with position, name, points, and team
        """
        # Use Jolpica F1 API for standings data (2025 season)
        url = "http://api.jolpi.ca/ergast/f1/2025/driverStandings"

        try:
            # self.session and self.timeout provided by BaseSportsFetcher
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
                    # Assumes _parse_timestamp is available (from BaseSportsFetcher)
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

