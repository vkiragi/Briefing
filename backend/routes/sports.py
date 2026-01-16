from typing import List, Dict, Optional
from fastapi import APIRouter, HTTPException, Query, Body
from briefing.sports_fetcher import SportsFetcher

router = APIRouter(prefix="/api/sports", tags=["sports"])

sports_fetcher = SportsFetcher()


@router.get("/scores")
def get_scores(
    sport: str,
    limit: int = 10,
    live: bool = False,
    date: Optional[str] = Query(None, description="Date in YYYYMMDD format")
):
    try:
        if live:
            return sports_fetcher.fetch_live(sport, limit)
        return sports_fetcher.fetch_scores(sport, limit, date=date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schedule")
def get_schedule(
    sport: str,
    limit: int = 10,
    date: Optional[str] = Query(None, description="Date in YYYYMMDD format")
):
    try:
        return sports_fetcher.fetch_schedule(sport, limit, date=date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/standings")
def get_standings(sport: str):
    try:
        sport = sport.lower()
        if sport == 'nba':
            return sports_fetcher.fetch_nba_standings()
        elif sport == 'mlb':
            return sports_fetcher.fetch_mlb_standings()
        elif sport == 'f1':
            return sports_fetcher.fetch_f1_standings()
        elif sport == 'nfl':
            return sports_fetcher.fetch_nfl_standings()
        elif sport in ['soccer', 'epl', 'laliga', 'ucl', 'europa']:
            return sports_fetcher.fetch_soccer_standings(league=sport)
        else:
             raise HTTPException(status_code=400, detail=f"Standings not supported for {sport}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/f1/races")
def get_f1_races():
    try:
        return sports_fetcher.fetch_f1_races()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/f1/race/{round_number}")
def get_f1_race_results(round_number: int):
    """
    Get detailed results for a specific F1 race by round number.
    Returns full finishing order with times, positions, and team info.
    """
    try:
        return sports_fetcher.fetch_f1_race_results(round_number)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/boxing/fights")
def get_boxing_fights(limit: int = Query(10, ge=1, le=20)):
    """
    Get upcoming and recent boxing fights.
    Returns fight cards with fighters, date, venue, and results if completed.
    """
    try:
        return sports_fetcher.fetch_boxing_fights(limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nfl/week")
def get_nfl_week(date: Optional[str] = Query(None, description="Date in YYYYMMDD format")):
    """
    Get NFL week information for a given date.
    Returns week number and date range for that week.
    """
    try:
        return sports_fetcher.get_nfl_week_info(date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
def list_sports():
    return sports_fetcher.list_available_sports()


@router.get("/news")
def get_sports_news(sport: str, limit: int = 10):
    try:
        return sports_fetcher.fetch_news(sport, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/boxscore")
def get_boxscore(sport: str, event_id: str):
    """
    Get detailed box score for a specific game.
    Returns player stats for both teams and period scores.
    Supports: nba, nfl, mlb, soccer leagues, and tennis
    """
    try:
        sport = sport.lower()

        # List of supported sports
        soccer_leagues = ['epl', 'laliga', 'seriea', 'bundesliga', 'ligue1', 'ucl', 'europa',
                         'ligaportugal', 'saudi', 'mls', 'brasileirao', 'ligamx', 'scottish',
                         'greek', 'russian', 'turkish', 'austrian', 'soccer']
        tennis_types = ['tennis', 'tennis-atp-singles', 'tennis-atp-doubles',
                       'tennis-wta-singles', 'tennis-wta-doubles']
        supported_sports = ['nba', 'nfl', 'mlb', 'ncaab', 'ncaaf'] + soccer_leagues + tennis_types

        if sport not in supported_sports:
            raise HTTPException(status_code=400, detail=f"Box score not supported for {sport}")

        # Handle tennis separately - returns different structure
        if sport in tennis_types:
            league = 'wta' if 'wta' in sport else 'atp'
            result = sports_fetcher.fetch_tennis_match_details(league, event_id)
            if result.get('error'):
                raise HTTPException(status_code=404, detail=result['error'])
            return result

        # Fetch raw data based on sport type
        if sport == 'nba':
            raw_data = sports_fetcher.fetch_nba_game_player_stats(event_id)
        elif sport == 'ncaab':
            # NCAA Basketball uses same format as NBA
            raw_data = sports_fetcher._fetch_game_summary('ncaab', event_id)
        elif sport == 'nfl':
            raw_data = sports_fetcher.fetch_nfl_game_player_stats(event_id)
        elif sport == 'ncaaf':
            # NCAA Football uses same format as NFL
            raw_data = sports_fetcher._fetch_game_summary('ncaaf', event_id)
        elif sport == 'mlb':
            raw_data = sports_fetcher.fetch_mlb_game_player_stats(event_id)
        elif sport in soccer_leagues:
            raw_data = sports_fetcher.fetch_soccer_game_stats(sport, event_id)
        else:
            raise HTTPException(status_code=400, detail=f"Box score not supported for {sport}")

        # Determine sport type for frontend rendering
        # Map NCAA sports to their pro counterpart format for consistent rendering
        if sport in soccer_leagues:
            sport_type = 'soccer'
        elif sport == 'ncaab':
            sport_type = 'ncaab'  # Frontend will render like NBA
        elif sport == 'ncaaf':
            sport_type = 'ncaaf'  # Frontend will render like NFL
        else:
            sport_type = sport

        # Transform raw ESPN data into frontend-friendly format
        result = {
            "game_state": raw_data.get("_game_state", "unknown"),
            "game_status": raw_data.get("_game_status_detail", ""),
            "linescores": raw_data.get("_linescores", {}),
            "teams": [],
            "sport": sport_type  # Normalized sport type for frontend
        }

        # Handle soccer separately (uses rosters instead of boxscore.players)
        if sport_type == 'soccer':
            rosters = raw_data.get("rosters", [])
            for roster in rosters:
                team_info = roster.get("team", {})
                team_data = {
                    "team_id": team_info.get("id", ""),
                    "team_name": team_info.get("displayName", "Unknown"),
                    "team_abbrev": team_info.get("abbreviation", ""),
                    "logo": team_info.get("logo", ""),
                    "formation": roster.get("formation", ""),
                    "players": [],
                    "categories": []
                }

                players = roster.get("roster", [])
                for player in players:
                    athlete = player.get("athlete", {})
                    position = player.get("position", {})
                    stats_list = player.get("stats", [])

                    # Convert stats array to dict with abbreviation as key
                    stats_dict = {}
                    for stat in stats_list:
                        abbrev = stat.get("abbreviation", stat.get("shortDisplayName", ""))
                        value = stat.get("displayValue", stat.get("value", "0"))
                        if abbrev:
                            stats_dict[abbrev] = value

                    player_data = {
                        "id": athlete.get("id", ""),
                        "name": athlete.get("displayName", "Unknown"),
                        "position": position.get("abbreviation", "") if isinstance(position, dict) else "",
                        "jersey": player.get("jersey", ""),
                        "starter": player.get("starter", False),
                        "stats": stats_dict
                    }
                    team_data["players"].append(player_data)

                result["teams"].append(team_data)
            return result

        # Handle MLB (has batting and pitching categories)
        if sport_type == 'mlb':
            box = raw_data.get("boxscore", {})
            players_by_team = box.get("players", [])

            for team_block in players_by_team:
                team_info = team_block.get("team", {})
                team_data = {
                    "team_id": team_info.get("id", ""),
                    "team_name": team_info.get("displayName", "Unknown"),
                    "team_abbrev": team_info.get("abbreviation", ""),
                    "logo": team_info.get("logo", ""),
                    "players": [],
                    "categories": []
                }

                for cat in team_block.get("statistics", []):
                    col_labels = cat.get("labels", [])
                    col_keys = cat.get("keys", [])

                    # Determine category type from keys
                    is_batting = "atBats" in col_keys or "plateAppearances" in col_keys or "AB" in col_labels
                    is_pitching = "inningsPitched" in col_keys or "fullInnings.partInnings" in col_keys or "IP" in col_labels

                    cat_name = "batting" if is_batting else ("pitching" if is_pitching else "other")

                    category_data = {
                        "name": cat_name,
                        "labels": col_labels,
                        "players": []
                    }

                    for athlete_stat in cat.get("athletes", []):
                        athlete = athlete_stat.get("athlete", {})
                        stats_values = athlete_stat.get("stats", [])

                        player_data = {
                            "id": athlete.get("id", ""),
                            "name": athlete.get("displayName", "Unknown"),
                            "position": athlete.get("position", {}).get("abbreviation", "") if isinstance(athlete.get("position"), dict) else "",
                            "jersey": athlete.get("jersey", ""),
                            "starter": athlete_stat.get("starter", False),
                            "stats": stats_values
                        }
                        category_data["players"].append(player_data)

                    if category_data["players"]:
                        team_data["categories"].append(category_data)

                result["teams"].append(team_data)
            return result

        # Handle NFL and NBA
        box = raw_data.get("boxscore", {})
        players_by_team = box.get("players", [])

        for team_block in players_by_team:
            team_info = team_block.get("team", {})
            team_data = {
                "team_id": team_info.get("id", ""),
                "team_name": team_info.get("displayName", "Unknown"),
                "team_abbrev": team_info.get("abbreviation", ""),
                "logo": team_info.get("logo", ""),
                "players": [],
                "categories": []
            }

            for cat in team_block.get("statistics", []):
                cat_name = cat.get("name", "")
                col_names = cat.get("names", [])
                col_labels = cat.get("labels", [])

                # For NFL, track categories with their players
                if sport_type == 'nfl' and cat_name:
                    category_data = {
                        "name": cat_name,
                        "labels": col_labels if col_labels else col_names,
                        "players": []
                    }

                    for athlete_stat in cat.get("athletes", []):
                        athlete = athlete_stat.get("athlete", {})
                        stats_values = athlete_stat.get("stats", [])

                        player_data = {
                            "id": athlete.get("id", ""),
                            "name": athlete.get("displayName", "Unknown"),
                            "position": athlete.get("position", {}).get("abbreviation", "") if isinstance(athlete.get("position"), dict) else "",
                            "jersey": athlete.get("jersey", ""),
                            "starter": athlete_stat.get("starter", False),
                            "stats": stats_values
                        }
                        category_data["players"].append(player_data)

                    if category_data["players"]:
                        team_data["categories"].append(category_data)
                else:
                    # NBA format - single flat list of players with stats as dict
                    for athlete_stat in cat.get("athletes", []):
                        athlete = athlete_stat.get("athlete", {})
                        stats_values = athlete_stat.get("stats", [])

                        player_data = {
                            "id": athlete.get("id", ""),
                            "name": athlete.get("displayName", "Unknown"),
                            "position": athlete.get("position", {}).get("abbreviation", "") if isinstance(athlete.get("position"), dict) else "",
                            "jersey": athlete.get("jersey", ""),
                            "starter": athlete_stat.get("starter", False),
                            "stats": {}
                        }

                        for i, col in enumerate(col_names):
                            if i < len(stats_values):
                                player_data["stats"][col] = stats_values[i]

                        team_data["players"].append(player_data)

            result["teams"].append(team_data)

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pinned-games-live")
def get_pinned_games_live(games: List[Dict] = Body(...)):
    """
    Get live data including play-by-play for multiple pinned games.
    Accepts a list of {event_id, sport} objects and returns enriched data.
    """
    try:
        results = []

        for game in games:
            event_id = game.get("event_id")
            sport = game.get("sport", "").lower()

            if not event_id or not sport:
                continue

            result = {
                "event_id": event_id,
                "sport": sport,
                "last_play": None,
                "last_play_team_id": None,
                "home_team_id": None,
                "away_team_id": None,
                "game_state": "unknown",
                "game_status": "",
                "home_score": None,
                "away_score": None,
                "home_team": None,
                "away_team": None,
                "home_logo": None,
                "away_logo": None,
                "display_clock": None,
                "period": None,
                "home_win_pct": None,
            }

            try:
                # Sports that support play-by-play via game summary
                supported_sports = ['nba', 'nfl', 'ncaab', 'ncaaf']

                if sport in supported_sports:
                    # Fetch game summary which includes last_play
                    summary = sports_fetcher._fetch_game_summary(sport, event_id)

                    result["game_state"] = summary.get("_game_state", "unknown")
                    result["game_status"] = summary.get("_game_status_detail", "")
                    result["last_play"] = summary.get("_last_play")
                    result["last_play_team_id"] = summary.get("_last_play_team_id")

                    # Extract live situation data
                    live_situation = summary.get("_live_situation", {})
                    if live_situation:
                        result["display_clock"] = live_situation.get("display_clock")
                        result["period"] = live_situation.get("period")
                        result["home_score"] = live_situation.get("home_score")
                        result["away_score"] = live_situation.get("away_score")
                        result["home_team"] = live_situation.get("home_abbrev")
                        result["away_team"] = live_situation.get("away_abbrev")
                        result["home_logo"] = live_situation.get("home_logo")
                        result["away_logo"] = live_situation.get("away_logo")
                        result["home_win_pct"] = live_situation.get("home_win_pct")
                        result["home_team_id"] = live_situation.get("home_team_id")
                        result["away_team_id"] = live_situation.get("away_team_id")
                else:
                    # For other sports, just get basic scores
                    scores = sports_fetcher.fetch_scores(sport, 50, date=None)
                    matching_score = None
                    for s in scores:
                        if s.get("event_id") == event_id or s.get("competition_id") == event_id:
                            matching_score = s
                            break

                    if matching_score:
                        result["game_state"] = matching_score.get("state", "unknown")
                        result["game_status"] = matching_score.get("status", "")
                        result["home_score"] = matching_score.get("home_score")
                        result["away_score"] = matching_score.get("away_score")
                        result["home_team"] = matching_score.get("home_team")
                        result["away_team"] = matching_score.get("away_team")
                        result["home_logo"] = matching_score.get("home_logo")
                        result["away_logo"] = matching_score.get("away_logo")
                        result["display_clock"] = matching_score.get("display_clock")
                        result["period"] = matching_score.get("period")

            except Exception as e:
                print(f"Error fetching live data for {sport}/{event_id}: {e}")

            results.append(result)

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validate-player")
def validate_player(sport: str, event_id: str, player_name: str):
    """
    Validate and find a player in a specific game.
    Returns the full player name and team if found.
    """
    try:
        result = sports_fetcher.find_player(sport, event_id, player_name)
        if result:
            return {
                "found": True,
                "displayName": result["display_name"],
                "teamName": result["team_name"]
            }
        else:
            return {
                "found": False,
                "message": f"Player '{player_name}' not found in this game"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search-players")
def search_players(sport: str, event_id: str, query: str, limit: int = Query(10, ge=1, le=50)):
    """
    Search for players in a game matching a query.
    Returns a list of matching players with their display names and team names.
    """
    try:
        results = sports_fetcher.search_players(sport, event_id, query, limit)
        return [
            {
                "displayName": player["display_name"],
                "teamName": player["team_name"]
            }
            for player in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
