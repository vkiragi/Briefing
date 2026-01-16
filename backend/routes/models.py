from typing import List, Optional
from pydantic import BaseModel


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


class PinGameRequest(BaseModel):
    event_id: str
    sport: str
    matchup: Optional[str] = None
    home_team: Optional[str] = None
    away_team: Optional[str] = None


class FavoriteTeam(BaseModel):
    id: str
    name: str
    sport: str


class FavoriteTeamRequest(BaseModel):
    id: str
    name: str
    abbreviation: Optional[str] = ""
    logo: Optional[str] = ""
    sport: str
    sportDisplay: Optional[str] = ""
