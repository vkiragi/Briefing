from fastapi import FastAPI, HTTPException, Query, Body, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict
from pydantic import BaseModel
import json
import os
from briefing.news_fetcher import NewsFetcher
from briefing.sports_fetcher import SportsFetcher
from briefing.config import Config
from briefing.supabase_service import supabase_service

app = FastAPI(title="Briefing API")

# Enable CORS
# Get additional origins from environment variable
extra_origins = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://briefing-sports-tracking.netlify.app",
] + [o.strip() for o in extra_origins if o.strip()]

print(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

config = Config()
news_fetcher = NewsFetcher()
sports_fetcher = SportsFetcher()


async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """Extract user ID from Supabase JWT token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    token = authorization.replace("Bearer ", "")

    try:
        # Verify token with Supabase
        user = supabase_service.client.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

class CombinedPlayer(BaseModel):
    player_name: str
    team_name: Optional[str] = None
    event_id: Optional[str] = None
    current_value: Optional[float] = None
    game_state: Optional[str] = None

class BetLeg(BaseModel):
    sport: str
    matchup: str
    selection: str
    odds: float
    # Tracking fields
    event_id: Optional[str] = None
    player_name: Optional[str] = None
    team_name: Optional[str] = None
    market_type: Optional[str] = None
    line: Optional[float] = None
    side: Optional[str] = None
    # Combined prop fields
    is_combined: Optional[bool] = None
    combined_players: Optional[List[CombinedPlayer]] = None
    # Live tracking data (populated by refresh)
    current_value: Optional[float] = None
    current_value_str: Optional[str] = None
    game_state: Optional[str] = None
    game_status_text: Optional[str] = None
    prop_status: Optional[str] = None

class Bet(BaseModel):
    id: str
    sport: str
    type: str
    matchup: str
    selection: str
    odds: float
    stake: float
    status: str
    date: str
    book: Optional[str] = None
    potentialPayout: float
    legs: Optional[List[BetLeg]] = None
    # Prop tracking fields
    event_id: Optional[str] = None
    player_name: Optional[str] = None
    team_name: Optional[str] = None
    market_type: Optional[str] = None
    line: Optional[float] = None
    side: Optional[str] = None
    # Combined prop fields
    is_combined: Optional[bool] = None
    combined_players: Optional[List[CombinedPlayer]] = None
    # Live tracking data
    current_value: Optional[float] = None
    current_value_str: Optional[str] = None
    game_state: Optional[str] = None
    game_status_text: Optional[str] = None
    prop_status: Optional[str] = None

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Briefing API is running"}

@app.get("/api/news")
def get_news(sources: Optional[List[str]] = Query(None)):
    try:
        if not sources:
            sources = config.get('news.default_sources', ['bbc', 'cnn'])
        return news_fetcher.fetch_multiple_feeds(sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/news/sources")
def get_news_sources():
    return news_fetcher.list_default_sources()

@app.get("/api/sports/scores")
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

@app.get("/api/sports/schedule")
def get_schedule(
    sport: str,
    limit: int = 10,
    date: Optional[str] = Query(None, description="Date in YYYYMMDD format")
):
    try:
        return sports_fetcher.fetch_schedule(sport, limit, date=date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sports/standings")
def get_standings(sport: str):
    try:
        sport = sport.lower()
        if sport == 'nba':
            return sports_fetcher.fetch_nba_standings()
        elif sport == 'mlb':
            return sports_fetcher.fetch_mlb_standings()
        elif sport == 'f1':
            return sports_fetcher.fetch_f1_standings()
        elif sport in ['soccer', 'epl', 'laliga', 'ucl', 'europa']:
            return sports_fetcher.fetch_soccer_standings(league=sport)
        else:
             raise HTTPException(status_code=400, detail=f"Standings not supported for {sport}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sports/f1/races")
def get_f1_races():
    try:
        return sports_fetcher.fetch_f1_races()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sports/f1/race/{round_number}")
def get_f1_race_results(round_number: int):
    """
    Get detailed results for a specific F1 race by round number.
    Returns full finishing order with times, positions, and team info.
    """
    try:
        return sports_fetcher.fetch_f1_race_results(round_number)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sports/boxing/fights")
def get_boxing_fights(limit: int = Query(10, ge=1, le=20)):
    """
    Get upcoming and recent boxing fights.
    Returns fight cards with fighters, date, venue, and results if completed.
    """
    try:
        return sports_fetcher.fetch_boxing_fights(limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sports/nfl/week")
def get_nfl_week(date: Optional[str] = Query(None, description="Date in YYYYMMDD format")):
    """
    Get NFL week information for a given date.
    Returns week number and date range for that week.
    """
    try:
        return sports_fetcher.get_nfl_week_info(date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sports/list")
def list_sports():
    return sports_fetcher.list_available_sports()

@app.get("/api/sports/news")
def get_sports_news(sport: str, limit: int = 10):
    try:
        return sports_fetcher.fetch_news(sport, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sports/boxscore")
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

@app.post("/api/sports/pinned-games-live")
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

@app.get("/api/bets")
def get_bets(user_id: str = Depends(get_current_user)):
    """Get all bets and stats for the authenticated user"""
    bets = supabase_service.get_bets(user_id)
    stats = supabase_service.get_user_stats(user_id)
    return {"bets": bets, "stats": stats}

@app.get("/api/bets/stats")
def get_bet_stats(user_id: str = Depends(get_current_user)):
    """Get betting statistics for the authenticated user"""
    return supabase_service.get_user_stats(user_id)

@app.post("/api/bets")
def create_bet(bet: Bet, user_id: str = Depends(get_current_user)):
    """Create a new bet for the authenticated user"""
    try:
        print(f"Creating bet for user {user_id}: {bet.dict()}")
        result = supabase_service.create_bet(user_id, bet.dict())
        print(f"Bet created successfully: {result}")
        return result
    except Exception as e:
        print(f"Error creating bet: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/bets/{bet_id}")
def update_bet(bet_id: str, updates: dict = Body(...), user_id: str = Depends(get_current_user)):
    """Update a bet by ID"""
    result = supabase_service.update_bet(bet_id, user_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Bet not found")
    return result

@app.delete("/api/bets/{bet_id}")
def delete_bet(bet_id: str, user_id: str = Depends(get_current_user)):
    """Delete a bet by ID"""
    success = supabase_service.delete_bet(bet_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bet not found")
    return {"success": True, "message": "Bet deleted successfully"}

@app.get("/api/sports/validate-player")
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

@app.get("/api/sports/search-players")
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

@app.post("/api/bets/refresh-props")
def refresh_props(bet_ids: List[str] = Body(...), user_id: str = Depends(get_current_user)):
    """
    Refresh live stats for player props and return updated bet data.
    """
    try:
        from briefing.props_dashboard import PropsDashboard

        # Get user's bets from Supabase
        all_bets = supabase_service.get_bets(user_id)
        updated_bets = []

        # Filter for the requested bet IDs that support live tracking
        target_bets = [b for b in all_bets if b.get('id') in bet_ids and b.get('type') in ['Prop', '1st Half', '1st Quarter', 'Team Total', 'Moneyline', 'Spread', 'Total']]

        if not target_bets:
            return {"bets": []}

        # Group by sport, separating combined props from regular props
        by_sport = {}
        combined_bets = []  # Combined props need special handling

        for bet in target_bets:
            sport = bet.get('sport', 'nfl').lower()

            # Check if this is a combined prop bet
            if bet.get('is_combined') and bet.get('combined_players'):
                combined_bets.append((sport, bet))
            else:
                if sport not in by_sport:
                    by_sport[sport] = []
                by_sport[sport].append(bet)

        # Refresh regular props for each sport
        for sport, sport_bets in by_sport.items():
            dashboard = PropsDashboard(sport=sport)

            # Convert bets to props
            for bet in sport_bets:
                event_id = bet.get('event_id')

                # Skip if no valid event_id
                if not event_id:
                    continue

                # Add prop to dashboard
                dashboard.add_prop(
                    game_id=str(event_id),
                    game_label=bet.get('matchup', ''),
                    player_name=bet.get('player_name', ''),
                    team_name=bet.get('team_name', ''),
                    market_type=bet.get('market_type', ''),
                    line=float(bet.get('line', 0)),
                    side=bet.get('side', 'over'),
                    stake=bet.get('stake', 0),
                    odds=bet.get('odds')
                )

            # Refresh all props with live data
            try:
                dashboard.refresh_props(sports_fetcher)
            except Exception as e:
                print(f"Error refreshing props for {sport}: {str(e)}")
                import traceback
                traceback.print_exc()
                continue

            # Map refreshed data back to bets
            for i, prop in enumerate(dashboard.props):
                if i < len(sport_bets):
                    bet_data = {
                        'id': sport_bets[i]['id'],
                        'current_value': prop.current_value,
                        'current_value_str': prop.current_value_str,
                        'game_state': prop.game_state,
                        'game_status_text': prop.game_status_text,
                        'prop_status': prop.prop_status,
                        'last_play': prop.last_play,  # Last play description for live games
                        'live_situation': prop.live_situation,  # Rich live game data
                    }
                    updated_bets.append(bet_data)

        # Refresh combined prop bets
        for sport, bet in combined_bets:
            try:
                # Convert bet to leg format for the helper function
                leg_data = {
                    'event_id': bet.get('event_id'),
                    'combined_players': bet.get('combined_players'),
                    'market_type': bet.get('market_type', 'anytime_touchdowns'),
                    'line': bet.get('line', 0),
                    'side': bet.get('side', 'over'),
                }
                updated_leg = _refresh_combined_prop(leg_data, sport, sports_fetcher)

                bet_data = {
                    'id': bet['id'],
                    'current_value': updated_leg.get('current_value'),
                    'current_value_str': updated_leg.get('current_value_str'),
                    'game_state': updated_leg.get('game_state'),
                    'game_status_text': updated_leg.get('game_status_text'),
                    'prop_status': updated_leg.get('prop_status'),
                    'last_play': updated_leg.get('last_play'),
                    'live_situation': updated_leg.get('live_situation'),
                    'combined_players': updated_leg.get('combined_players'),
                }
                updated_bets.append(bet_data)
            except Exception as e:
                print(f"Error refreshing combined prop bet {bet.get('id')}: {str(e)}")
                import traceback
                traceback.print_exc()

        return {"bets": updated_bets}

    except Exception as e:
        import traceback
        print(f"Error refreshing props: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

def _refresh_combined_prop(leg: dict, sport: str, sports_fetcher) -> dict:
    """
    Refresh a combined prop bet (e.g., "Smith + Barkley + Brown Over 4 TDs Combined").

    Fetches touchdown stats for each player in combined_players and returns
    updated leg with per-player progress and combined total.
    """
    event_id = leg.get('event_id')
    combined_players = leg.get('combined_players', [])
    market_type = leg.get('market_type', 'anytime_touchdowns')
    line = float(leg.get('line', 0) or 0)
    side = leg.get('side', 'over').lower()

    print(f"[CombinedProp] Refreshing combined prop: event_id={event_id}, players={[p.get('player_name') for p in combined_players]}, market={market_type}")

    # Fetch game stats once
    try:
        if sport == 'nfl':
            stats_payload = sports_fetcher.fetch_nfl_game_player_stats(event_id)
        elif sport == 'nba':
            stats_payload = sports_fetcher.fetch_nba_game_player_stats(event_id)
        else:
            stats_payload = sports_fetcher.fetch_nfl_game_player_stats(event_id)
    except Exception as e:
        print(f"[CombinedProp] Error fetching stats: {e}")
        return leg

    # Extract game state and live situation
    game_state = stats_payload.get("_game_state", "unknown")
    game_status_detail = stats_payload.get("_game_status_detail", "")
    last_play_text = stats_payload.get("_last_play", None)
    live_situation = stats_payload.get("_live_situation", None)

    # Get stats for each player
    total_value = 0.0
    updated_combined_players = []

    for player in combined_players:
        player_name = player.get('player_name', '')
        if not player_name:
            continue

        # Fetch player's stat (touchdowns for NFL)
        player_value = 0.0
        player_game_state = game_state

        try:
            if sport == 'nfl':
                result = sports_fetcher.get_nfl_player_stat(
                    event_id=event_id,
                    player_name=player_name,
                    market_type=market_type,
                    stats_payload=stats_payload,
                )
            elif sport == 'nba':
                result = sports_fetcher.get_nba_player_stat(
                    event_id=event_id,
                    player_name=player_name,
                    market_type=market_type,
                    stats_payload=stats_payload,
                )
            else:
                result = None

            if result and isinstance(result, dict):
                player_value = result.get('value', 0.0) or 0.0
                # Update player name if we got a canonical one
                if result.get('player'):
                    player_name = result.get('player')
        except Exception as e:
            print(f"[CombinedProp] Error getting stat for {player_name}: {e}")

        total_value += player_value

        updated_combined_players.append({
            'player_name': player_name,
            'team_name': player.get('team_name', ''),
            'event_id': event_id,
            'current_value': player_value,
            'game_state': player_game_state,
        })

        print(f"[CombinedProp] Player {player_name}: {player_value} TDs")

    # Determine prop status
    is_hit = total_value > line if side == 'over' else total_value < line

    if game_state in ('post', 'final'):
        prop_status = 'won' if is_hit else 'lost'
    elif game_state == 'in':
        prop_status = 'live_hit' if is_hit else 'live_miss'
    else:
        prop_status = 'pending'

    # Build display string showing per-player breakdown
    player_parts = []
    for p in updated_combined_players:
        td_count = int(p.get('current_value', 0))
        player_parts.append(f"{p['player_name'].split()[-1]}: {td_count}")

    current_value_str = f"{int(total_value)} TDs ({', '.join(player_parts)})"

    print(f"[CombinedProp] Total: {total_value}, status: {prop_status}, display: {current_value_str}")

    return {
        **leg,
        'current_value': total_value,
        'current_value_str': current_value_str,
        'game_state': game_state,
        'game_status_text': game_status_detail,
        'prop_status': prop_status,
        'last_play': last_play_text,
        'live_situation': live_situation,
        'combined_players': updated_combined_players,
    }


@app.post("/api/bets/refresh-parlay-legs")
def refresh_parlay_legs(bet_ids: List[str] = Body(...), user_id: str = Depends(get_current_user)):
    """
    Refresh live stats for parlay legs and return updated leg data.
    Each parlay's legs are refreshed individually.
    """
    try:
        from briefing.props_dashboard import PropsDashboard

        print(f"[RefreshParlayLegs] Requested bet IDs: {bet_ids}")

        # Get user's bets from Supabase
        all_bets = supabase_service.get_bets(user_id)
        updated_parlays = []

        # Filter for parlays with the requested bet IDs
        parlay_bets = [b for b in all_bets if b.get('id') in bet_ids and b.get('type') == 'Parlay']
        print(f"[RefreshParlayLegs] Found {len(parlay_bets)} matching parlays")

        if not parlay_bets:
            print("[RefreshParlayLegs] No parlays found, returning empty")
            return {"parlays": []}

        for parlay in parlay_bets:
            legs = parlay.get('legs', [])
            print(f"[RefreshParlayLegs] Parlay {parlay.get('id')} has {len(legs)} legs")
            if not legs:
                continue

            # Debug: print leg details
            for i, leg in enumerate(legs):
                print(f"[RefreshParlayLegs] Leg {i}: event_id={leg.get('event_id')}, player={leg.get('player_name')}, market={leg.get('market_type')}, line={leg.get('line')}")

            updated_legs = []

            # Group legs by sport for efficient fetching
            legs_by_sport = {}
            for idx, leg in enumerate(legs):
                sport = leg.get('sport', 'nba').lower()
                if sport not in legs_by_sport:
                    legs_by_sport[sport] = []
                legs_by_sport[sport].append((idx, leg))

            # Process each sport group
            for sport, sport_legs in legs_by_sport.items():
                dashboard = PropsDashboard(sport=sport)

                # Separate combined props from regular props
                combined_legs = []
                regular_legs = []

                for idx, leg in sport_legs:
                    event_id = leg.get('event_id')
                    if not event_id:
                        # No event_id, skip but preserve original leg
                        updated_legs.append((idx, leg))
                        continue

                    if leg.get('is_combined') and leg.get('combined_players'):
                        combined_legs.append((idx, leg))
                    else:
                        regular_legs.append((idx, leg))
                        dashboard.add_prop(
                            game_id=str(event_id),
                            game_label=leg.get('matchup', ''),
                            player_name=leg.get('player_name', ''),
                            team_name=leg.get('team_name', ''),
                            market_type=leg.get('market_type', ''),
                            line=float(leg.get('line', 0) or 0),
                            side=leg.get('side', 'over'),
                            stake=0,
                            odds=0
                        )

                # Refresh regular props
                try:
                    if dashboard.props:
                        print(f"[RefreshParlayLegs] Refreshing {len(dashboard.props)} regular props for {sport}")
                        dashboard.refresh_props(sports_fetcher)
                        print(f"[RefreshParlayLegs] Refresh complete for {sport}")
                except Exception as e:
                    print(f"Error refreshing parlay legs for {sport}: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    for idx, leg in regular_legs:
                        updated_legs.append((idx, leg))
                    regular_legs = []

                # Map refreshed data back to regular legs
                prop_idx = 0
                for idx, leg in regular_legs:
                    if prop_idx < len(dashboard.props):
                        prop = dashboard.props[prop_idx]
                        print(f"[RefreshParlayLegs] Prop {prop_idx}: game_state={prop.game_state}, current_value={prop.current_value}, prop_status={prop.prop_status}")
                        updated_leg = {
                            **leg,
                            'current_value': prop.current_value,
                            'current_value_str': prop.current_value_str,
                            'game_state': prop.game_state,
                            'game_status_text': prop.game_status_text,
                            'prop_status': prop.prop_status,
                            'last_play': prop.last_play,
                            'live_situation': prop.live_situation,
                        }
                        updated_legs.append((idx, updated_leg))
                        prop_idx += 1

                # Process combined props separately
                for idx, leg in combined_legs:
                    try:
                        updated_leg = _refresh_combined_prop(leg, sport, sports_fetcher)
                        updated_legs.append((idx, updated_leg))
                    except Exception as e:
                        print(f"Error refreshing combined prop: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        updated_legs.append((idx, leg))

            # Sort legs by original index and extract
            updated_legs.sort(key=lambda x: x[0])
            final_legs = [leg for _, leg in updated_legs]

            # Fill in any missing legs (that weren't updated)
            if len(final_legs) < len(legs):
                final_legs_dict = {i: leg for i, leg in updated_legs}
                final_legs = []
                for i, original_leg in enumerate(legs):
                    if i in final_legs_dict:
                        final_legs.append(final_legs_dict[i])
                    else:
                        final_legs.append(original_leg)

            updated_parlays.append({
                'id': parlay['id'],
                'legs': final_legs
            })

        print(f"[RefreshParlayLegs] Returning {len(updated_parlays)} updated parlays")
        return {"parlays": updated_parlays}

    except Exception as e:
        import traceback
        print(f"Error refreshing parlay legs: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Pinned Games Endpoints ====================

class PinGameRequest(BaseModel):
    event_id: str
    sport: str
    matchup: Optional[str] = None
    home_team: Optional[str] = None
    away_team: Optional[str] = None


@app.get("/api/pinned-games")
def get_pinned_games(user_id: str = Depends(get_current_user)):
    """Get all pinned games for the current user"""
    try:
        # First cleanup any expired pinned games
        cleaned = supabase_service.cleanup_ended_games(user_id)
        if cleaned > 0:
            print(f"[PinnedGames] Auto-cleaned {cleaned} expired games for user {user_id}")

        games = supabase_service.get_pinned_games(user_id)
        return {"pinned_games": games}
    except Exception as e:
        print(f"Error getting pinned games: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/pinned-games")
def pin_game(request: PinGameRequest, user_id: str = Depends(get_current_user)):
    """Pin a game for the current user"""
    try:
        game_data = {
            'event_id': request.event_id,
            'sport': request.sport,
            'matchup': request.matchup,
            'home_team': request.home_team,
            'away_team': request.away_team,
        }
        result = supabase_service.pin_game(user_id, game_data)
        return {"success": True, "pinned_game": result}
    except Exception as e:
        print(f"Error pinning game: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/pinned-games/{event_id}")
def unpin_game(event_id: str, user_id: str = Depends(get_current_user)):
    """Unpin a game for the current user"""
    try:
        success = supabase_service.unpin_game(user_id, event_id)
        return {"success": success}
    except Exception as e:
        print(f"Error unpinning game: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/pinned-games/check/{event_id}")
def check_game_pinned(event_id: str, user_id: str = Depends(get_current_user)):
    """Check if a game is pinned by the current user"""
    try:
        is_pinned = supabase_service.is_game_pinned(user_id, event_id)
        return {"is_pinned": is_pinned}
    except Exception as e:
        print(f"Error checking pinned game: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/pinned-games/{event_id}/end-time")
def update_game_end_time(event_id: str, end_time: str = Body(..., embed=True), user_id: str = Depends(get_current_user)):
    """Update the end time for a pinned game (for auto-cleanup)"""
    try:
        supabase_service.update_game_end_time(event_id, end_time)
        return {"success": True}
    except Exception as e:
        print(f"Error updating game end time: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Favorite Teams Endpoints ====================

@app.get("/api/teams/search")
def search_teams(query: str = Query(..., min_length=2), limit: int = Query(10, ge=1, le=50)):
    """
    Search for teams across all supported sports.
    Returns matching teams with their ID, name, abbreviation, logo, and sport.
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
        ]

        for sport_key, sport_display in team_sports:
            try:
                sport_path = sports_fetcher.SPORTS.get(sport_key)
                if not sport_path:
                    continue

                # Fetch teams from ESPN teams endpoint
                url = f"{sports_fetcher.BASE_URL}/{sport_path}/teams?limit=100"
                response = sports_fetcher.session.get(url, timeout=5)

                if response.status_code != 200:
                    continue

                data = response.json()
                teams = data.get('sports', [{}])[0].get('leagues', [{}])[0].get('teams', [])

                for team_entry in teams:
                    team = team_entry.get('team', {})
                    name = team.get('displayName', '')
                    abbreviation = team.get('abbreviation', '')
                    nickname = team.get('nickname', '')

                    # Check if query matches team name, abbreviation, or nickname
                    if (query_lower in name.lower() or
                        query_lower in abbreviation.lower() or
                        query_lower in nickname.lower()):

                        # Get logo URL
                        logos = team.get('logos', [])
                        logo_url = logos[0].get('href', '') if logos else ''

                        results.append({
                            'id': team.get('id', ''),
                            'name': name,
                            'abbreviation': abbreviation,
                            'logo': logo_url,
                            'sport': sport_key,
                            'sportDisplay': sport_display,
                        })

                        if len(results) >= limit:
                            break

            except Exception as e:
                print(f"Error searching teams for {sport_key}: {e}")
                continue

            if len(results) >= limit:
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


@app.get("/api/teams/by-sport/{sport}")
def get_teams_by_sport(sport: str):
    """
    Get all teams for a specific sport/league.
    Returns teams sorted alphabetically by name.
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

        # Fetch teams from ESPN teams endpoint
        url = f"{sports_fetcher.BASE_URL}/{sport_path}/teams?limit=100"
        response = sports_fetcher.session.get(url, timeout=10)

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch teams")

        data = response.json()
        teams = data.get('sports', [{}])[0].get('leagues', [{}])[0].get('teams', [])

        results = []
        for team_entry in teams:
            team = team_entry.get('team', {})
            name = team.get('displayName', '')

            # Get logo URL
            logos = team.get('logos', [])
            logo_url = logos[0].get('href', '') if logos else ''

            results.append({
                'id': team.get('id', ''),
                'name': name,
                'abbreviation': team.get('abbreviation', ''),
                'logo': logo_url,
                'sport': sport_lower,
                'sportDisplay': sport_display,
            })

        # Sort alphabetically by name
        results.sort(key=lambda x: x['name'].lower())
        return results

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting teams for sport {sport}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class FavoriteTeam(BaseModel):
    id: str
    name: str
    sport: str


@app.post("/api/teams/favorites/results")
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

                # Fetch team schedule (includes past and future games)
                url = f"{sports_fetcher.BASE_URL}/{sport_path}/teams/{team.id}/schedule"
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
                from datetime import datetime, timezone
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

class FavoriteTeamRequest(BaseModel):
    id: str
    name: str
    abbreviation: Optional[str] = ""
    logo: Optional[str] = ""
    sport: str
    sportDisplay: Optional[str] = ""


@app.get("/api/favorite-teams")
def get_favorite_teams(user_id: str = Depends(get_current_user)):
    """Get user's favorite teams from the database"""
    try:
        teams = supabase_service.get_favorite_teams(user_id)
        return teams
    except Exception as e:
        print(f"Error getting favorite teams: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/favorite-teams")
def add_favorite_team(team: FavoriteTeamRequest, user_id: str = Depends(get_current_user)):
    """Add a team to user's favorites"""
    try:
        result = supabase_service.add_favorite_team(user_id, team.model_dump())
        return result
    except Exception as e:
        print(f"Error adding favorite team: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/favorite-teams/{team_id}/{sport}")
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


@app.post("/api/favorite-teams/sync")
def sync_favorite_teams(teams: List[FavoriteTeamRequest], user_id: str = Depends(get_current_user)):
    """Sync all favorite teams - replaces current favorites with provided list"""
    try:
        teams_data = [t.model_dump() for t in teams]
        result = supabase_service.sync_favorite_teams(user_id, teams_data)
        return result
    except Exception as e:
        print(f"Error syncing favorite teams: {e}")
        raise HTTPException(status_code=500, detail=str(e))
