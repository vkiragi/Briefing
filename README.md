# Briefing 📰🏆

A robust, user-friendly CLI tool for fetching news summaries from RSS feeds and sports updates from ESPN's public APIs. Stay informed with your daily briefing right in your terminal!

## Features

- **News Summaries**: Fetch news from multiple RSS sources (BBC, CNN, NYTimes, The Guardian, Al Jazeera, TechCrunch, Hacker News, and more)
- **Sports Updates**: Get scores and news for NFL, NBA, MLB, NHL, Soccer, NCAA Football, and NCAA Basketball
- **Beautiful Output**: Rich formatting with colors, tables, and panels for easy reading
- **Configurable**: Customize default sources and preferences
- **Robust Error Handling**: Retry logic and graceful error recovery
- **No API Keys Required**: Uses public RSS feeds and ESPN's public JSON endpoints

## Installation

### Using pip (Recommended)

```bash
pip install -e .
```

### From Source

```bash
# Clone the repository
git clone https://github.com/vkiragi/briefing.git
cd briefing

# Install dependencies
pip install -r requirements.txt

# Install the package
pip install -e .
```

### Using a Virtual Environment (Recommended)

```bash
# Create a virtual environment
python -m venv venv

# Activate it
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install the package
pip install -e .
```

## Quick Start

```bash
# Get news from default sources (BBC, CNN)
briefing news

# Get NFL scores
briefing sports --sport nfl --scores

# Get NBA news
briefing sports --sport nba --news

# Get everything (news + sports)
briefing all

# List available news sources
briefing news --list-sources

# List available sports
briefing sports --list-sports
```

## Usage

### News Command

Fetch news summaries from RSS feeds:

```bash
# Fetch from default sources
briefing news

# Fetch from specific sources
briefing news --sources bbc cnn techcrunch

# List available sources
briefing news --list-sources

# Disable colored output
briefing news --no-color

# Hide article links
briefing news --no-links
```

**Available News Sources:**
- `bbc` - BBC News
- `cnn` - CNN Top Stories
- `nytimes` - New York Times
- `guardian` - The Guardian
- `aljazeera` - Al Jazeera
- `techcrunch` - TechCrunch
- `hackernews` - Hacker News

You can also use custom RSS feed URLs:
```bash
briefing news --sources https://example.com/feed.rss
```

### Sports Command

Fetch sports scores and news from ESPN:

```bash
# Get NFL scores (default)
briefing sports --sport nfl

# Get both scores and news
briefing sports --sport nba --scores --news

# Get only news
briefing sports --sport mlb --news

# Limit number of results
briefing sports --sport nhl --scores --limit 5

# Get only live/in-progress games
briefing sports --sport nfl --live

# Auto-refresh live scores every 5 seconds (default)
briefing sports --sport nba --live --watch

# Auto-refresh live scores with custom interval (in seconds)
briefing sports --sport mlb --live --watch 10

# List available sports
briefing sports --list-sports
```

**Live Score Tracking:**

The `--live` flag shows only games that are currently in progress. Combine it with `--watch` for real-time auto-refreshing scores:

- `--live` - Show only live/in-progress games
- `--watch` - Auto-refresh every 5 seconds (default)
- `--watch N` - Auto-refresh every N seconds (e.g., `--watch 10` for 10-second intervals)

Press `Ctrl+C` to stop the live watch mode.

**Available Sports:**
- `nfl` - National Football League
- `nba` - National Basketball Association
- `mlb` - Major League Baseball
- `nhl` - National Hockey League
- `soccer` - Premier League
- `ncaaf` - NCAA Football
- `ncaab` - NCAA Basketball

### All Command

Get a comprehensive briefing with both news and sports:

```bash
briefing all
```

This fetches:
- News from your default sources
- Scores from your default sports

## Configuration

Briefing uses a configuration file to store your preferences. The config file is located at:
- Linux/macOS: `~/.config/briefing/config.json`
- Windows: `%APPDATA%\briefing\config.json`

### Default Configuration

```json
{
  "news": {
    "default_sources": ["bbc", "cnn"],
    "timeout": 10
  },
  "sports": {
    "default_sports": ["nfl", "nba"],
    "timeout": 10
  },
  "display": {
    "use_color": true,
    "show_links": true
  }
}
```

### Customizing Configuration

Edit the config file to change default sources, sports, and display preferences:

```json
{
  "news": {
    "default_sources": ["bbc", "techcrunch", "hackernews"],
    "timeout": 15
  },
  "sports": {
    "default_sports": ["nfl", "nba", "mlb"],
    "timeout": 15
  },
  "display": {
    "use_color": true,
    "show_links": false
  }
}
```

## Examples

### Morning Briefing Routine

```bash
# Get your morning briefing with tech news and sports
briefing news --sources bbc techcrunch
briefing sports --sport nfl --scores
briefing sports --sport nba --scores
```

### Follow a Specific Sport

```bash
# Get comprehensive NBA updates
briefing sports --sport nba --scores --news --limit 15
```

### Track Live Games

```bash
# Watch live NFL games with auto-refresh
briefing sports --sport nfl --live --watch

# Track live NBA games refreshing every 10 seconds
briefing sports --sport nba --live --watch 10

# Check live games once (no auto-refresh)
briefing sports --sport mlb --live
```

### Quick News Check

```bash
# Quick news from multiple sources
briefing news --sources bbc cnn guardian --no-links
```

### Create an Alias

Add to your `.bashrc` or `.zshrc`:

```bash
alias morning="briefing all"
alias nfl="briefing sports --sport nfl --scores --news"
alias news="briefing news --sources bbc techcrunch"
```

## Development

### Project Structure

```
briefing/
├── briefing/
│   ├── __init__.py         # Package initialization
│   ├── __main__.py         # Module entry point
│   ├── cli.py              # CLI interface and argument parsing
│   ├── config.py           # Configuration management
│   ├── news_fetcher.py     # RSS news fetcher
│   ├── sports_fetcher.py   # ESPN sports fetcher
│   └── formatter.py        # Output formatting utilities
├── requirements.txt        # Python dependencies
├── setup.py               # Package setup
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

### Running Tests

```bash
# Run the CLI directly with Python
python -m briefing news

# Test news fetching
python -m briefing news --sources bbc

# Test sports fetching
python -m briefing sports --sport nfl --scores
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Issue: Command not found after installation

**Solution:** Make sure your Python scripts directory is in your PATH:
```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$HOME/.local/bin:$PATH"
```

### Issue: RSS feed fails to fetch

**Solution:** Some RSS feeds may be temporarily unavailable or require specific user agents. The tool includes retry logic, but you can try:
- Checking your internet connection
- Using a different news source
- Waiting a few minutes and trying again

### Issue: Sports data not showing

**Solution:**
- Ensure the sport is spelled correctly (use `--list-sports`)
- Some sports may not have active games during off-season
- Check if ESPN's API is accessible from your location

### Issue: Colors not displaying

**Solution:**
- Make sure your terminal supports ANSI colors
- Try using a different terminal emulator
- Use the `--no-color` flag if colors are causing issues

## Requirements

- Python 3.8 or higher
- Internet connection
- Terminal with color support (optional)

## Dependencies

- `feedparser` - RSS feed parsing
- `requests` - HTTP requests
- `rich` - Beautiful terminal formatting
- `python-dateutil` - Date parsing
- `urllib3` - HTTP client

## License

MIT License - see LICENSE file for details

## Acknowledgments

- RSS feeds provided by respective news organizations
- Sports data from ESPN's public JSON endpoints
- Terminal formatting powered by [Rich](https://github.com/Textualize/rich)

## Future Enhancements

Potential features for future versions:
- Weather information
- Stock market updates
- Cryptocurrency prices
- Calendar integration
- Email delivery of briefings
- Custom feed priorities
- Saved searches
- Historical data
- Interactive TUI mode

## Support

For issues, questions, or contributions, please visit:
- GitHub Issues: https://github.com/vkiragi/briefing/issues
- Documentation: https://github.com/vkiragi/briefing/wiki

---

**Made with ❤️ for terminal enthusiasts**
