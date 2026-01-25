from fastapi import APIRouter, Depends
from routes.auth import get_current_user
from briefing.supabase_service import supabase_service

router = APIRouter(prefix="/api/account", tags=["account"])


@router.delete("")
async def delete_account(user_id: str = Depends(get_current_user)):
    """
    Delete all user data from the database.
    This is required for App Store compliance - users must be able to delete their accounts.

    Deletes: bets, parlay_legs, bankroll_transactions, user_stats, pinned_games,
    favorite_teams, and profile.

    Note: This does NOT delete the Supabase auth user - that requires admin API access.
    The user should sign out after this operation.
    """
    deleted = supabase_service.delete_user_data(user_id)
    return {
        "success": True,
        "message": "Account data deleted successfully",
        "deleted": deleted
    }
