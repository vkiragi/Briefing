# Installation Guide - Briefing CLI

## Quick Install (Recommended)

```bash
# From the cli-tool directory
pip install -e .
```

That's it! You can now use `briefing` from anywhere.

## Verify Installation

```bash
briefing --version
```

Expected output: `briefing 1.0.0`

## Test It Out

```bash
# List available news sources
briefing news --list-sources

# Get news from BBC
briefing news --sources bbc

# Get NFL scores
briefing sports --sport nfl --scores
```

## Installation Methods

### Method 1: Editable Install (Development)
```bash
cd cli-tool
pip install -e .
```

**Pros:**
- Changes to code are immediately reflected
- Easy to develop and test
- Can modify sources and add features

**Best for:** Development, testing, customization

### Method 2: Regular Install
```bash
cd cli-tool
pip install .
```

**Pros:**
- Standard installation
- Cleaner installation
- Production-ready

**Best for:** Regular use, production deployment

### Method 3: Virtual Environment (Isolated)
```bash
# Create virtual environment
python -m venv briefing-env

# Activate it
source briefing-env/bin/activate  # On macOS/Linux
# OR
briefing-env\Scripts\activate     # On Windows

# Install
pip install -e .
```

**Pros:**
- Isolated from system Python
- No conflicts with other packages
- Clean uninstall

**Best for:** Clean installs, avoiding conflicts

### Method 4: Requirements Only (Development)
```bash
pip install -r requirements.txt
python -m briefing --help
```

**Pros:**
- No installation needed
- Run directly as module
- Quick testing

**Best for:** Quick testing, development without install

## Dependencies

The following packages will be automatically installed:

- `feedparser>=6.0.10` - RSS feed parsing
- `requests>=2.31.0` - HTTP requests
- `urllib3>=2.0.0` - HTTP utilities
- `rich>=13.7.0` - Terminal formatting
- `python-dateutil>=2.8.2` - Date parsing

## Requirements

- **Python**: 3.8 or higher
- **Internet**: Required for fetching news and sports data
- **Terminal**: Any modern terminal (color support optional)

## Verify Installation

### Check Version
```bash
briefing --version
```

### Check Command Availability
```bash
which briefing
```

### Run Help
```bash
briefing --help
```

## Troubleshooting

### Issue: "command not found: briefing"

**Solution 1:** Add Python scripts to PATH
```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$HOME/.local/bin:$PATH"

# Then reload
source ~/.bashrc  # or source ~/.zshrc
```

**Solution 2:** Use full path
```bash
python -m briefing --help
```

**Solution 3:** Reinstall with user flag
```bash
pip install --user -e .
```

### Issue: Permission errors during install

**Solution:** Use user install
```bash
pip install --user -e .
```

Or use virtual environment (recommended).

### Issue: Missing dependencies

**Solution:** Install requirements manually
```bash
pip install -r requirements.txt
```

### Issue: Old version showing

**Solution:** Uninstall and reinstall
```bash
pip uninstall briefing-cli
pip install -e .
```

### Issue: Import errors

**Solution:** Check Python version
```bash
python --version  # Should be 3.8+
```

If using Python 2, explicitly use Python 3:
```bash
python3 -m pip install -e .
```

## Uninstallation

### Remove the package
```bash
pip uninstall briefing-cli
```

### Remove config files (optional)
```bash
rm -rf ~/.config/briefing
rm -f ~/.briefing_config.json
```

### Remove virtual environment (if used)
```bash
rm -rf briefing-env
```

## Updating

### Update to latest code
```bash
cd cli-tool
git pull  # If using git
pip install --upgrade -e .
```

## Post-Installation Setup

### 1. Test the installation
```bash
briefing news --list-sources
briefing sports --list-sports
```

### 2. Create configuration (optional)
```bash
mkdir -p ~/.config/briefing
cp config.example.json ~/.config/briefing/config.json
```

### 3. Set up aliases (optional)
Add to `~/.bashrc` or `~/.zshrc`:
```bash
alias morning="briefing all"
alias news="briefing news"
alias nfl="briefing sports --sport nfl --scores"
```

Then reload:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

### 4. Test with real data
```bash
# Quick test
briefing news --sources bbc
```

## Platform-Specific Notes

### macOS
- Uses system Python or Homebrew Python
- Config location: `~/.config/briefing/config.json`
- No special requirements

### Linux
- Uses system Python
- Config location: `~/.config/briefing/config.json`
- May need `python3-pip` package

### Windows
- Uses Python from python.org or Microsoft Store
- Config location: `%APPDATA%\briefing\config.json` (fallback: `%USERPROFILE%\.briefing_config.json`)
- Use `py` instead of `python` if needed

## System-Wide Installation (Advanced)

**Not recommended** - Use virtual environment instead.

```bash
sudo pip install .
```

This installs for all users but may cause conflicts with system packages.

## Development Setup

For contributing or modifying the code:

```bash
# Clone/navigate to repository
cd cli-tool

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install in editable mode with dev dependencies
pip install -e .

# Make changes to code
# Changes are immediately reflected

# Test
briefing --version
```

## Docker Installation (Optional)

If you prefer containerized deployment:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY briefing/ ./briefing/
COPY setup.py .

RUN pip install -e .

ENTRYPOINT ["briefing"]
CMD ["--help"]
```

Build and run:
```bash
docker build -t briefing .
docker run briefing news --sources bbc
```

## Next Steps

After installation:

1. Read [QUICKSTART.md](QUICKSTART.md) for basic usage
2. Read [README.md](README.md) for comprehensive documentation
3. Customize [config.json](config.example.json) to your preferences
4. Set up aliases for quick access
5. Enjoy your daily briefing!

## Getting Help

- Check `briefing --help` for command help
- Read [README.md](README.md) for full documentation
- Check [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for technical details
- Report issues on GitHub

---

Happy briefing! 📰🏆
