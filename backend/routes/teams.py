import time
from datetime import datetime, timezone, timedelta
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi import APIRouter, HTTPException, Query, Body, Depends
from briefing.supabase_service import supabase_service
from briefing.sports_fetcher import SportsFetcher
from .auth import get_current_user
from .models import FavoriteTeam, FavoriteTeamRequest

router = APIRouter(tags=["teams"])

sports_fetcher = SportsFetcher()

# In-memory cache for teams data (refreshes every 24 hours)
_teams_cache: Dict[str, Dict] = {}  # {sport: {'data': [...], 'timestamp': float}}
_TEAMS_CACHE_TTL = 86400  # 24 hours in seconds


def _get_cached_teams(sport_key: str, sport_display: str) -> list:
    """Get teams from cache or fetch from ESPN if stale/missing."""
    cache_entry = _teams_cache.get(sport_key)
    now = time.time()

    # Return cached data if fresh
    if cache_entry and (now - cache_entry['timestamp']) < _TEAMS_CACHE_TTL:
        return cache_entry['data']

    # Fetch fresh data
    try:
        sport_path = sports_fetcher.SPORTS.get(sport_key)
        if not sport_path:
            return []

        url = f"{sports_fetcher.BASE_URL}/{sport_path}/teams?limit=100"
        response = sports_fetcher.session.get(url, timeout=5)

        if response.status_code != 200:
            # Return stale cache if available, otherwise empty
            return cache_entry['data'] if cache_entry else []

        data = response.json()
        teams_raw = data.get('sports', [{}])[0].get('leagues', [{}])[0].get('teams', [])

        # Parse and cache
        teams = []
        for team_entry in teams_raw:
            team = team_entry.get('team', {})
            logos = team.get('logos', [])
            logo_url = logos[0].get('href', '') if logos else ''

            teams.append({
                'id': team.get('id', ''),
                'name': team.get('displayName', ''),
                'abbreviation': team.get('abbreviation', ''),
                'nickname': team.get('nickname', ''),
                'logo': logo_url,
                'sport': sport_key,
                'sportDisplay': sport_display,
            })

        _teams_cache[sport_key] = {'data': teams, 'timestamp': now}
        return teams

    except Exception as e:
        print(f"Error fetching teams for {sport_key}: {e}")
        # Return stale cache if available
        return cache_entry['data'] if cache_entry else []


@router.get("/api/teams/search")
def search_teams(query: str = Query(..., min_length=2), limit: int = Query(10, ge=1, le=50)):
    """
    Search for teams across all supported sports.
    Returns matching teams with their ID, name, abbreviation, logo, and sport.
    Uses cached team data for fast responses.
    """
    try:
        results = []
        query_lower = query.lower().strip()

        # Sports to search through (team-based sports only)
        team_sports = [
            ('nfl', 'NFL'),
            ('nba', 'NBA'),
            ('mlb', 'MLB'),
            ('nhl', 'NHL'),
            ('epl', 'Premier League'),
            ('laliga', 'La Liga'),
            ('ucl', 'Champions League'),
            ('seriea', 'Serie A'),
            ('bundesliga', 'Bundesliga'),
            ('mls', 'MLS'),
            ('ncaaf', 'College Football'),
            ('ncaab', 'College Basketball'),
            ('ligue1', 'Ligue 1'),
        ]

        # Fetch teams from all sports in parallel (uses cache when available)
        def fetch_sport(sport_tuple):
            sport_key, sport_display = sport_tuple
            return _get_cached_teams(sport_key, sport_display)

        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = {executor.submit(fetch_sport, s): s for s in team_sports}
            all_teams = []
            for future in as_completed(futures, timeout=10):
                try:
                    teams = future.result()
                    all_teams.extend(teams)
                except Exception as e:
                    print(f"Error in parallel team fetch: {e}")

        # Search through all teams
        for team in all_teams:
            name = team.get('name', '')
            abbreviation = team.get('abbreviation', '')
            nickname = team.get('nickname', '')

            if (query_lower in name.lower() or
                query_lower in abbreviation.lower() or
                query_lower in nickname.lower()):

                results.append({
                    'id': team['id'],
                    'name': name,
                    'abbreviation': abbreviation,
                    'logo': team['logo'],
                    'sport': team['sport'],
                    'sportDisplay': team['sportDisplay'],
                })

                if len(results) >= limit * 2:  # Get extra for sorting
                    break

        # Sort results by relevance (starts with > contains)
        def relevance(team):
            name_lower = team['name'].lower()
            abbrev_lower = team['abbreviation'].lower()
            if name_lower.startswith(query_lower) or abbrev_lower.startswith(query_lower):
                return 0
            return 1

        results.sort(key=relevance)
        return results[:limit]

    except Exception as e:
        print(f"Error searching teams: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/teams/by-sport/{sport}")
def get_teams_by_sport(sport: str):
    """
    Get all teams for a specific sport/league.
    Returns teams sorted alphabetically by name.
    Uses cached team data for fast responses.
    """
    try:
        # Map sport key to display name
        sport_display_map = {
            'nfl': 'NFL',
            'nba': 'NBA',
            'mlb': 'MLB',
            'nhl': 'NHL',
            'epl': 'Premier League',
            'laliga': 'La Liga',
            'ucl': 'Champions League',
            'seriea': 'Serie A',
            'bundesliga': 'Bundesliga',
            'mls': 'MLS',
            'ncaaf': 'College Football',
            'ncaab': 'College Basketball',
            'ligue1': 'Ligue 1',
            'ligaportugal': 'Liga Portugal',
            'saudi': 'Saudi Pro League',
            'brasileirao': 'Brasileirao',
            'ligamx': 'Liga MX',
        }

        sport_lower = sport.lower()
        sport_display = sport_display_map.get(sport_lower, sport.upper())

        sport_path = sports_fetcher.SPORTS.get(sport_lower)
        if not sport_path:
            raise HTTPException(status_code=404, detail=f"Sport '{sport}' not found")

        # Use cached teams data
        teams = _get_cached_teams(sport_lower, sport_display)

        if not teams:
            raise HTTPException(status_code=500, detail="Failed to fetch teams")

        # Format results (cache already has parsed data)
        results = [{
            'id': team['id'],
            'name': team['name'],
            'abbreviation': team['abbreviation'],
            'logo': team['logo'],
            'sport': team['sport'],
            'sportDisplay': team['sportDisplay'],
        } for team in teams]

        # Sort alphabetically by name
        results.sort(key=lambda x: x['name'].lower())
        return results

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting teams for sport {sport}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/teams/favorites/results")
def get_favorite_teams_results(teams: List[FavoriteTeam] = Body(...)):
    """
    Get latest results and next game for favorite teams.
    Returns last completed game result and next scheduled game for each team.
    """
    try:
        results = []

        for team in teams:
            team_result = {
                'team_id': team.id,
                'team_name': team.name,
                'sport': team.sport,
                'last_game': None,
                'next_game': None,
                'logo': None,
            }

            try:
                sport_path = sports_fetcher.SPORTS.get(team.sport.lower())
                if not sport_path:
                    results.append(team_result)
                    continue

                # For soccer teams, use 'soccer/all' to get all competitions (league, cups, etc.)
                # This ensures we show Champions League, FA Cup, etc. games for favorite teams
                if sport_path.startswith('soccer/'):
                    schedule_path = 'soccer/all'
                else:
                    schedule_path = sport_path

                # Fetch team schedule (includes past and future games)
                url = f"{sports_fetcher.BASE_URL}/{schedule_path}/teams/{team.id}/schedule"
                response = sports_fetcher.session.get(url, timeout=10)

                if response.status_code != 200:
                    results.append(team_result)
                    continue

                data = response.json()

                # Get team info (including logo)
                team_info = data.get('team', {})
                logos = team_info.get('logos', [])
                team_result['logo'] = logos[0].get('href', '') if logos else None
                team_result['team_name'] = team_info.get('displayName', team.name)

                events = data.get('events', [])

                # Find most recent completed game and next upcoming game
                now = datetime.now(timezone.utc)

                completed_games = []
                upcoming_games = []

                for event in events:
                    competitions = event.get('competitions', [])
                    if not competitions:
                        continue

                    comp = competitions[0]
                    status = comp.get('status', {}).get('type', {})
                    state = status.get('state', 'pre')

                    # Parse event date
                    event_date_str = event.get('date', '')
                    try:
                        event_date = datetime.fromisoformat(event_date_str.replace('Z', '+00:00'))
                    except:
                        continue

                    competitors = comp.get('competitors', [])
                    if len(competitors) < 2:
                        continue

                    # Determine which competitor is our team
                    our_team = None
                    opponent = None
                    is_home = False

                    for c in competitors:
                        c_team = c.get('team', {})
                        if str(c_team.get('id', '')) == str(team.id):
                            our_team = c
                            is_home = c.get('homeAway', 'away') == 'home'
                        else:
                            opponent = c

                    if not our_team or not opponent:
                        continue

                    opponent_team = opponent.get('team', {})
                    opponent_logos = opponent_team.get('logos', [])

                    game_data = {
                        'event_id': event.get('id', ''),
                        'date': event_date_str,
                        'opponent_name': opponent_team.get('displayName', 'Unknown'),
                        'opponent_abbreviation': opponent_team.get('abbreviation', ''),
                        'opponent_logo': opponent_logos[0].get('href', '') if opponent_logos else '',
                        'is_home': is_home,
                        'our_score': our_team.get('score', {}).get('displayValue', '0') if isinstance(our_team.get('score'), dict) else our_team.get('score', '0'),
                        'opponent_score': opponent.get('score', {}).get('displayValue', '0') if isinstance(opponent.get('score'), dict) else opponent.get('score', '0'),
                        'status': status.get('description', ''),
                        'state': state,
                    }

                    # Determine if it was a win/loss
                    if state == 'post':
                        try:
                            our_score = int(game_data['our_score']) if game_data['our_score'] else 0
                            opp_score = int(game_data['opponent_score']) if game_data['opponent_score'] else 0
                            game_data['result'] = 'W' if our_score > opp_score else ('L' if our_score < opp_score else 'T')
                        except:
                            game_data['result'] = None
                        completed_games.append((event_date, game_data))
                    elif state == 'pre':
                        upcoming_games.append((event_date, game_data))

                # Get most recent completed game
                if completed_games:
                    completed_games.sort(key=lambda x: x[0], reverse=True)
                    team_result['last_game'] = completed_games[0][1]

                # Get next upcoming game
                if upcoming_games:
                    upcoming_games.sort(key=lambda x: x[0])
                    team_result['next_game'] = upcoming_games[0][1]

                # If no upcoming games found in schedule, search scoreboard for next 14 days
                # This is needed because some leagues (especially soccer) don't include future fixtures in schedule
                if not team_result['next_game']:
                    for days_ahead in range(1, 15):
                        future_date = now + timedelta(days=days_ahead)
                        date_str = future_date.strftime('%Y%m%d')

                        try:
                            scoreboard_url = f"{sports_fetcher.BASE_URL}/{schedule_path}/scoreboard?dates={date_str}"
                            scoreboard_response = sports_fetcher.session.get(scoreboard_url, timeout=5)

                            if scoreboard_response.status_code != 200:
                                continue

                            scoreboard_data = scoreboard_response.json()
                            scoreboard_events = scoreboard_data.get('events', [])

                            for event in scoreboard_events:
                                competitions = event.get('competitions', [])
                                if not competitions:
                                    continue

                                comp = competitions[0]
                                competitors = comp.get('competitors', [])

                                # Check if our team is in this game
                                our_team_comp = None
                                opponent_comp = None
                                is_home = False

                                for c in competitors:
                                    c_team = c.get('team', {})
                                    if str(c_team.get('id', '')) == str(team.id):
                                        our_team_comp = c
                                        is_home = c.get('homeAway', 'away') == 'home'
                                    else:
                                        opponent_comp = c

                                if our_team_comp and opponent_comp:
                                    status = comp.get('status', {}).get('type', {})
                                    state = status.get('state', 'pre')

                                    # Only consider pre-game or scheduled games
                                    if state in ('pre', 'scheduled'):
                                        opponent_team = opponent_comp.get('team', {})
                                        opponent_logos = opponent_team.get('logos', [])
                                        opponent_logo_url = opponent_logos[0].get('href', '') if opponent_logos else ''

                                        # If no logo in scoreboard, fetch from team endpoint
                                        if not opponent_logo_url:
                                            opponent_id = opponent_team.get('id', '')
                                            if opponent_id:
                                                try:
                                                    team_url = f"{sports_fetcher.BASE_URL}/{schedule_path}/teams/{opponent_id}"
                                                    team_response = sports_fetcher.session.get(team_url, timeout=5)
                                                    if team_response.status_code == 200:
                                                        team_data = team_response.json()
                                                        team_logos = team_data.get('team', {}).get('logos', [])
                                                        if team_logos:
                                                            opponent_logo_url = team_logos[0].get('href', '')
                                                except:
                                                    pass

                                        team_result['next_game'] = {
                                            'event_id': event.get('id', ''),
                                            'date': event.get('date', ''),
                                            'opponent_name': opponent_team.get('displayName', 'Unknown'),
                                            'opponent_abbreviation': opponent_team.get('abbreviation', ''),
                                            'opponent_logo': opponent_logo_url,
                                            'is_home': is_home,
                                            'status': status.get('description', ''),
                                            'state': state,
                                        }
                                        break

                            # If we found a game, stop searching
                            if team_result['next_game']:
                                break

                        except Exception as scoreboard_err:
                            # Continue to next day on error
                            continue

            except Exception as e:
                print(f"Error fetching results for team {team.id}: {e}")

            results.append(team_result)

        return results

    except Exception as e:
        print(f"Error getting favorite teams results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Favorite Teams Database Sync Endpoints
# ==========================================

@router.get("/api/favorite-teams")
def get_favorite_teams(user_id: str = Depends(get_current_user)):
    """Get user's favorite teams from the database"""
    try:
        teams = supabase_service.get_favorite_teams(user_id)
        return teams
    except Exception as e:
        print(f"Error getting favorite teams: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/favorite-teams")
def add_favorite_team(team: FavoriteTeamRequest, user_id: str = Depends(get_current_user)):
    """Add a team to user's favorites"""
    try:
        result = supabase_service.add_favorite_team(user_id, team.model_dump())
        return result
    except Exception as e:
        print(f"Error adding favorite team: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/favorite-teams/{team_id}/{sport}")
def remove_favorite_team(team_id: str, sport: str, user_id: str = Depends(get_current_user)):
    """Remove a team from user's favorites"""
    try:
        success = supabase_service.remove_favorite_team(user_id, team_id, sport)
        if not success:
            raise HTTPException(status_code=404, detail="Team not found in favorites")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error removing favorite team: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/favorite-teams/sync")
def sync_favorite_teams(teams: List[FavoriteTeamRequest], user_id: str = Depends(get_current_user)):
    """Sync all favorite teams - replaces current favorites with provided list"""
    try:
        teams_data = [t.model_dump() for t in teams]
        result = supabase_service.sync_favorite_teams(user_id, teams_data)
        return result
    except Exception as e:
        print(f"Error syncing favorite teams: {e}")
        raise HTTPException(status_code=500, detail=str(e))
