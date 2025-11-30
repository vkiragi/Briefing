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
    market_type: str  # e.g. 'rushing_yards', 'moneyline', 'spread', 'total_score'
    line: float
    side: str  # 'over'/'under', or team name for ML/Spread
    stake: Optional[float] = None
    odds: Optional[float] = None  # e.g. -110

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
        odds: Optional[float] = None,
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
            odds=odds,
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
                elif self.sport == "mlb":
                    stats = sports_fetcher.fetch_mlb_game_player_stats(game_id)
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

            # Extract team scores for Moneyline/Spread/Total
            home_score = 0
            away_score = 0
            home_team_name = ""
            away_team_name = ""
            
            try:
                header = stats.get("header", {})
                competitions = header.get("competitions", [])
                if competitions:
                    competitors = competitions[0].get("competitors", [])
                    # Competitors are usually [home, away] or vice versa. 
                    # Need to check homeAway field.
                    for comp in competitors:
                        score_val = comp.get("score", "0")
                        try:
                            s = float(score_val)
                        except ValueError:
                            s = 0.0
                            
                        team_data = comp.get("team", {})
                        t_name = team_data.get("displayName", "")
                        
                        if comp.get("homeAway") == "home":
                            home_score = s
                            home_team_name = t_name
                        else:
                            away_score = s
                            away_team_name = t_name
            except Exception:
                pass

            for p in props:
                value = None
                
                # Check for team bet types
                if p.market_type in ("moneyline", "spread", "total_score"):
                    if p.market_type == "total_score":
                        value = home_score + away_score
                        p.current_value_str = f"{int(value)} ({int(away_score)}-{int(home_score)})"
                    elif p.market_type == "spread":
                        # Value is the score difference from perspective of the picked team
                        # Spread bet: Team + Spread > Opponent
                        # Or: (Team Score - Opponent Score) + Spread > 0
                        # We'll store the actual margin (Team - Opponent) as value
                        if p.side.lower() in away_team_name.lower():
                            value = away_score - home_score
                        else:
                            value = home_score - away_score
                        p.current_value_str = f"{int(value):+d} ({int(away_score)}-{int(home_score)})"
                    elif p.market_type == "moneyline":
                        # Value is just the margin, same as spread but line is 0 (or odds)
                        if p.side.lower() in away_team_name.lower():
                            value = away_score - home_score
                        else:
                            value = home_score - away_score
                        p.current_value_str = f"{int(value):+d} ({int(away_score)}-{int(home_score)})"
                else:
                    # Player Prop
                    result = None
                    if self.sport == "nba":
                        result = sports_fetcher.get_nba_player_stat(
                            event_id=game_id,
                            player_name=p.player_name,
                            market_type=p.market_type,
                            stats_payload=stats,
                        )
                    elif self.sport == "mlb":
                        result = sports_fetcher.get_mlb_player_stat(
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
                    
                    if result:
                        if isinstance(result, dict):
                            value = result.get('value')
                            found_team = result.get('team')
                            found_player = result.get('player')
                            
                            if found_team and (not p.team_name or p.team_name == '-'):
                                p.team_name = found_team
                            
                            if found_player:
                                p.player_name = found_player
                            
                            display_val = result.get('display_value')
                            if display_val:
                                p.current_value_str = display_val

                        elif isinstance(result, (int, float)):
                            value = float(result)

                p.current_value = value
                
                # Special handling for NFL: Players often don't appear in specific stat categories 
                if p.current_value is None and self.sport == 'nfl' and game_state == 'in' and p.market_type not in ("moneyline", "spread", "total_score"):
                    p.current_value = 0.0

                p.game_state = game_state
                p.game_status_text = game_status_detail
                p.prop_status = _compute_prop_status(
                    prop=p,
                    current_value=value,
                    game_state=game_state,
                )


def _compute_prop_status(
    prop: PlayerProp,
    current_value: Optional[float],
    game_state: str,
) -> str:
    """
    Compute semantic prop status given the prop and game state.
    """
    if current_value is None:
        # No stats yet
        if game_state in ("post", "final"):
            return "unavailable"
        return "pending"

    # Normalize side
    side = prop.side.lower()
    line = prop.line

    # Handle Team Bets
    if prop.market_type == "moneyline":
        # Value is margin (Team - Opponent)
        # Winning if margin > 0
        is_winning = current_value > 0
        if game_state in ("post", "final"):
            return "won" if is_winning else "lost"
        else:
            return "live_hit" if is_winning else "live_miss"

    elif prop.market_type == "spread":
        # Value is margin (Team - Opponent)
        # Winning if (Margin + Spread) > 0
        # Wait, Spread is usually like -3.5 or +7.
        # If I bet Team -3.5, I need Margin > 3.5. So Margin - 3.5 > 0? No.
        # Spread condition: Score + Spread > Opp Score
        # (Team Score + Spread) > Opp Score
        # (Team Score - Opp Score) + Spread > 0
        # Margin + Spread > 0
        
        # Example: Bet SF -3.5. Line is -3.5.
        # If SF wins by 4 (Margin = 4). 4 + (-3.5) = 0.5 > 0. Win.
        # If SF wins by 3 (Margin = 3). 3 + (-3.5) = -0.5 < 0. Loss.
        
        # Example: Bet CLE +5.5. Line is +5.5.
        # If CLE loses by 5 (Margin = -5). -5 + 5.5 = 0.5 > 0. Win.
        # If CLE loses by 6 (Margin = -6). -6 + 5.5 = -0.5 < 0. Loss.
        
        margin_with_spread = current_value + line
        if abs(margin_with_spread) < 1e-6:
            return "push" if game_state in ("post", "final") else "live_push"
            
        is_winning = margin_with_spread > 0
        if game_state in ("post", "final"):
            return "won" if is_winning else "lost"
        else:
            return "live_hit" if is_winning else "live_miss"

    elif prop.market_type == "total_score":
        # Value is total score
        if abs(current_value - line) < 1e-6:
            return "push" if game_state in ("post", "final") else "live_push"
            
        if side == "over":
            is_hit = current_value > line
        else: # under
            is_hit = current_value < line
            
        if game_state in ("post", "final"):
            return "won" if is_hit else "lost"
        
        # For totals, live status is tricky.
        # Over: Once hit, it's a win (can't go back).
        # Under: Winning until it goes over.
        if side == "over":
            return "won" if is_hit else "live_miss" # If hit, it's effectively won already
        else:
            return "live_hit" if is_hit else "lost" # If missed (went over), it's lost

    # Player Props
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

    # Extract odds for display
    odds = game.get('odds', {})
    if odds:
        formatter.print_info(f"Odds: {odds.get('details', 'N/A')} | O/U: {odds.get('over_under', 'N/A')}")

    # Bet Type Selection
    formatter.print("\nSelect bet type:")
    formatter.print("  1) Player Prop")
    formatter.print("  2) Moneyline")
    formatter.print("  3) Point Spread")
    formatter.print("  4) Total Score (Over/Under)")

    bet_type_choice = "1"
    while True:
        bet_type_choice = input("Select type (1-4): ").strip()
        if bet_type_choice in ("1", "2", "3", "4"):
            break
        formatter.print_warning("Invalid selection. Please enter 1-4.")

    player_name = ""
    team_name = ""
    market_type = ""
    line = 0.0
    side = ""
    bet_odds = None

    if bet_type_choice == "1":
        # Player Prop
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
        elif sport == "mlb":
            valid_markets = {
                "1": "hits",
                "2": "runs",
                "3": "rbi",
                "4": "home_runs",
                "5": "strikeouts_pitching",
                "6": "earned_runs",
                "7": "innings_pitched",
            }
            formatter.print("\nSelect market type:")
            formatter.print("  1) Hits")
            formatter.print("  2) Runs")
            formatter.print("  3) RBI")
            formatter.print("  4) Home Runs")
            formatter.print("  5) Pitcher Strikeouts")
            formatter.print("  6) Earned Runs Allowed")
            formatter.print("  7) Innings Pitched")
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

    elif bet_type_choice == "2":
        # Moneyline
        market_type = "moneyline"
        player_name = "Moneyline" # Placeholder
        
        formatter.print("\nSelect team:")
        formatter.print(f"  1) {game['away_team']} (Away)")
        formatter.print(f"  2) {game['home_team']} (Home)")
        
        while True:
            team_choice = input("Select team (1-2): ").strip()
            if team_choice == "1":
                side = game['away_team'] # Storing team name in side
                team_name = game['away_team']
                # Try to autofill odds
                if odds and odds.get('away_moneyline'):
                     bet_odds = float(odds['away_moneyline'])
                break
            elif team_choice == "2":
                side = game['home_team']
                team_name = game['home_team']
                if odds and odds.get('home_moneyline'):
                     bet_odds = float(odds['home_moneyline'])
                break
            formatter.print_warning("Invalid selection.")
            
        # Ask for odds confirmation
        odds_prompt = f"Odds (e.g. -110){f' [Default: {bet_odds}]' if bet_odds else ''}: "
        odds_raw = input(odds_prompt).strip()
        if odds_raw:
            try:
                bet_odds = float(odds_raw)
            except ValueError:
                pass
        
        # Line for moneyline is effectively 0 or the odds themselves depending on how we track
        # We'll use 0 for now as 'line' usually implies a spread/total barrier
        line = 0.0

    elif bet_type_choice == "3":
        # Spread
        market_type = "spread"
        player_name = "Spread"
        
        formatter.print("\nSelect team:")
        formatter.print(f"  1) {game['away_team']} (Away)")
        formatter.print(f"  2) {game['home_team']} (Home)")
        
        default_line = None
        while True:
            team_choice = input("Select team (1-2): ").strip()
            if team_choice == "1":
                side = game['away_team']
                team_name = game['away_team']
                # Parse spread from details if possible? 
                # e.g. "SF -5.5". If away is SF, line is -5.5.
                # Assuming odds info has it.
                # We added home/away spread logic to fetcher but just returning 'details'
                # Let's rely on user input or details string parsing if simple
                if odds and 'spread' in odds:
                    # If detail is "SF -5.5" and we picked SF, line is -5.5
                    # This is tricky without more parsed data.
                    pass
                break
            elif team_choice == "2":
                side = game['home_team']
                team_name = game['home_team']
                break
            formatter.print_warning("Invalid selection.")

        # Ask for line
        while True:
            line_raw = input("Spread Line (e.g., -3.5, +7.0): ").strip()
            try:
                line = float(line_raw)
                break
            except ValueError:
                formatter.print_warning("Invalid line. Please enter a numeric value.")
                
    elif bet_type_choice == "4":
        # Total
        market_type = "total_score"
        player_name = "Total Score"
        team_name = f"{game['away_team']} / {game['home_team']}"
        
        # Line
        default_line = odds.get('over_under')
        line_prompt = f"Total Line (e.g. 45.5){f' [Default: {default_line}]' if default_line else ''}: "
        while True:
            line_raw = input(line_prompt).strip()
            if not line_raw and default_line:
                line = float(default_line)
                break
            try:
                line = float(line_raw)
                break
            except ValueError:
                formatter.print_warning("Invalid line.")

        # Side
        while True:
            side = input("Side ('over' or 'under'): ").strip().lower()
            if side in ("over", "under"):
                break
            formatter.print_warning("Invalid side.")

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
        odds=bet_odds
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


