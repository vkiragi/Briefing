from typing import List
from fastapi import APIRouter, HTTPException, Body, Depends
from briefing.supabase_service import supabase_service
from briefing.sports_fetcher import SportsFetcher
from .auth import get_current_user
from .models import Bet

router = APIRouter(prefix="/api/bets", tags=["bets"])

sports_fetcher = SportsFetcher()


@router.get("")
def get_bets(user_id: str = Depends(get_current_user)):
    """Get all bets and stats for the authenticated user"""
    bets = supabase_service.get_bets(user_id)
    stats = supabase_service.get_user_stats(user_id)
    return {"bets": bets, "stats": stats}


@router.get("/stats")
def get_bet_stats(user_id: str = Depends(get_current_user)):
    """Get betting statistics for the authenticated user"""
    return supabase_service.get_user_stats(user_id)


@router.post("")
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


@router.put("/{bet_id}")
def update_bet(bet_id: str, updates: dict = Body(...), user_id: str = Depends(get_current_user)):
    """Update a bet by ID"""
    result = supabase_service.update_bet(bet_id, user_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Bet not found")
    return result


@router.delete("/{bet_id}")
def delete_bet(bet_id: str, user_id: str = Depends(get_current_user)):
    """Delete a bet by ID"""
    success = supabase_service.delete_bet(bet_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bet not found")
    return {"success": True, "message": "Bet deleted successfully"}


def _refresh_combined_prop(leg: dict, sport: str, fetcher: SportsFetcher) -> dict:
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
            stats_payload = fetcher.fetch_nfl_game_player_stats(event_id)
        elif sport == 'nba':
            stats_payload = fetcher.fetch_nba_game_player_stats(event_id)
        else:
            stats_payload = fetcher.fetch_nfl_game_player_stats(event_id)
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
                result = fetcher.get_nfl_player_stat(
                    event_id=event_id,
                    player_name=player_name,
                    market_type=market_type,
                    stats_payload=stats_payload,
                )
            elif sport == 'nba':
                result = fetcher.get_nba_player_stat(
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


@router.post("/refresh-props")
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
                    line=float(bet.get('line') or 0),
                    side=bet.get('side') or 'over',  # Default to 'over' if None
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


@router.post("/refresh-parlay-legs")
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
