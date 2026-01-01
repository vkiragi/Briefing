> **Note:** This documentation is for the CLI tool. The web app is now the primary interface. See the [root README](../README.md) for setup instructions.

# Briefing CLI - Quick Start Guide

## Installation (5 minutes)

### Step 1: Install the package

```bash
# From the project directory
pip install -e .
```

### Step 2: Verify installation

```bash
briefing --version
```

You should see: `briefing 1.0.0`

## Basic Usage

### Get News

```bash
# List available news sources
briefing news --list-sources

# Get news from default sources (BBC, CNN)
briefing news

# Get news from specific sources
briefing news --sources bbc techcrunch
```

### Get Sports Updates

```bash
# List available sports
briefing sports --list-sports

# Get NFL scores
briefing sports --sport nfl --scores

# Get NBA scores and news
briefing sports --sport nba --scores --news

# Get upcoming schedule for any sport
briefing sports --sport nfl --schedule
briefing sports --sport nba --schedule
briefing sports --sport epl --schedule

# Get NBA standings (2025-26 season)
briefing sports --sport nba --standings

# Get MLB standings (2025 season)
briefing sports --sport mlb --standings

# Get Premier League standings (2025-26 season)
briefing sports --sport epl --standings

# Get La Liga standings (2025-26 season)
briefing sports --sport laliga --standings

# Get Champions League standings (2025-26 season)
briefing sports --sport ucl --standings

# Get Europa League standings (2025-26 season)
briefing sports --sport europa --standings

# Get F1 driver standings (2025 season)
briefing sports --sport f1 --standings

# Get F1 race schedule with winners
briefing sports --sport f1 --races

# Limit results (for scores/news)
briefing sports --sport nfl --scores --limit 5

# Get live/in-progress games only
briefing sports --sport nba --live
briefing sports --sport nfl --live

# Watch mode - auto-refresh live scores every 5 seconds
briefing sports --sport nba --live --watch

# Watch mode with custom interval (X seconds)
briefing sports --sport nfl --live --watch {X}
```

### Track Custom NFL Player Props (Session-Only)

```bash
# Enter interactive player props dashboard (NFL only for now)
briefing props

# Inside this mode you can:
# 1) Add props like "Christian McCaffrey over 71.5 rushing yards"
# 2) Refresh to see current player stats and live win/loss status
# 3) Remove props you no longer want to track
```

### Track Custom NBA Player Props (Session-Only)

```bash
# Enter interactive player props dashboard for NBA
briefing props --sport nba

# Inside this mode you can:
# 1) Add props like "LeBron James over 25.5 points"
# 2) Track points, rebounds, assists, 3-pointers, etc.
# 3) Refresh to see live stats
```

### Get Everything

```bash
# Get comprehensive briefing (news + sports)
briefing all
```

## Configuration

Briefing uses a configuration file at `~/.config/briefing/config.json` (or `~/.briefing_config.json` as fallback).

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

### Customize Your Briefing

1. Copy the example config:

   ```bash
   cp config.example.json ~/.config/briefing/config.json
   ```

2. Edit to your preferences:

   ```bash
   nano ~/.config/briefing/config.json
   ```

3. Add your favorite sources and sports!

## Useful Aliases

Add these to your `~/.bashrc` or `~/.zshrc`:

```bash
# Quick morning briefing
alias morning="briefing all"

# Sports shortcuts
alias nfl="briefing sports --sport nfl --scores"
alias nba="briefing sports --sport nba --scores"
alias nfl-schedule="briefing sports --sport nfl --schedule"
alias nba-schedule="briefing sports --sport nba --schedule"
alias epl-schedule="briefing sports --sport epl --schedule"
alias nba-standings="briefing sports --sport nba --standings"
alias mlb-standings="briefing sports --sport mlb --standings"
alias epl-standings="briefing sports --sport epl --standings"
alias laliga-standings="briefing sports --sport laliga --standings"
alias ucl-standings="briefing sports --sport ucl --standings"
alias europa-standings="briefing sports --sport europa --standings"
alias f1-standings="briefing sports --sport f1 --standings"
alias f1-races="briefing sports --sport f1 --races"

# News shortcuts
alias news="briefing news --sources bbc techcrunch"
alias tech="briefing news --sources techcrunch hackernews"
```

## Tips

1. **Hide Links**: Use `--no-links` to get cleaner output

   ```bash
   briefing --no-links news --sources bbc
   ```

2. **Disable Colors**: Use `--no-color` for plain text output

   ```bash
   briefing --no-color news
   ```

3. **Pipe to File**: Save your briefing for later

   ```bash
   briefing all > daily-briefing.txt
   ```

4. **Schedule Daily Briefing**: Add to crontab for automated briefings
   ```bash
   # Run at 8 AM daily
   0 8 * * * /path/to/briefing all | mail -s "Daily Briefing" you@example.com
   ```

## Available Sources

### News Sources

- `bbc` - BBC News
- `cnn` - CNN Top Stories
- `nytimes` - New York Times
- `guardian` - The Guardian
- `aljazeera` - Al Jazeera
- `techcrunch` - TechCrunch
- `hackernews` - Hacker News

### Sports

- `nfl` - National Football League
- `nba` - National Basketball Association (supports `--standings`)
- `mlb` - Major League Baseball (supports `--standings`)
- `nhl` - National Hockey League
- `epl` - English Premier League (supports `--standings`)
- `laliga` - Spanish La Liga (supports `--standings`)
- `ucl` - UEFA Champions League (supports `--standings`)
- `europa` - UEFA Europa League (supports `--standings`)
- `soccer` - Premier League (alias for `epl`)
- `ncaaf` - NCAA Football
- `ncaab` - NCAA Basketball
- `f1` - Formula 1 (supports `--standings` and `--races`)
- `tennis-atp` - ATP Men's Tennis
- `tennis-wta` - WTA Women's Tennis

## Troubleshooting

### Command not found

Make sure your Python scripts directory is in your PATH:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

### Permission errors

If you get permission errors with the config file, the tool will automatically fallback to `~/.briefing_config.json` in your home directory.

### No data showing

- Check your internet connection
- Some sources may be temporarily unavailable
- Try a different source or sport

## Examples

### Morning Routine

```bash
briefing news --sources bbc
briefing sports --sport nfl --scores
briefing sports --sport nba --scores
briefing sports --sport nba --standings
briefing sports --sport nfl --schedule  # Check upcoming games
```

### Tech News Focus

```bash
briefing news --sources techcrunch hackernews
```

### Sports Fan

```bash
briefing sports --sport nfl --scores --news
briefing sports --sport nba --scores --news
briefing sports --sport nba --standings
briefing sports --sport nfl --schedule  # See upcoming games
```

### F1 Fan

```bash
# Get current driver standings
briefing sports --sport f1 --standings

# Get full race schedule with winners
briefing sports --sport f1 --races

# Get F1 news
briefing sports --sport f1 --news
```

### MLB Fan

```bash
# Get current MLB standings
briefing sports --sport mlb --standings

# Get MLB scores
briefing sports --sport mlb --scores

# Get upcoming MLB schedule
briefing sports --sport mlb --schedule

# Get MLB news
briefing sports --sport mlb --news
```

### Premier League Fan

```bash
# Get Premier League standings
briefing sports --sport epl --standings

# Get Premier League scores
briefing sports --sport epl --scores

# Get upcoming Premier League schedule
briefing sports --sport epl --schedule

# Get Premier League news
briefing sports --sport epl --news
```

### La Liga Fan

```bash
# Get La Liga standings
briefing sports --sport laliga --standings

# Get La Liga scores
briefing sports --sport laliga --scores

# Get upcoming La Liga schedule
briefing sports --sport laliga --schedule

# Get La Liga news
briefing sports --sport laliga --news
```

### Champions League Fan

```bash
# Get Champions League standings
briefing sports --sport ucl --standings

# Get Champions League scores
briefing sports --sport ucl --scores

# Get upcoming Champions League schedule
briefing sports --sport ucl --schedule

# Get Champions League news
briefing sports --sport ucl --news
```

## Next Steps

- Customize your config file
- Set up aliases for quick access
- Schedule automated briefings
- Check the full README.md for more details

Enjoy your daily briefing! 📰🏆
