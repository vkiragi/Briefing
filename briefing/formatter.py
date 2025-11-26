"""
Output formatting utilities for the CLI.
"""

import os
import sys
from typing import List, Dict, Any
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box


class OutputFormatter:
    """Handles formatting and display of news and sports data."""

    def __init__(self, use_color: bool = True):
        """
        Initialize the formatter.

        Args:
            use_color: Whether to use colored output
        """
        self.use_color = use_color

    def _get_console(self) -> Console:
        """Get a Console instance with current terminal width."""
        # Try to get the actual terminal size
        try:
            # Use stdout file descriptor to get terminal size
            width = os.get_terminal_size(sys.stdout.fileno()).columns
        except (AttributeError, ValueError, OSError):
            # Fallback: let Rich auto-detect
            width = None

        return Console(
            color_system="auto" if self.use_color else None,
            force_terminal=True,
            legacy_windows=False,
            width=width
        )

    def print_news(self, news_data: Dict[str, List[Dict]], show_links: bool = True):
        """
        Print news items in a formatted table.

        Args:
            news_data: Dictionary mapping source names to news items
            show_links: Whether to include article links
        """
        console = self._get_console()

        for source, items in news_data.items():
            if not items:
                continue

            # Create header
            console.print(f"\n[bold cyan]📰 {source.upper()} News[/bold cyan]\n")

            for i, item in enumerate(items, 1):
                # Create a panel for each news item
                title = f"[bold]{item['title']}[/bold]"
                content = []

                if item.get('summary'):
                    content.append(item['summary'])

                if item.get('published'):
                    content.append(f"\n[dim]Published: {item['published']}[/dim]")

                if show_links and item.get('link'):
                    content.append(f"\n[blue underline][link={item['link']}]{item['link']}[/link][/blue underline]")

                panel = Panel(
                    "\n".join(content),
                    title=f"[{i}] {title}",
                    border_style="green",
                    box=box.ROUNDED,
                    padding=(0, 1),
                    expand=True  # Expand to full width
                )
                console.print(panel)

    def _format_game_status(self, game: Dict, sport: str) -> str:
        """
        Format detailed game status with quarter/period and time for live games.

        Args:
            game: Game dictionary with status info
            sport: Sport name (e.g., 'nba', 'nfl')

        Returns:
            Formatted status string
        """
        status = game.get('status', 'Unknown')
        state = game.get('state', '')

        # Only show detailed info for in-progress games
        if state != 'in':
            return status

        period = game.get('period')
        display_clock = game.get('display_clock', '')

        if not period:
            return status

        # Format period/quarter based on sport
        period_labels = {
            'nba': {1: '1st Q', 2: '2nd Q', 3: '3rd Q', 4: '4th Q', 5: 'OT'},
            'nfl': {1: '1st Q', 2: '2nd Q', 3: '3rd Q', 4: '4th Q', 5: 'OT'},
            'nhl': {1: '1st', 2: '2nd', 3: '3rd', 4: 'OT'},
            'mlb': {1: 'Top 1st', 2: 'Bot 1st', 3: 'Top 2nd', 4: 'Bot 2nd'},  # Simplified
        }

        sport_labels = period_labels.get(sport.lower(), {})

        if sport.lower() in ['nba', 'nfl', 'nhl']:
            period_label = sport_labels.get(period, f'Period {period}')
            if display_clock:
                return f"{period_label} - {display_clock}"
            else:
                return period_label
        elif sport.lower() == 'mlb':
            # For baseball, just show the inning
            inning = (period + 1) // 2
            half = 'Top' if period % 2 == 1 else 'Bot'
            return f"{half} {inning}"
        else:
            # Generic format for other sports
            if display_clock:
                return f"Period {period} - {display_clock}"
            return status

    def print_sports_scores(self, sport: str, games: List[Dict]):
        """
        Print sports scores in a formatted table.

        Args:
            sport: Name of the sport
            games: List of game dictionaries
        """
        console = self._get_console()

        if not games:
            console.print(f"[yellow]No games found for {sport}[/yellow]")
            return

        # Check if this is tennis and has match_type field
        is_tennis = sport.lower().startswith('tennis-') and any(game.get('match_type') for game in games)

        if is_tennis:
            # Group games by match type (singles/doubles)
            grouped_games = {}
            for game in games:
                match_type = game.get('match_type', 'Unknown')
                if match_type not in grouped_games:
                    grouped_games[match_type] = []
                grouped_games[match_type].append(game)

            # Define order: Singles first, then Doubles
            match_type_order = []
            for key in grouped_games.keys():
                if 'Singles' in key:
                    match_type_order.insert(0, key)  # Put singles at the beginning
                else:
                    match_type_order.append(key)  # Put doubles at the end

            # Print each group separately in the defined order
            for match_type in match_type_order:
                type_games = grouped_games[match_type]
                console.print(f"\n[bold green]🏆 {sport.upper()} - {match_type}[/bold green]\n")

                table = Table(
                    show_header=True,
                    header_style="bold magenta",
                    box=box.ROUNDED,
                    expand=False
                )
                table.add_column("Away Player(s)", style="cyan", no_wrap=False, max_width=25)
                table.add_column("Score", justify="center", style="yellow", width=7)
                table.add_column("Home Player(s)", style="cyan", no_wrap=False, max_width=25)
                table.add_column("Sets", style="magenta", no_wrap=False, max_width=20)
                table.add_column("Tournament", style="blue", no_wrap=False, max_width=30)
                table.add_column("Status", style="green", width=10)
                table.add_column("Date", style="dim", no_wrap=False, max_width=18)

                for game in type_games:
                    away_score = game['away_score']
                    home_score = game['home_score']

                    # Highlight winning player if game is completed (and not TBD)
                    if game.get('completed') and away_score != 'TBD' and home_score != 'TBD':
                        try:
                            if int(away_score) > int(home_score):
                                away_score = f"[bold green]{away_score}[/bold green]"
                            elif int(home_score) > int(away_score):
                                home_score = f"[bold green]{home_score}[/bold green]"
                        except ValueError:
                            pass

                    # Format score display
                    if away_score == 'TBD' or home_score == 'TBD':
                        score_display = f"[dim]{away_score} - {home_score}[/dim]"
                    else:
                        score_display = f"{away_score} - {home_score}"

                    status_display = self._format_game_status(game, sport)

                    # Get set scores and tournament if available
                    set_scores = game.get('set_scores', '-')
                    tournament = game.get('tournament', 'Unknown')

                    table.add_row(
                        game['away_team'],
                        score_display,
                        game['home_team'],
                        set_scores,
                        tournament,
                        status_display,
                        game['date']
                    )

                console.print(table)
        else:
            # Standard display for non-tennis sports
            console.print(f"\n[bold green]🏆 {sport.upper()} Scores[/bold green]\n")

            table = Table(
                show_header=True,
                header_style="bold magenta",
                box=box.ROUNDED,
                expand=True
            )
            table.add_column("Away Team", style="cyan", no_wrap=True)
            table.add_column("Score", justify="center", style="yellow")
            table.add_column("Home Team", style="cyan", no_wrap=True)
            table.add_column("Status", style="green")
            table.add_column("Date", style="dim")

            for game in games:
                away_score = game['away_score']
                home_score = game['home_score']

                # Highlight winning team if game is completed (and not TBD)
                if game.get('completed') and away_score != 'TBD' and home_score != 'TBD':
                    try:
                        if int(away_score) > int(home_score):
                            away_score = f"[bold green]{away_score}[/bold green]"
                        elif int(home_score) > int(away_score):
                            home_score = f"[bold green]{home_score}[/bold green]"
                    except ValueError:
                        pass

                # Format score display
                if away_score == 'TBD' or home_score == 'TBD':
                    score_display = f"[dim]{away_score} - {home_score}[/dim]"
                else:
                    score_display = f"{away_score} - {home_score}"

                # Get detailed status with quarter/time if available
                status_display = self._format_game_status(game, sport)

                table.add_row(
                    game['away_team'],
                    score_display,
                    game['home_team'],
                    status_display,
                    game['date']
                )

            console.print(table)

    def print_live_scores(self, sport: str, games: List[Dict]):
        """
        Print live/in-progress games in a formatted table with LIVE indicator.

        Args:
            sport: Name of the sport
            games: List of live game dictionaries
        """
        console = self._get_console()

        if not games:
            console.print(f"[yellow]No live games found for {sport}[/yellow]")
            return

        console.print(f"\n[bold red]🔴 LIVE - {sport.upper()} Games[/bold red]\n")

        table = Table(
            show_header=True,
            header_style="bold magenta",
            box=box.ROUNDED,
            expand=True
        )
        table.add_column("Away Team", style="cyan", no_wrap=True)
        table.add_column("Score", justify="center", style="bold yellow")
        table.add_column("Home Team", style="cyan", no_wrap=True)
        table.add_column("Status", style="bold red")
        table.add_column("Time", style="dim")

        for game in games:
            # Check if this is a "no live games" message
            if game.get('state') == 'no_live':
                table.add_row(
                    f"[dim]{game['away_team']}[/dim]",
                    f"[dim]{game['away_score']} - {game['home_score']}[/dim]",
                    f"[dim]{game['home_team']}[/dim]",
                    f"[dim]{game['status']}[/dim]",
                    f"[dim]{game['date']}[/dim]"
                )
            else:
                away_score = game['away_score']
                home_score = game['home_score']

                # Highlight leading team in live games
                try:
                    if int(away_score) > int(home_score):
                        away_score = f"[bold green]{away_score}[/bold green]"
                    elif int(home_score) > int(away_score):
                        home_score = f"[bold green]{home_score}[/bold green]"
                except ValueError:
                    pass

                score_display = f"{away_score} - {home_score}"

                # Get detailed status with quarter/period and time
                status_display = self._format_game_status(game, sport)

                table.add_row(
                    game['away_team'],
                    score_display,
                    game['home_team'],
                    f"🔴 {status_display}",
                    game['date']
                )

        console.print(table)

    def print_schedule(self, sport: str, games: List[Dict]):
        """
        Print upcoming games schedule in a formatted table.

        Args:
            sport: Name of the sport
            games: List of scheduled game dictionaries
        """
        console = self._get_console()

        if not games:
            console.print(f"[yellow]No upcoming games found for {sport}[/yellow]")
            return

        console.print(f"\n[bold green]📅 {sport.upper()} Upcoming Schedule[/bold green]\n")

        table = Table(
            show_header=True,
            header_style="bold magenta",
            box=box.ROUNDED,
            expand=True  # Expand to full width
        )
        table.add_column("Away Team", style="cyan", no_wrap=True)
        table.add_column("@", justify="center", style="dim", width=3)
        table.add_column("Home Team", style="cyan", no_wrap=True)
        table.add_column("Status", style="green")
        table.add_column("Date/Time", style="yellow")

        for game in games:
            # Check if this is a TBD message
            if game.get('state') == 'tbd':
                table.add_row(
                    f"[dim]{game['away_team']}[/dim]",
                    "[dim]vs[/dim]",
                    f"[dim]{game['home_team']}[/dim]",
                    f"[dim]{game['status']}[/dim]",
                    f"[dim]{game['date']}[/dim]"
                )
            else:
                table.add_row(
                    game['away_team'],
                    "@",
                    game['home_team'],
                    game['status'],
                    game['date']
                )

        console.print(table)

    def print_sports_news(self, sport: str, news_items: List[Dict], show_links: bool = True):
        """
        Print sports news items.

        Args:
            sport: Name of the sport
            news_items: List of news article dictionaries
            show_links: Whether to include article links
        """
        console = self._get_console()

        if not news_items:
            console.print(f"[yellow]No news found for {sport}[/yellow]")
            return

        console.print(f"\n[bold green]📰 {sport.upper()} News[/bold green]\n")

        for i, item in enumerate(news_items, 1):
            title = f"[bold]{item['title']}[/bold]"
            content = []

            if item.get('description'):
                content.append(item['description'])

            if item.get('published'):
                content.append(f"\n[dim]Published: {item['published']}[/dim]")

            if show_links and item.get('link'):
                content.append(f"\n[blue underline][link={item['link']}]{item['link']}[/link][/blue underline]")

            panel = Panel(
                "\n".join(content),
                title=f"[{i}] {title}",
                border_style="green",
                box=box.ROUNDED,
                padding=(0, 1),
                expand=True  # Expand to full width
            )
            console.print(panel)

    def print_error(self, message: str):
        """Print an error message."""
        console = self._get_console()
        console.print(f"[bold red]Error:[/bold red] {message}")

    def print_warning(self, message: str):
        """Print a warning message."""
        console = self._get_console()
        console.print(f"[bold yellow]Warning:[/bold yellow] {message}")

    def print_success(self, message: str):
        """Print a success message."""
        console = self._get_console()
        console.print(f"[bold green]✓[/bold green] {message}")

    def print_info(self, message: str):
        """Print an info message."""
        console = self._get_console()
        console.print(f"[bold blue]ℹ[/bold blue] {message}")

    def print(self, message: str):
        """Print a regular message."""
        console = self._get_console()
        console.print(message)

    def print_f1_standings(self, standings: List[Dict]):
        """
        Print F1 driver standings in a formatted table.

        Args:
            standings: List of driver standing dictionaries
        """
        console = self._get_console()

        if not standings:
            console.print(f"[yellow]No F1 standings found[/yellow]")
            return

        console.print(f"\n[bold green]🏎️  F1 Driver Standings[/bold green]\n")

        table = Table(
            show_header=True,
            header_style="bold magenta",
            box=box.ROUNDED,
            expand=True
        )
        table.add_column("Pos", justify="center", style="yellow", width=5)
        table.add_column("Driver", style="cyan", no_wrap=True)
        table.add_column("Team", style="blue")
        table.add_column("Points", justify="center", style="green")

        for standing in standings:
            # Highlight top 3 positions
            pos = str(standing['position'])
            if pos == '1':
                pos = f"[bold gold1]🥇 {pos}[/bold gold1]"
            elif pos == '2':
                pos = f"[bold silver]🥈 {pos}[/bold silver]"
            elif pos == '3':
                pos = f"[bold orange3]🥉 {pos}[/bold orange3]"

            table.add_row(
                pos,
                standing['driver'],
                standing['team'],
                str(standing['points'])
            )

        console.print(table)

    def print_f1_races(self, races: List[Dict]):
        """
        Print F1 race schedule and results in a formatted table.

        Args:
            races: List of race dictionaries
        """
        console = self._get_console()

        if not races:
            console.print(f"[yellow]No F1 races found[/yellow]")
            return

        console.print(f"\n[bold green]🏁 F1 Race Schedule[/bold green]\n")

        table = Table(
            show_header=True,
            header_style="bold magenta",
            box=box.ROUNDED,
            expand=True
        )
        table.add_column("Race", style="cyan")
        table.add_column("Date", style="dim")
        table.add_column("Location", style="blue")
        table.add_column("Status", style="green")
        table.add_column("Winner", style="yellow")

        for race in races:
            # Format winner column
            winner = race.get('winner', 'TBD')
            if winner == 'TBD':
                winner = f"[dim]{winner}[/dim]"
            elif winner != 'N/A':
                winner = f"[bold green]{winner}[/bold green]"

            table.add_row(
                race['name'],
                race['date'],
                race['location'],
                race['status'],
                winner
            )

        console.print(table)

    def print_nba_standings(self, standings: Dict[str, List[Dict]]):
        """
        Print NBA standings for both conferences in formatted tables.

        Args:
            standings: Dictionary mapping conference names to team standings
        """
        console = self._get_console()

        if not standings:
            console.print(f"[yellow]No NBA standings found[/yellow]")
            return

        # Print each conference
        for conf_name, teams in standings.items():
            if not teams:
                continue

            console.print(f"\n[bold green]🏀 {conf_name}[/bold green]\n")

            table = Table(
                show_header=True,
                header_style="bold magenta",
                box=box.ROUNDED,
                expand=True
            )
            table.add_column("Rank", justify="center", style="yellow", width=6)
            table.add_column("Team", style="cyan")
            table.add_column("W", justify="center", style="green", width=5)
            table.add_column("L", justify="center", style="red", width=5)
            table.add_column("PCT", justify="center", style="blue", width=7)
            table.add_column("GB", justify="center", style="dim", width=6)
            table.add_column("STRK", justify="center", style="yellow", width=7)

            for team in teams:
                # Highlight top 6 positions (playoff spots)
                rank = str(team['rank'])
                if team['rank'] <= 6:
                    rank = f"[bold]{rank}[/bold]"

                table.add_row(
                    rank,
                    team['team'],
                    team['wins'],
                    team['losses'],
                    team['win_pct'],
                    team['games_back'],
                    team['streak']
                )

            console.print(table)

    def print_mlb_standings(self, standings: Dict[str, List[Dict]]):
        """
        Print MLB standings for both leagues in formatted tables.

        Args:
            standings: Dictionary mapping league names to team standings
        """
        console = self._get_console()

        if not standings:
            console.print(f"[yellow]No MLB standings found[/yellow]")
            return

        # Print each league
        for league_name, teams in standings.items():
            if not teams:
                continue

            console.print(f"\n[bold green]⚾ {league_name}[/bold green]\n")

            table = Table(
                show_header=True,
                header_style="bold magenta",
                box=box.ROUNDED,
                expand=True
            )
            table.add_column("Rank", justify="center", style="yellow", width=6)
            table.add_column("Team", style="cyan")
            table.add_column("W", justify="center", style="green", width=5)
            table.add_column("L", justify="center", style="red", width=5)
            table.add_column("PCT", justify="center", style="blue", width=7)
            table.add_column("GB", justify="center", style="dim", width=6)
            table.add_column("STRK", justify="center", style="yellow", width=7)

            for team in teams:
                # Highlight top 5 positions (playoff contenders)
                rank = str(team['rank'])
                if team['rank'] <= 5:
                    rank = f"[bold]{rank}[/bold]"

                table.add_row(
                    rank,
                    team['team'],
                    team['wins'],
                    team['losses'],
                    team['win_pct'],
                    team['games_back'],
                    team['streak']
                )

            console.print(table)

    def print_soccer_standings(self, standings: List[Dict], league_name: str = "Premier League"):
        """
        Print soccer league standings in a formatted table.

        Args:
            standings: List of team standings
            league_name: Name of the league (e.g., "Premier League", "La Liga")
        """
        console = self._get_console()

        if not standings:
            console.print(f"[yellow]No {league_name} standings found[/yellow]")
            return

        console.print(f"\n[bold green]⚽ {league_name} Standings[/bold green]\n")

        table = Table(
            show_header=True,
            header_style="bold magenta",
            box=box.ROUNDED,
            expand=True
        )
        table.add_column("Pos", justify="center", style="yellow", width=5)
        table.add_column("Team", style="cyan")
        table.add_column("P", justify="center", style="dim", width=4)
        table.add_column("W", justify="center", style="green", width=4)
        table.add_column("D", justify="center", style="blue", width=4)
        table.add_column("L", justify="center", style="red", width=4)
        table.add_column("GD", justify="center", style="magenta", width=5)
        table.add_column("PTS", justify="center", style="yellow", width=5)

        for team in standings:
            # Highlight top 4 positions (Champions League spots)
            rank = team['rank']
            if int(rank) <= 4:
                rank = f"[bold]{rank}[/bold]"

            # Color code goal difference
            gd = team['goal_diff']
            try:
                gd_num = int(gd)
                if gd_num > 0:
                    gd = f"[green]+{gd_num}[/green]"
                elif gd_num < 0:
                    gd = f"[red]{gd_num}[/red]"
            except ValueError:
                pass

            table.add_row(
                rank,
                team['team'],
                team['played'],
                team['wins'],
                team['draws'],
                team['losses'],
                gd,
                team['points']
            )

        console.print(table)

    def print_props_dashboard(self, props: List[Any], sport: str = "nfl"):
        """
        Print the custom player props dashboard in a formatted table.

        Expects objects with at least:
          - id, player_name, team_name, market_type, line, side
          - current_value, game_state, prop_status, game_label
        """
        console = self._get_console()

        if not props:
            console.print("[yellow]No props to display.[/yellow]")
            return

        # Determine sport from first prop if not provided, though usually it's homogeneous
        display_sport = sport.upper() if sport else "Props"
        if not sport and props:
            display_sport = props[0].sport.upper()

        console.print(f"\n[bold green]📊 {display_sport} Player Props Dashboard[/bold green]\n")

        table = Table(
            show_header=True,
            header_style="bold magenta",
            box=box.ROUNDED,
            expand=True,
        )
        table.add_column("ID", justify="center", style="yellow", width=4)
        table.add_column("Player", style="cyan")
        table.add_column("Team", style="cyan")
        table.add_column("Market", style="blue")
        table.add_column("Line", justify="right", style="yellow")
        table.add_column("Current", justify="right", style="green")
        table.add_column("Game State", style="dim")
        table.add_column("Status", style="magenta")
        table.add_column("Game", style="white")

        status_labels = {
            "pending": "[dim]PENDING[/dim]",
            "live_hit": "[bold green]HIT (LIVE)[/bold green]",
            "live_miss": "[bold yellow]LIVE[/bold yellow]",
            "won": "[bold green]HIT (WON)[/bold green]",
            "lost": "[bold red]MISS (LOST)[/bold red]",
            "push": "[bold blue]PUSH[/bold blue]",
            "unavailable": "[dim]DATA UNAVAILABLE[/dim]",
        }

        state_labels = {
            "pre": "Pre-game",
            "in": "In progress",
            "post": "Final",
            "final": "Final",
            "unknown": "Unknown",
        }

        for p in props:
            market_readable = p.market_type.replace("_", " ")
            line_str = f"{p.line:.1f}"

            if p.current_value is None:
                current_str = "[dim]N/A[/dim]"
            elif hasattr(p, "current_value_str") and p.current_value_str:
                current_str = p.current_value_str
            elif p.market_type == "double_double":
                 current_str = "Yes" if p.current_value >= 1.0 else "No"
            else:
                current_str = f"{p.current_value:.1f}"

            # If game is over but we have stats, show WON/LOST instead of just status
            # The prop_status field handles this logic (won/lost vs live_above/live_below)
            
            # Use detailed status text (e.g. "5:09 - 2nd") if available, otherwise fallback to generic state
            if hasattr(p, "game_status_text") and p.game_status_text:
                game_state = p.game_status_text
            else:
                game_state = state_labels.get(p.game_state, p.game_state)

            # Adjust time zone display if game_state contains time info
            # Assuming format might be "11/25 - 11:00 PM EST"
            # We want to display PST first if possible, or convert/append PST
            # For simplicity, if we see "EST" or "EDT", we'll try to add PST/PDT or swap.
            # But typically this string comes from the fetcher logic.
            # If the source string is just "11/25 - 11:00 PM EST", let's try to make it "11/25 - 08:00 PM PST / 11:00 PM EST"
            
            # Simple heuristic replacement for now since we don't have full datetime objects here easily
            # (The prop object stores pre-formatted strings for game_status_text usually)
            
            # Actually, looking at the user request: "let's set the game state as pst first, and est second."
            # The example output shows: "11/25 - 11:00 PM EST" in the Game State column.
            # This string likely comes from `game_status_text` which is set in `props_dashboard.py` from `_game_status_detail` in `sports_fetcher.py`.
            
            # Let's inspect sports_fetcher.py to see where this string is constructed first.
            # But if we modify it here in presentation layer it's safer.
            
            if "EST" in game_state or "EDT" in game_state:
                 # Try to parse time and convert. 
                 # Since this is a string manipulation without datetime context, it might be brittle.
                 # Let's try to fix it at the source in sports_fetcher.py instead for robustness.
                 pass

            status = status_labels.get(p.prop_status, p.prop_status.upper())

            table.add_row(
                str(p.id),
                p.player_name,
                p.team_name or "-",
                f"{p.side} {market_readable}",
                line_str,
                current_str,
                game_state,
                status,
                p.game_label,
            )

        console.print(table)
