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
            
            # Helper for period scores (1Q, 1H)
            linescores = stats.get("_linescores", {})
            home_ls = linescores.get("home", [])
            away_ls = linescores.get("away", [])
            
            def get_period_score(period_idx: int, is_home: bool) -> float:
                # period_idx: 0 for 1Q, 1 for 2Q, etc.
                target = home_ls if is_home else away_ls
                if period_idx < len(target):
                    return target[period_idx]
                return 0.0
                
            def get_half_score(is_home: bool) -> float:
                # 1st Half = Q1 + Q2
                return get_period_score(0, is_home) + get_period_score(1, is_home)

            for p in props:
                value = None
                
                # Check for team bet types
                if p.market_type in ("moneyline", "spread", "total_score", 
                                     "1h_moneyline", "1h_spread", "1h_total_score",
                                     "1q_moneyline", "1q_spread", "1q_total_score",
                                     "home_team_points", "away_team_points"):
                    
                    # Determine relevant scores based on period
                    if p.market_type.startswith("1q_"):
                        h_s = get_period_score(0, True)
                        a_s = get_period_score(0, False)
                        period_label = "1Q"
                    elif p.market_type.startswith("1h_"):
                        h_s = get_half_score(True)
                        a_s = get_half_score(False)
                        period_label = "1H"
                    else:
                        h_s = home_score
                        a_s = away_score
                        period_label = "Full"

                    if "total_score" in p.market_type:
                        value = h_s + a_s
                        p.current_value_str = f"{int(value)} ({int(a_s)}-{int(h_s)}) [{period_label}]"
                    
                    elif "spread" in p.market_type:
                        # Value is the score difference from perspective of the picked team
                        if p.side.lower() in away_team_name.lower():
                            value = a_s - h_s
                        else:
                            value = h_s - a_s
                        p.current_value_str = f"{int(value):+d} ({int(a_s)}-{int(h_s)}) [{period_label}]"
                        
                    elif "moneyline" in p.market_type:
                        # Value is just the margin
                        if p.side.lower() in away_team_name.lower():
                            value = a_s - h_s
                        else:
                            value = h_s - a_s
                        # Just show total score as requested
                        p.current_value_str = f"Score: {int(a_s)}-{int(h_s)} [{period_label}]"
                        
                    elif p.market_type == "home_team_points":
                        value = home_score
                        p.current_value_str = f"{int(value)}"
                        # Ensure we map team name correctly for tracking if not set
                        if not p.team_name: 
                            p.team_name = home_team_name
                            
                    elif p.market_type == "away_team_points":
                        value = away_score
                        p.current_value_str = f"{int(value)}"
                        if not p.team_name:
                            p.team_name = away_team_name

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
    
    # Handle Period/Half specific team bets
    # They behave exactly like full game versions but with period-specific values passed in as current_value
    is_team_total = prop.market_type in ("home_team_points", "away_team_points")
    is_moneyline = "moneyline" in prop.market_type
    is_spread = "spread" in prop.market_type
    is_total = "total_score" in prop.market_type

    # Handle Team Bets
    if is_moneyline:
        # Value is margin (Team - Opponent)
        # Winning if margin > 0
        is_winning = current_value > 0
        if game_state in ("post", "final"):
            return "won" if is_winning else "lost"
        else:
            return "live_hit" if is_winning else "live_miss"

    elif is_spread:
        # Value is margin (Team - Opponent)
        # Winning if (Margin + Spread) > 0
        
        margin_with_spread = current_value + line
        if abs(margin_with_spread) < 1e-6:
            return "push" if game_state in ("post", "final") else "live_push"
            
        is_winning = margin_with_spread > 0
        if game_state in ("post", "final"):
            return "won" if is_winning else "lost"
        else:
            return "live_hit" if is_winning else "live_miss"

    elif is_total or is_team_total:
        # Value is total score (either game total or team total)
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
    formatter.print("  2) Moneyline (Full Game)")
    formatter.print("  3) Point Spread (Full Game)")
    formatter.print("  4) Total Score (Full Game)")
    formatter.print("  5) 1st Half Bets (ML, Spread, Total)")
    formatter.print("  6) 1st Quarter Bets (ML, Spread, Total)")
    formatter.print("  7) Team Total Points")

    bet_type_choice = "1"
    while True:
        bet_type_choice = input("Select type (1-7): ").strip()
        if bet_type_choice in ("1", "2", "3", "4", "5", "6", "7"):
            break
        formatter.print_warning("Invalid selection. Please enter 1-7.")

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
                "6": "receptions",
                "7": "passing_interceptions",
                "8": "passing_attempts",
                "9": "rushing_attempts",
                "10": "sacks",
                "11": "tackles_assists",
                "12": "tackle_assists",
                "13": "field_goals_made",
                "14": "extra_points_made",
                "15": "kicking_points",
                "16": "rushing_receiving_yards",
                "17": "passing_rushing_yards",
                "18": "longest_passing_completion",
                "19": "longest_reception",
                "20": "longest_rush",
                "21": "anytime_touchdowns",
                "22": "first_touchdown",
                "23": "last_touchdown",
            }
            formatter.print("\nSelect market type:")
            formatter.print("  1) Rushing Yards")
            formatter.print("  2) Receiving Yards")
            formatter.print("  3) Passing Yards")
            formatter.print("  4) Passing Completions")
            formatter.print("  5) Passing Touchdowns")
            formatter.print("  6) Receptions")
            formatter.print("  7) Passing Interceptions")
            formatter.print("  8) Passing Attempts")
            formatter.print("  9) Rushing Attempts")
            formatter.print("  10) Sacks")
            formatter.print("  11) Total Tackles (Solo + Ast)")
            formatter.print("  12) Tackle Assists")
            formatter.print("  13) Field Goals Made")
            formatter.print("  14) Extra Points Made")
            formatter.print("  15) Kicking Points")
            formatter.print("  16) Rushing + Receiving Yards")
            formatter.print("  17) Passing + Rushing Yards")
            formatter.print("  18) Longest Passing Completion")
            formatter.print("  19) Longest Reception")
            formatter.print("  20) Longest Rush")
            formatter.print("  21) Anytime Touchdowns")
            formatter.print("  22) First Touchdown")
            formatter.print("  23) Last Touchdown")

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

    elif bet_type_choice in ("5", "6"):
        # 1st Half / 1st Quarter Bets
        period_label = "1st Half" if bet_type_choice == "5" else "1st Quarter"
        prefix = "1h" if bet_type_choice == "5" else "1q"
        
        formatter.print(f"\nSelect {period_label} Bet Type:")
        formatter.print("  1) Moneyline")
        formatter.print("  2) Point Spread")
        formatter.print("  3) Total Score")
        
        sub_choice = ""
        while True:
            sub_choice = input("Select type (1-3): ").strip()
            if sub_choice in ("1", "2", "3"):
                break
            formatter.print_warning("Invalid selection.")

        # Determine market type string
        if sub_choice == "1":
            market_type = f"{prefix}_moneyline"
            player_name = f"{period_label} Moneyline"
        elif sub_choice == "2":
            market_type = f"{prefix}_spread"
            player_name = f"{period_label} Spread"
        else:
            market_type = f"{prefix}_total_score"
            player_name = f"{period_label} Total"

        # Team Selection (for ML/Spread) or Context (for Total)
        formatter.print("\nSelect team (for ML/Spread perspective):")
        formatter.print(f"  1) {game['away_team']} (Away)")
        formatter.print(f"  2) {game['home_team']} (Home)")
        
        while True:
            team_choice = input("Select team (1-2): ").strip()
            if team_choice == "1":
                side = game['away_team']
                team_name = game['away_team']
                break
            elif team_choice == "2":
                side = game['home_team']
                team_name = game['home_team']
                break
            formatter.print_warning("Invalid selection.")
            
        if sub_choice == "1": # ML
            line = 0.0
            # Ask for odds
            odds_raw = input("Odds (e.g. -110): ").strip()
            if odds_raw:
                try:
                     bet_odds = float(odds_raw)
                except ValueError: pass
                
        elif sub_choice == "2": # Spread
             while True:
                line_raw = input("Spread Line (e.g. -0.5, -3.5): ").strip()
                try:
                    line = float(line_raw)
                    break
                except ValueError:
                    formatter.print_warning("Invalid line.")
                    
        elif sub_choice == "3": # Total
            # For total, side is over/under
             while True:
                line_raw = input("Total Line (e.g. 20.5): ").strip()
                try:
                    line = float(line_raw)
                    break
                except ValueError:
                    formatter.print_warning("Invalid line.")
                    
             while True:
                side_in = input("Side ('over' or 'under'): ").strip().lower()
                if side_in in ("over", "under"):
                    side = side_in # Overwrite side (which was team name above)
                    break
                formatter.print_warning("Invalid side.")
                
    elif bet_type_choice == "7":
        # Team Total Points
        formatter.print("\nSelect team for Team Total:")
        formatter.print(f"  1) {game['away_team']} (Away)")
        formatter.print(f"  2) {game['home_team']} (Home)")
        
        is_home = False
        while True:
            team_choice = input("Select team (1-2): ").strip()
            if team_choice == "1":
                market_type = "away_team_points"
                player_name = f"{game['away_team']} Total Points"
                team_name = game['away_team']
                break
            elif team_choice == "2":
                market_type = "home_team_points"
                player_name = f"{game['home_team']} Total Points"
                team_name = game['home_team']
                break
            formatter.print_warning("Invalid selection.")
            
        while True:
            line_raw = input("Line (e.g. 24.5): ").strip()
            try:
                line = float(line_raw)
                break
            except ValueError:
                formatter.print_warning("Invalid line.")
                
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


