"""
Configuration management for Briefing.
"""

import json
import os
from pathlib import Path
from typing import Any, Optional


class Config:
    """Manages user configuration for the Briefing CLI."""

    DEFAULT_CONFIG = {
        'news': {
            'default_sources': ['bbc', 'cnn'],
            'timeout': 10,
        },
        'sports': {
            'default_sports': ['nfl', 'nba'],
            'timeout': 10,
        },
        'display': {
            'use_color': True,
            'show_links': True,
        }
    }

    def __init__(self, config_file: Optional[str] = None):
        """
        Initialize configuration.

        Args:
            config_file: Path to configuration file. If None, uses default location.
        """
        if config_file:
            self.config_path = Path(config_file)
        else:
            # Use XDG config directory or fallback to home directory
            config_home = os.environ.get('XDG_CONFIG_HOME')
            if config_home:
                config_dir = Path(config_home) / 'briefing'
            else:
                config_dir = Path.home() / '.config' / 'briefing'

            try:
                config_dir.mkdir(parents=True, exist_ok=True)
                self.config_path = config_dir / 'config.json'
            except (PermissionError, OSError) as e:
                # Fallback to current directory if we can't create config dir
                self.config_path = Path.home() / '.briefing_config.json'

        self.config = self._load_config()

    def _load_config(self) -> dict:
        """Load configuration from file or create default."""
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r') as f:
                    user_config = json.load(f)
                    # Merge with defaults
                    return self._merge_configs(self.DEFAULT_CONFIG, user_config)
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Could not load config from {self.config_path}: {e}")
                print("Using default configuration.")

        return self.DEFAULT_CONFIG.copy()

    def _merge_configs(self, default: dict, user: dict) -> dict:
        """Recursively merge user config with default config."""
        result = default.copy()
        for key, value in user.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._merge_configs(result[key], value)
            else:
                result[key] = value
        return result

    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a configuration value using dot notation.

        Args:
            key: Configuration key in dot notation (e.g., 'news.default_sources')
            default: Default value if key is not found

        Returns:
            Configuration value or default
        """
        keys = key.split('.')
        value = self.config

        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default

        return value

    def set(self, key: str, value: Any):
        """
        Set a configuration value using dot notation.

        Args:
            key: Configuration key in dot notation
            value: Value to set
        """
        keys = key.split('.')
        config = self.config

        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]

        config[keys[-1]] = value

    def save(self):
        """Save current configuration to file."""
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, 'w') as f:
                json.dump(self.config, f, indent=2)
        except IOError as e:
            print(f"Warning: Could not save config to {self.config_path}: {e}")

    def reset(self):
        """Reset configuration to defaults."""
        self.config = self.DEFAULT_CONFIG.copy()
        self.save()
