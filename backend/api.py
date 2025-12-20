from fastapi import FastAPI, HTTPException, Query, Body, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
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

        # Group by sport
        by_sport = {}
        for bet in target_bets:
            sport = bet.get('sport', 'nfl').lower()
            if sport not in by_sport:
                by_sport[sport] = []
            by_sport[sport].append(bet)

        # Refresh props for each sport
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

        return {"bets": updated_bets}

    except Exception as e:
        import traceback
        print(f"Error refreshing props: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

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

                # Add each leg as a prop
                for idx, leg in sport_legs:
                    event_id = leg.get('event_id')
                    if not event_id:
                        # No event_id, skip but preserve original leg
                        updated_legs.append((idx, leg))
                        continue

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

                # Refresh all props for this sport
                try:
                    print(f"[RefreshParlayLegs] Refreshing {len(dashboard.props)} props for {sport}")
                    dashboard.refresh_props(sports_fetcher)
                    print(f"[RefreshParlayLegs] Refresh complete for {sport}")
                except Exception as e:
                    print(f"Error refreshing parlay legs for {sport}: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    # Keep original legs on error
                    for idx, leg in sport_legs:
                        updated_legs.append((idx, leg))
                    continue

                # Map refreshed data back to legs
                prop_idx = 0
                for idx, leg in sport_legs:
                    if not leg.get('event_id'):
                        continue

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
                            'last_play': prop.last_play,  # Last play description for live games
                            'live_situation': prop.live_situation,  # Rich live game data
                        }
                        updated_legs.append((idx, updated_leg))
                        prop_idx += 1

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
