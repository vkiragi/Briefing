"""
Main CLI interface for Briefing.
"""

import argparse
import sys
from typing import List, Optional

from .news_fetcher import NewsFetcher
from .sports_fetcher import SportsFetcher
from .formatter import OutputFormatter
from .config import Config
from . import __version__


def create_parser() -> argparse.ArgumentParser:
    """Create and configure the argument parser."""
    parser = argparse.ArgumentParser(
        prog='briefing',
        description='Briefing - Get your daily news and sports summaries',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  briefing news --sources bbc cnn          # Get news from BBC and CNN
  briefing sports --sport nfl --scores     # Get NFL scores
  briefing sports --sport nfl --schedule   # Get NFL upcoming schedule
  briefing sports --sport nba --news       # Get NBA news
  briefing sports --sport f1 --standings   # Get F1 driver standings
  briefing sports --sport f1 --races       # Get F1 race schedule
  briefing all                              # Get everything (news + sports)
  briefing news --list-sources              # List available news sources
  briefing sports --list-sports             # List available sports
        """
    )

    parser.add_argument(
        '--version',
        action='version',
        version=f'%(prog)s {__version__}'
    )

    parser.add_argument(
        '--no-color',
        action='store_true',
        help='Disable colored output'
    )

    parser.add_argument(
        '--no-links',
        action='store_true',
        help='Hide article links'
    )

    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    # News command
    news_parser = subparsers.add_parser('news', help='Fetch news summaries')
    news_parser.add_argument(
        '--sources',
        nargs='+',
        help='News sources to fetch (default: bbc, cnn)'
    )
    news_parser.add_argument(
        '--list-sources',
        action='store_true',
        help='List available news sources'
    )

    # Sports command
    sports_parser = subparsers.add_parser('sports', help='Fetch sports information')
    sports_parser.add_argument(
        '--sport',
        help='Sport to fetch (e.g., nfl, nba, mlb)'
    )
    sports_parser.add_argument(
        '--scores',
        action='store_true',
        help='Fetch scores'
    )
    sports_parser.add_argument(
        '--news',
        action='store_true',
        help='Fetch sports news'
    )
    sports_parser.add_argument(
        '--list-sports',
        action='store_true',
        help='List available sports'
    )
    sports_parser.add_argument(
        '--limit',
        type=int,
        default=10,
        help='Number of items to fetch (default: 10)'
    )
    sports_parser.add_argument(
        '--standings',
        action='store_true',
        help='Fetch F1 driver standings (F1 only)'
    )
    sports_parser.add_argument(
        '--races',
        action='store_true',
        help='Fetch F1 race schedule and results (F1 only)'
    )
    sports_parser.add_argument(
        '--schedule',
        action='store_true',
        help='Fetch upcoming games schedule'
    )
    sports_parser.add_argument(
        '--live',
        action='store_true',
        help='Fetch only live/in-progress games'
    )
    sports_parser.add_argument(
        '--watch',
        type=int,
        nargs='?',
        const=5,
        metavar='SECONDS',
        help='Auto-refresh live scores every N seconds (default: 5)'
    )

    # All command
    subparsers.add_parser('all', help='Fetch both news and sports')

    # Props command - custom player props dashboard (NFL, NBA)
    props_parser = subparsers.add_parser('props', help='Custom player props dashboard (NFL, NBA)')
    props_parser.add_argument(
        '--sport',
        default=None,
        help='Sport to track props for (nfl, nba)'
    )

    # Help command
    subparsers.add_parser('help', help='Show quick start guide and examples')

    return parser


def handle_news_command(args, formatter: OutputFormatter, config: Config):
    """Handle the news command."""
    news_fetcher = NewsFetcher()

    if args.list_sources:
        sources = news_fetcher.list_default_sources()
        formatter.print_info("Available news sources:")
        for source in sources:
            formatter.print(f"  • {source}")
        return

    sources = args.sources or config.get('news.default_sources', ['bbc', 'cnn'])

    formatter.print_info(f"Fetching news from: {', '.join(sources)}")

    try:
        news_data = news_fetcher.fetch_multiple_feeds(sources)
        formatter.print_news(news_data, show_links=not args.no_links)
    except Exception as e:
        formatter.print_error(f"Failed to fetch news: {str(e)}")
        sys.exit(1)


def handle_sports_command(args, formatter: OutputFormatter, config: Config):
    """Handle the sports command."""
    sports_fetcher = SportsFetcher()

    if args.list_sports:
        sports = sports_fetcher.list_available_sports()
        formatter.print_info("Available sports:")
        for sport in sports:
            formatter.print(f"  • {sport}")
        return

    if not args.sport:
        formatter.print_error("Please specify a sport with --sport")
        formatter.print_info("Use --list-sports to see available options")
        sys.exit(1)

    sport = args.sport.lower()

    # Handle F1-specific commands
    if sport == 'f1':
        try:
            if args.standings:
                formatter.print_info("Fetching F1 driver standings...")
                standings = sports_fetcher.fetch_f1_standings()
                formatter.print_f1_standings(standings)
                return

            if args.races:
                formatter.print_info("Fetching F1 race schedule...")
                # For F1 races, fetch all races by default (pass None as limit)
                races = sports_fetcher.fetch_f1_races(limit=None)
                formatter.print_f1_races(races)
                return

        except Exception as e:
            formatter.print_error(f"Failed to fetch F1 data: {str(e)}")
            sys.exit(1)

    # Handle NBA-specific commands
    if sport == 'nba':
        try:
            if args.standings:
                formatter.print_info("Fetching NBA standings...")
                standings = sports_fetcher.fetch_nba_standings()
                formatter.print_nba_standings(standings)
                return

        except Exception as e:
            formatter.print_error(f"Failed to fetch NBA data: {str(e)}")
            sys.exit(1)

    # Handle MLB-specific commands
    if sport == 'mlb':
        try:
            if args.standings:
                formatter.print_info("Fetching MLB standings...")
                standings = sports_fetcher.fetch_mlb_standings()
                formatter.print_mlb_standings(standings)
                return

        except Exception as e:
            formatter.print_error(f"Failed to fetch MLB data: {str(e)}")
            sys.exit(1)

    # Handle Soccer-specific commands (all soccer leagues)
    if sport in ['soccer', 'epl', 'laliga', 'ucl', 'europa']:
        try:
            if args.standings:
                league_names = {
                    'soccer': 'Premier League',
                    'epl': 'Premier League',
                    'laliga': 'La Liga',
                    'ucl': 'Champions League',
                    'europa': 'Europa League'
                }
                league_name = league_names.get(sport, 'Premier League')
                formatter.print_info(f"Fetching {league_name} standings...")
                standings = sports_fetcher.fetch_soccer_standings(league=sport)
                formatter.print_soccer_standings(standings, league_name=league_name)
                return

        except Exception as e:
            formatter.print_error(f"Failed to fetch soccer data: {str(e)}")
            sys.exit(1)

    # Handle schedule command
    if args.schedule:
        try:
            formatter.print_info(f"Fetching {sport.upper()} schedule...")
            games = sports_fetcher.fetch_schedule(sport, limit=args.limit)
            formatter.print_schedule(sport, games)
            return
        except Exception as e:
            formatter.print_error(f"Failed to fetch {sport} schedule: {str(e)}")
            sys.exit(1)

    # Handle live command
    if args.live:
        try:
            # Watch mode - auto-refresh
            if args.watch:
                import os
                import time
                from datetime import datetime

                refresh_interval = args.watch
                formatter.print_info(f"Starting live watch mode (refreshing every {refresh_interval} seconds)")
                formatter.print_info("Press Ctrl+C to stop\n")

                try:
                    while True:
                        # Clear the screen
                        os.system('clear' if os.name != 'nt' else 'cls')

                        # Show current time and refresh info
                        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        formatter.print_info(f"🔄 Last updated: {now} | Refreshing every {refresh_interval}s | Press Ctrl+C to stop")

                        # Fetch and display live scores
                        games = sports_fetcher.fetch_live(sport, limit=args.limit)
                        formatter.print_live_scores(sport, games)

                        # Wait before next refresh
                        time.sleep(refresh_interval)

                except KeyboardInterrupt:
                    formatter.print_info("\n\n✋ Watch mode stopped by user")
                    sys.exit(0)
            else:
                # Single fetch mode
                formatter.print_info(f"Fetching {sport.upper()} live games...")
                games = sports_fetcher.fetch_live(sport, limit=args.limit)
                formatter.print_live_scores(sport, games)
            return
        except Exception as e:
            formatter.print_error(f"Failed to fetch {sport} live games: {str(e)}")
            sys.exit(1)

    # Default to scores if neither scores nor news is specified
    if not args.scores and not args.news and not args.live:
        args.scores = True

    try:
        if args.scores:
            formatter.print_info(f"Fetching {sport.upper()} scores...")
            games = sports_fetcher.fetch_scores(sport, limit=args.limit)
            formatter.print_sports_scores(sport, games)

        if args.news:
            formatter.print_info(f"Fetching {sport.upper()} news...")
            news_items = sports_fetcher.fetch_news(sport, limit=args.limit)
            formatter.print_sports_news(sport, news_items, show_links=not args.no_links)

    except Exception as e:
        formatter.print_error(f"Failed to fetch sports data: {str(e)}")
        sys.exit(1)


def handle_props_command(args, formatter: OutputFormatter, config: Config):
    """
    Handle the props command - enter interactive custom props dashboard mode.

    Supports NFL and NBA player props and keeps all props in memory
    for the duration of the session.
    """
    from .props_dashboard import PropsDashboard, add_prop_interactively, remove_prop_interactively

    sport_arg = args.sport.lower() if args.sport else None
    
    sport = sport_arg
    
    if not sport:
        formatter.print("\n[bold cyan]Select Sport for Props Dashboard[/bold cyan]")
        formatter.print("  1) NFL")
        formatter.print("  2) NBA")
        
        while True:
            choice = input("\nSelect a sport (1-2): ").strip()
            if choice == '1':
                sport = 'nfl'
                break
            elif choice == '2':
                sport = 'nba'
                break
            else:
                formatter.print_warning("Invalid choice. Please enter 1 or 2.")
    
    if sport not in ['nfl', 'nba']:
        formatter.print_error("The props dashboard currently supports only NFL and NBA.")
        sys.exit(1)

    formatter.print_info(f"Entering custom {sport.upper()} props dashboard (session-only, no persistence).")
    formatter.print(f"Use this mode to track player props for {sport.upper()}.")

    sports_fetcher = SportsFetcher()
    dashboard = PropsDashboard(sport=sport)

    while True:
        formatter.print("\n[bold cyan]Props Dashboard Menu[/bold cyan]")
        formatter.print("  1) Add prop")
        formatter.print("  2) Watch dashboard (auto-refresh)")
        formatter.print("  3) Remove prop")
        formatter.print("  4) Quit\n")
        
        try:
            choice = input("Select an option (1-4): ").strip()
        except (EOFError, KeyboardInterrupt):
            formatter.print_info("\nExiting props dashboard.")
            break

        if choice == '1':
            # Add a new prop
            try:
                add_prop_interactively(dashboard, sports_fetcher, formatter)
                # Auto-refresh and show dashboard after adding
                dashboard.refresh_props(sports_fetcher)
                formatter.print_props_dashboard(dashboard.props, sport=sport)
            except Exception as e:
                formatter.print_error(f"Failed to add prop: {str(e)}")

        elif choice == '2':
            # Watch dashboard (auto-refresh)
            try:
                if not dashboard.props:
                    formatter.print_info("No props added yet. Choose option 1 to add your first prop.")
                    continue

                import time
                import os
                from datetime import datetime

                formatter.print_info("Starting auto-refresh (every 10s). Press Ctrl+C to stop.")
                time.sleep(1.5)

                try:
                    while True:
                        os.system('clear' if os.name != 'nt' else 'cls')
                        
                        # Refresh logic
                        dashboard.refresh_props(sports_fetcher)
                        
                        now = datetime.now().strftime("%H:%M:%S")
                        formatter.print(f"[dim]Last updated: {now} (Refreshing every 10s)[/dim]")
                        
                        formatter.print_props_dashboard(dashboard.props, sport=sport)
                        
                        formatter.print("\n[bold yellow]Press Ctrl+C to return to menu[/bold yellow]")
                        time.sleep(10)
                except KeyboardInterrupt:
                    formatter.print_info("\nStopped watching.")
            except Exception as e:
                formatter.print_error(f"Failed to refresh props dashboard: {str(e)}")

        elif choice == '3':
            # Remove a prop
            try:
                if not dashboard.props:
                    formatter.print_info("No props to remove.")
                    continue

                remove_prop_interactively(dashboard, formatter)
            except Exception as e:
                formatter.print_error(f"Failed to remove prop: {str(e)}")

        elif choice == '4':
            formatter.print_info("Good luck with your bets! Exiting props dashboard.")
            break
        else:
            formatter.print_warning("Invalid choice. Please enter a number between 1 and 4.")


def handle_help_command(formatter: OutputFormatter):
    """Handle the help command - show quick start guide."""
    console = formatter._get_console()

    help_text = """
[bold cyan]📖 Briefing - Quick Start Guide[/bold cyan]

[bold yellow]NEWS COMMANDS:[/bold yellow]
  [green]briefing news[/green]                           Get news from default sources
  [green]briefing news --sources bbc cnn[/green]         Get news from specific sources
  [green]briefing news --list-sources[/green]            List all available news sources

[bold yellow]SPORTS COMMANDS:[/bold yellow]
  [green]briefing sports --sport nfl --scores[/green]    Get NFL scores
  [green]briefing sports --sport nba --scores[/green]    Get NBA scores
  [green]briefing sports --sport tennis-atp-singles --scores[/green] Get ATP men's singles scores
  [green]briefing sports --sport tennis-atp-doubles --scores[/green] Get ATP men's doubles scores
  [green]briefing sports --sport nfl --schedule[/green]  Get NFL upcoming schedule
  [green]briefing sports --sport nba --standings[/green] Get NBA standings (2025-26 season)
  [green]briefing sports --sport mlb --standings[/green] Get MLB standings (2025 season)
  [green]briefing sports --sport epl --standings[/green] Get Premier League standings (2025-26)
  [green]briefing sports --sport laliga --standings[/green] Get La Liga standings (2025-26)
  [green]briefing sports --sport ucl --standings[/green] Get Champions League standings (2025-26)
  [green]briefing sports --sport europa --standings[/green] Get Europa League standings (2025-26)
  [green]briefing sports --sport f1 --standings[/green]  Get F1 driver standings (2025 season)
  [green]briefing sports --sport f1 --races[/green]      Get F1 race schedule with winners
  [green]briefing sports --sport nfl --news[/green]      Get NFL news
  [green]briefing sports --list-sports[/green]           List all available sports

[bold yellow]OTHER COMMANDS:[/bold yellow]
  [green]briefing all[/green]                            Get comprehensive briefing (news + sports)
  [green]briefing props[/green]                          Enter custom NFL player props dashboard
  [green]briefing --version[/green]                      Show version information
  [green]briefing --no-color[/green]                     Disable colored output
  [green]briefing --no-links[/green]                     Hide article links

[bold yellow]AVAILABLE SPORTS:[/bold yellow]
  • nfl, nba, mlb, nhl, soccer, ncaaf, ncaab, f1
  • tennis-atp-singles, tennis-atp-doubles, tennis-wta-singles, tennis-wta-doubles

[bold yellow]AVAILABLE NEWS SOURCES:[/bold yellow]
  • bbc, cnn, nytimes, guardian, aljazeera, techcrunch, hackernews

[bold yellow]EXAMPLES:[/bold yellow]
  [dim]# Morning routine[/dim]
  [green]briefing news --sources bbc[/green]
  [green]briefing sports --sport nba --standings[/green]

  [dim]# F1 fan[/dim]
  [green]briefing sports --sport f1 --standings[/green]
  [green]briefing sports --sport f1 --races[/green]

  [dim]# Tennis fan[/dim]
  [green]briefing sports --sport tennis-atp-singles --scores[/green]
  [green]briefing sports --sport tennis-wta-singles --scores[/green]

  [dim]# Sports updates[/dim]
  [green]briefing sports --sport nfl --scores --news[/green]

[bold cyan]For more information, visit the documentation or check QUICKSTART.md[/bold cyan]
"""
    console.print(help_text)


def handle_all_command(args, formatter: OutputFormatter, config: Config):
    """Handle the all command - fetch everything."""
    formatter.print_info("Fetching comprehensive briefing...")

    # Fetch news
    news_fetcher = NewsFetcher()
    default_sources = config.get('news.default_sources', ['bbc', 'techcrunch'])

    try:
        news_data = news_fetcher.fetch_multiple_feeds(default_sources)
        formatter.print_news(news_data, show_links=not args.no_links)
    except Exception as e:
        formatter.print_warning(f"Failed to fetch news: {str(e)}")

    # Fetch sports
    sports_fetcher = SportsFetcher()
    default_sports = config.get('sports.default_sports', ['nfl', 'nba'])

    for sport in default_sports:
        try:
            formatter.print_info(f"Fetching {sport.upper()} updates...")
            games = sports_fetcher.fetch_scores(sport, limit=5)
            formatter.print_sports_scores(sport, games)
        except Exception as e:
            formatter.print_warning(f"Failed to fetch {sport} scores: {str(e)}")


def main():
    """Main entry point for the CLI."""
    parser = create_parser()
    args = parser.parse_args()

    # If no command is provided, show help
    if not args.command:
        parser.print_help()
        sys.exit(0)

    # Initialize formatter and config
    formatter = OutputFormatter(use_color=not args.no_color)
    config = Config()

    # Route to appropriate handler
    if args.command == 'news':
        handle_news_command(args, formatter, config)
    elif args.command == 'sports':
        handle_sports_command(args, formatter, config)
    elif args.command == 'all':
        handle_all_command(args, formatter, config)
    elif args.command == 'props':
        handle_props_command(args, formatter, config)
    elif args.command == 'help':
        handle_help_command(formatter)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
