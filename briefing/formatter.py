"""
Output formatting utilities for the CLI.
"""

import os
import sys
from typing import List, Dict
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

        console.print(f"\n[bold green]🏆 {sport.upper()} Scores[/bold green]\n")

        table = Table(
            show_header=True,
            header_style="bold magenta",
            box=box.ROUNDED,
            expand=True  # Expand to full width
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

            table.add_row(
                game['away_team'],
                score_display,
                game['home_team'],
                game['status'],
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

                table.add_row(
                    game['away_team'],
                    score_display,
                    game['home_team'],
                    f"🔴 {game['status']}",
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
