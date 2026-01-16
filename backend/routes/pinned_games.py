from fastapi import APIRouter, HTTPException, Body, Depends
from briefing.supabase_service import supabase_service
from .auth import get_current_user
from .models import PinGameRequest

router = APIRouter(prefix="/api/pinned-games", tags=["pinned-games"])


@router.get("")
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


@router.post("")
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


@router.delete("/{event_id}")
def unpin_game(event_id: str, user_id: str = Depends(get_current_user)):
    """Unpin a game for the current user"""
    try:
        success = supabase_service.unpin_game(user_id, event_id)
        return {"success": success}
    except Exception as e:
        print(f"Error unpinning game: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/check/{event_id}")
def check_game_pinned(event_id: str, user_id: str = Depends(get_current_user)):
    """Check if a game is pinned by the current user"""
    try:
        is_pinned = supabase_service.is_game_pinned(user_id, event_id)
        return {"is_pinned": is_pinned}
    except Exception as e:
        print(f"Error checking pinned game: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{event_id}/end-time")
def update_game_end_time(event_id: str, end_time: str = Body(..., embed=True), user_id: str = Depends(get_current_user)):
    """Update the end time for a pinned game (for auto-cleanup)"""
    try:
        supabase_service.update_game_end_time(event_id, end_time)
        return {"success": True}
    except Exception as e:
        print(f"Error updating game end time: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
