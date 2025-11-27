"""
In-memory NFL player props dashboard models and helpers.

This module defines:
  - PlayerProp: a single player prop bet (e.g., McCaffrey over 71.5 rushing yards)
  - PropsDashboard: an in-memory collection of props with refresh logic
  - Small interactive helpers used by the CLI props command
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Dict, Optional
import itertools


_id_counter = itertools.count(1)


@dataclass
class PlayerProp:
    """Represents a single player prop bet for the current session."""

    id: int
    sport: str
    game_id: str
    game_label: str
    player_name: str
    team_name: str
    market_type: str  # e.g. 'rushing_yards', 'receiving_yards', 'passing_yards'
    line: float
    side: str  # 'over' or 'under'
    stake: Optional[float] = None

    # Live / derived fields (kept in memory only)
    current_value: Optional[float] = None
    current_value_str: Optional[str] = None
    game_state: str = "pre"  # pre / in / post / unknown
    game_status_text: str = ""  # Detailed status for display e.g. "5:09 - 2nd"
    prop_status: str = "pending"  # pending/live_above/live_below/won/lost/push/unavailable


class PropsDashboard:
    """In-memory collection of NFL player props for the current CLI session."""

    def __init__(self, sport: str = "nfl"):
        self.sport = sport.lower()
        self.props: List[PlayerProp] = []

    def add_prop(
        self,
        game_id: str,
        game_label: str,
        player_name: str,
        team_name: str,
        market_type: str,
        line: float,
        side: str,
        stake: Optional[float] = None,
    ) -> PlayerProp:
        prop = PlayerProp(
            id=next(_id_counter),
            sport=self.sport,
            game_id=game_id,
            game_label=game_label,
            player_name=player_name,
            team_name=team_name,
            market_type=market_type,
            line=line,
            side=side.lower(),
            stake=stake,
        )
        self.props.append(prop)
        return prop

    def remove_prop_by_id(self, prop_id: int) -> bool:
        """Remove a prop by id. Returns True if removed."""
        for i, p in enumerate(self.props):
            if p.id == prop_id:
                del self.props[i]
                return True
        return False

    def refresh_props(self, sports_fetcher) -> None:
        """
        Refresh all props' current_value, game_state, and prop_status in-place.

        Groups props by game_id, fetches player stats once per game, and then
        updates each prop using the SportsFetcher helpers.
        """
        # Group props by game_id
        by_game: Dict[str, List[PlayerProp]] = {}
        for prop in self.props:
            by_game.setdefault(prop.game_id, []).append(prop)

        for game_id, props in by_game.items():
            try:
                # Dispatch based on dashboard sport type
                if self.sport == "nba":
                    stats = sports_fetcher.fetch_nba_game_player_stats(game_id)
                else:
                    stats = sports_fetcher.fetch_nfl_game_player_stats(game_id)
            except Exception:
                # If we can't fetch stats, mark as unavailable but keep existing values
                for p in props:
                    p.game_state = "unknown"
                    p.prop_status = "unavailable"
                continue

            # Determine game state from stats payload when possible
            game_state = stats.get("_game_state", "unknown")
            game_status_detail = stats.get("_game_status_detail", "")

            for p in props:
                result = None
                if self.sport == "nba":
                    result = sports_fetcher.get_nba_player_stat(
                        event_id=game_id,
                        player_name=p.player_name,
                        market_type=p.market_type,
                        stats_payload=stats,
                    )
                else:
                    result = sports_fetcher.get_nfl_player_stat(
                        event_id=game_id,
                        player_name=p.player_name,
                        market_type=p.market_type,
                        stats_payload=stats,
                    )
                
                # Extract value and update team if available
                value = None
                if result:
                    if isinstance(result, dict):
                        value = result.get('value')
                        found_team = result.get('team')
                        found_player = result.get('player')
                        
                        if found_team and (not p.team_name or p.team_name == '-'):
                            p.team_name = found_team
                        
                        if found_player:
                            p.player_name = found_player
                        
                        # Capture formatted display value if available (e.g. "12 PTS, 10 REB")
                        display_val = result.get('display_value')
                        if display_val:
                            p.current_value_str = display_val

                    elif isinstance(result, (int, float)):
                         # Backward compatibility if return type changes back or for flexibility
                        value = float(result)

                p.current_value = value
                
                # Special handling for NFL: Players often don't appear in specific stat categories 
                # (like receiving) until they record a stat. If the game is live and we have no value,
                # default to 0.0 so it looks active/tracking.
                if p.current_value is None and self.sport == 'nfl' and game_state == 'in':
                    p.current_value = 0.0

                p.game_state = game_state
                p.game_status_text = game_status_detail
                p.prop_status = _compute_prop_status(
                    line=p.line,
                    side=p.side,
                    current_value=value,
                    game_state=game_state,
                )


def _compute_prop_status(
    line: float,
    side: str,
    current_value: Optional[float],
    game_state: str,
) -> str:
    """
    Compute semantic prop status given the current value, line, side, and game state.

    Rules (see plan):
      - While game is pre/in:
          - If we have a value: 'live_above' or 'live_below'
          - If no value: 'pending'
      - Once game is final/post:
          - If no value: 'unavailable'
          - 'won' if over and value >= line, or under and value <= line
          - 'push' if exactly equal to line (optional behavior)
          - otherwise 'lost'
    """
    side = side.lower()
    if current_value is None:
        # No stats yet
        if game_state in ("post", "final"):
            return "unavailable"
        return "pending"

    # Live game
    if game_state in ("pre", "in"):
        # Check if condition is met right now (HIT)
        is_hit = False
        if side == "over":
            is_hit = current_value > line
        else: # under
            is_hit = current_value < line
            
        return "live_hit" if is_hit else "live_miss"

    # Game is over - final result
    if abs(current_value - line) < 1e-6:
        return "push"

    if side == "over":
        return "won" if current_value > line else "lost"
    else:
        return "won" if current_value < line else "lost"


def add_prop_interactively(dashboard: PropsDashboard, sports_fetcher, formatter) -> None:
    """
    CLI helper to add a prop by:
      - displaying current (live) and upcoming games
      - asking the user to pick a game
      - prompting for player, market type, line, side, and optional stake
    """
    sport = dashboard.sport
    formatter.print_info(f"Fetching live and upcoming {sport.upper()} games to attach your prop to...")
    
    # Fetch both live and scheduled games
    try:
        live_games = sports_fetcher.fetch_live(sport, limit=15)
        # Filter out "no live games" placeholder if present
        live_games = [g for g in live_games if g.get('state') != 'no_live']
    except Exception:
        live_games = []
        
    try:
        schedule_games = sports_fetcher.fetch_schedule(sport, limit=15)
        # Filter out "no upcoming games" placeholder
        schedule_games = [g for g in schedule_games if g.get('state') != 'tbd']
    except Exception:
        schedule_games = []

    # Combine unique games (prefer live version if in both)
    # Use event_id or id to deduplicate
    seen_ids = set()
    games = []
    
    all_candidates = live_games + schedule_games
    
    for g in all_candidates:
        # Determine ID: prefer event_id if available
        gid = g.get('event_id') or g.get('id')
        if gid and gid not in seen_ids:
            seen_ids.add(gid)
            games.append(g)
        elif not gid:
            # Fallback if no ID (shouldn't happen with real games)
            games.append(g)

    if not games:
        formatter.print_warning(f"No live or upcoming {sport.upper()} games found.")
        return

    # Show games with indices so user can pick one
    for idx, g in enumerate(games, start=1):
        if g.get('state') == 'in':
            clock = g.get('display_clock', '')
            period = g.get('period', '')
            status_str = f"[LIVE {clock} - Q{period}]"
        else:
            status_str = g.get('date')
            
        label = f"{g['away_team']} @ {g['home_team']} - {status_str}"
        formatter.print(f"  {idx}) {label}")

    while True:
        selection = input("Select a game number (or 'q' to cancel): ").strip()
        if selection.lower() == "q":
            formatter.print_info("Cancelled adding prop.")
            return
        try:
            index = int(selection)
            if 1 <= index <= len(games):
                break
        except ValueError:
            pass
        formatter.print_warning("Invalid selection. Please enter a valid game number or 'q'.")

    game = games[index - 1]
    # Prefer ESPN event id when available so we can fetch detailed player stats
    event_id = game.get("event_id") or game.get("id") or index
    game_id = str(event_id)
    game_label = f"{game['away_team']} @ {game['home_team']} - {game['date']}"

    player_name = ""
    team_name = ""

    while True:
        player_name_input = input("Player name (e.g., LeBron James): ").strip()
        if not player_name_input:
            continue
            
        formatter.print_info(f"Validating player '{player_name_input}'...")
        try:
            found_player = sports_fetcher.find_player(sport, game_id, player_name_input)
            
            if found_player:
                player_name = found_player['display_name']
                team_name = found_player['team_name']
                formatter.print_success(f"Found: {player_name} ({team_name})")
                break
            else:
                formatter.print_error(f"Player '{player_name_input}' not found in this game or is inactive/not playing.")
                retry = input("Try again? (y/n): ").strip().lower()
                if retry != 'y':
                    formatter.print_info("Cancelled adding prop.")
                    return
        except Exception as e:
            formatter.print_warning(f"Could not validate player: {str(e)}")
            retry = input("Try again? (y/n): ").strip().lower()
            if retry != 'y':
                return

    # Market type selection based on sport
    if sport == "nba":
        valid_markets = {
            "1": "points",
            "2": "rebounds",
            "3": "assists",
            "4": "three_pointers_made",
            "5": "blocks",
            "6": "steals",
            "7": "double_double",
        }
        formatter.print("\nSelect market type:")
        formatter.print("  1) Points")
        formatter.print("  2) Rebounds")
        formatter.print("  3) Assists")
        formatter.print("  4) 3-Pointers Made")
        formatter.print("  5) Blocks")
        formatter.print("  6) Steals")
        formatter.print("  7) Double Double")
    else:
        # Default to NFL markets
        valid_markets = {
            "1": "rushing_yards",
            "2": "receiving_yards",
            "3": "passing_yards",
            "4": "passing_completions",
            "5": "passing_touchdowns",
        }
        formatter.print("\nSelect market type:")
        formatter.print("  1) Rushing yards")
        formatter.print("  2) Receiving yards")
        formatter.print("  3) Passing yards")
        formatter.print("  4) Passing completions")
        formatter.print("  5) Passing touchdowns")

    while True:
        market_choice = input(f"Market (1-{len(valid_markets)}): ").strip()
        if market_choice in valid_markets:
            market_type = valid_markets[market_choice]
            break
        formatter.print_warning(f"Invalid market. Please enter 1-{len(valid_markets)}.")

    # Line
    while True:
        line_raw = input("Line (e.g., 25.5): ").strip()
        try:
            line = float(line_raw)
            break
        except ValueError:
            formatter.print_warning("Invalid line. Please enter a numeric value like 25.5.")

    # Side
    while True:
        side = input("Side ('over' or 'under'): ").strip().lower()
        if side in ("over", "under"):
            break
        formatter.print_warning("Invalid side. Please enter 'over' or 'under'.")

    # Optional stake
    stake: Optional[float] = None
    stake_raw = input("Stake amount (optional, press ENTER to skip): ").strip()
    if stake_raw:
        try:
            stake = float(stake_raw)
        except ValueError:
            formatter.print_warning("Invalid stake value, ignoring.")

    prop = dashboard.add_prop(
        game_id=game_id,
        game_label=game_label,
        player_name=player_name,
        team_name=team_name,
        market_type=market_type,
        line=line,
        side=side,
        stake=stake,
    )

    formatter.print_success(
        f"Added prop #{prop.id}: {prop.player_name} {side} {prop.line} {market_type.replace('_', ' ')} ({prop.game_label})"
    )


def remove_prop_interactively(dashboard: PropsDashboard, formatter) -> None:
    """CLI helper to remove a prop by id."""
    if not dashboard.props:
        formatter.print_info("No props to remove.")
        return

    formatter.print_info("Current props:")
    for p in dashboard.props:
        formatter.print(
            f"  #{p.id}: {p.player_name} {p.side} {p.line} {p.market_type.replace('_', ' ')} "
            f"({p.game_label})"
        )

    while True:
        raw = input("Enter prop id to remove (or 'q' to cancel): ").strip()
        if raw.lower() == "q":
            formatter.print_info("Cancelled removing prop.")
            return
        try:
            pid = int(raw)
        except ValueError:
            formatter.print_warning("Invalid id. Please enter a numeric id or 'q'.")
            continue

        if dashboard.remove_prop_by_id(pid):
            formatter.print_success(f"Removed prop #{pid}.")
            return
        else:
            formatter.print_warning(f"No prop found with id #{pid}.")


