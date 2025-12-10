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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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
def get_scores(sport: str, limit: int = 10, live: bool = False):
    try:
        if live:
            return sports_fetcher.fetch_live(sport, limit)
        return sports_fetcher.fetch_scores(sport, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sports/schedule")
def get_schedule(sport: str, limit: int = 10):
    try:
        return sports_fetcher.fetch_schedule(sport, limit)
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

@app.get("/api/sports/list")
def list_sports():
    return sports_fetcher.list_available_sports()

@app.get("/api/sports/news")
def get_sports_news(sport: str, limit: int = 10):
    try:
        return sports_fetcher.fetch_news(sport, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bets")
def get_bets(user_id: str = Depends(get_current_user)):
    """Get all bets for the authenticated user"""
    return supabase_service.get_bets(user_id)

@app.get("/api/bets/stats")
def get_bet_stats(user_id: str = Depends(get_current_user)):
    """Get betting statistics for the authenticated user"""
    return supabase_service.get_user_stats(user_id)

@app.post("/api/bets")
def create_bet(bet: Bet, user_id: str = Depends(get_current_user)):
    """Create a new bet for the authenticated user"""
    return supabase_service.create_bet(user_id, bet.dict())

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
                    }
                    updated_bets.append(bet_data)

        return {"bets": updated_bets}

    except Exception as e:
        import traceback
        print(f"Error refreshing props: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
