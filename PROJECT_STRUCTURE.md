# Briefing - Project Structure

## Directory Layout

```
cli-tool/
├── briefing/                    # Main package directory
│   ├── __init__.py             # Package initialization (version info)
│   ├── __main__.py             # Module entry point (python -m briefing)
│   ├── cli.py                  # CLI interface and argument parsing
│   ├── config.py               # Configuration management
│   ├── formatter.py            # Output formatting with Rich
│   ├── news_fetcher.py         # RSS news fetcher
│   └── sports_fetcher.py       # ESPN sports data fetcher
├── config.example.json         # Example configuration file
├── requirements.txt            # Python dependencies
├── setup.py                    # Package installation script
├── .gitignore                  # Git ignore rules
├── LICENSE                     # MIT License
├── README.md                   # Comprehensive documentation
├── QUICKSTART.md               # Quick start guide
├── PROJECT_STRUCTURE.md        # This file
└── test_briefing.sh            # Test script for functionality
```

## Module Descriptions

### briefing/__init__.py
- Package initialization
- Version information
- Package metadata

### briefing/__main__.py
- Allows running as a module: `python -m briefing`
- Calls main() from cli.py

### briefing/cli.py (200 lines)
**Main CLI interface**
- Argument parsing with argparse
- Command routing (news, sports, all)
- User-friendly help messages
- Error handling

**Key Functions:**
- `create_parser()` - Sets up argument parser
- `handle_news_command()` - Processes news requests
- `handle_sports_command()` - Processes sports requests
- `handle_all_command()` - Comprehensive briefing
- `main()` - Entry point

### briefing/config.py (128 lines)
**Configuration management**
- Load/save user preferences
- XDG config directory support
- Fallback to home directory
- Default configuration
- Dot notation access (e.g., 'news.default_sources')

**Key Features:**
- Auto-creates config directory
- Merges user config with defaults
- Graceful fallback on permission errors
- JSON-based configuration

### briefing/news_fetcher.py (138 lines)
**RSS news fetcher**
- Fetches and parses RSS feeds
- Built-in popular sources (BBC, CNN, NYTimes, etc.)
- Custom URL support
- Retry logic for reliability
- HTML cleaning and text formatting

**Key Features:**
- 6 pre-configured news sources
- Supports custom RSS URLs
- Automatic retry on failures
- HTML tag removal
- Date parsing and formatting
- Summary truncation (200 chars)

**Default Sources:**
- BBC News
- CNN Top Stories
- New York Times
- The Guardian
- Al Jazeera
- TechCrunch
- Hacker News

### briefing/sports_fetcher.py (158 lines)
**ESPN sports data fetcher**
- Fetches scores from ESPN JSON API
- Fetches sports news
- 7 supported sports leagues
- Game status tracking
- Date/time parsing

**Key Features:**
- Real-time scores
- Game status (scheduled, in-progress, completed)
- Winner highlighting
- Sports news articles
- Configurable result limits

**Supported Sports:**
- NFL, NBA, MLB, NHL
- Soccer (Premier League)
- NCAA Football
- NCAA Basketball

### briefing/formatter.py (155 lines)
**Output formatting utilities**
- Rich terminal formatting
- Color support
- Tables for scores
- Panels for news articles
- Status messages (info, error, warning, success)

**Key Features:**
- Beautiful tables with borders
- Colored panels
- Winner highlighting in scores
- Clickable links
- Conditional color support
- Responsive layout

## Configuration System

### Config File Locations (in order of preference)
1. Custom path (if specified)
2. `$XDG_CONFIG_HOME/briefing/config.json`
3. `~/.config/briefing/config.json`
4. `~/.briefing_config.json` (fallback)

### Configuration Schema
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

## Dependencies

### Runtime Dependencies
- **feedparser** (>=6.0.10) - RSS feed parsing
- **requests** (>=2.31.0) - HTTP requests
- **urllib3** (>=2.0.0) - HTTP client
- **rich** (>=13.7.0) - Terminal formatting
- **python-dateutil** (>=2.8.2) - Date parsing

### Python Version
- Python 3.8 or higher

## Installation Methods

### 1. Development Install (Editable)
```bash
pip install -e .
```
- Changes to code are immediately reflected
- Good for development and testing

### 2. Regular Install
```bash
pip install .
```
- Installs as a regular package
- Use for production deployment

### 3. From Requirements
```bash
pip install -r requirements.txt
python -m briefing
```
- Installs dependencies only
- Run as a module

## Command Structure

### Top-Level Commands
```
briefing [--version] [--no-color] [--no-links] {news,sports,all}
```

### News Command
```
briefing news [--sources SOURCE [SOURCE ...]] [--list-sources]
```

### Sports Command
```
briefing sports --sport SPORT [--scores] [--news] [--limit N] [--list-sports]
```

### All Command
```
briefing all
```

## Testing

### Run Test Script
```bash
./test_briefing.sh
```

### Manual Testing
```bash
# Test news
briefing news --sources bbc

# Test sports
briefing sports --sport nfl --scores

# Test all
briefing all

# Test help
briefing --help
briefing news --help
briefing sports --help
```

## Error Handling

### Network Errors
- Automatic retry logic (3 attempts)
- Exponential backoff
- Graceful error messages

### Permission Errors
- Fallback config locations
- Continue with defaults

### Data Parsing Errors
- Skip malformed entries
- Warning messages
- Continue processing

### User Input Errors
- Clear error messages
- Suggestions for correction
- Help text references

## Extension Points

### Adding New News Sources
Edit `news_fetcher.py`:
```python
DEFAULT_FEEDS = {
    'newsource': 'https://example.com/feed.rss',
}
```

### Adding New Sports
Edit `sports_fetcher.py`:
```python
SPORTS = {
    'newsport': 'path/to/sport',
}
```

### Custom Formatters
Extend `OutputFormatter` class in `formatter.py`

## Future Enhancements

Potential additions:
- [ ] Weather information
- [ ] Stock market data
- [ ] Cryptocurrency prices
- [ ] Calendar integration
- [ ] Email delivery
- [ ] Interactive TUI
- [ ] Saved searches
- [ ] Export to PDF/HTML
- [ ] Notification system
- [ ] Plugin architecture

## Performance Considerations

- **Parallel Requests**: Could implement concurrent fetching for multiple sources
- **Caching**: Could add response caching to reduce API calls
- **Rate Limiting**: Built-in retry logic prevents hammering APIs
- **Timeout Handling**: All requests have configurable timeouts

## Security Considerations

- No API keys required
- Public endpoints only
- No user data collection
- Local config storage
- No network exposure
- Safe HTML parsing

## License

MIT License - See LICENSE file

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Version**: 1.0.0
**Last Updated**: November 2025
**Python**: 3.8+
**Status**: Production Ready
