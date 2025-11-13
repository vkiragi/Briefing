"""
News fetcher module for retrieving and parsing RSS feeds.
"""

import feedparser
from typing import List, Dict, Optional
from datetime import datetime
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class NewsFetcher:
    """Fetches and parses news from RSS feeds."""

    # Popular RSS feeds
    DEFAULT_FEEDS = {
        'bbc': 'http://feeds.bbci.co.uk/news/rss.xml',
        'cnn': 'http://rss.cnn.com/rss/cnn_topstories.rss',
        'nytimes': 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
        'guardian': 'https://www.theguardian.com/world/rss',
        'aljazeera': 'https://www.aljazeera.com/xml/rss/all.xml',
        'techcrunch': 'https://techcrunch.com/feed/',
        'hackernews': 'https://hnrss.org/frontpage',
    }

    def __init__(self, timeout: int = 10):
        """
        Initialize the news fetcher.

        Args:
            timeout: Request timeout in seconds
        """
        self.timeout = timeout
        self.session = self._create_session()

    def _create_session(self) -> requests.Session:
        """Create a requests session with retry logic."""
        session = requests.Session()
        retry = Retry(
            total=3,
            backoff_factor=0.3,
            status_forcelist=[500, 502, 503, 504]
        )
        adapter = HTTPAdapter(max_retries=retry)
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        return session

    def fetch_feed(self, feed_url: str) -> List[Dict[str, str]]:
        """
        Fetch and parse a single RSS feed.

        Args:
            feed_url: URL of the RSS feed

        Returns:
            List of news items with title, summary, link, and published date
        """
        try:
            response = self.session.get(feed_url, timeout=self.timeout)
            response.raise_for_status()

            feed = feedparser.parse(response.content)

            if feed.bozo:
                # Feed has errors but might still be parseable
                if hasattr(feed, 'bozo_exception'):
                    print(f"Warning: Feed parsing issue: {feed.bozo_exception}")

            news_items = []
            for entry in feed.entries[:10]:  # Limit to 10 most recent items
                item = {
                    'title': entry.get('title', 'No title'),
                    'summary': self._clean_summary(entry.get('summary', entry.get('description', 'No summary available'))),
                    'link': entry.get('link', ''),
                    'published': self._parse_date(entry.get('published', entry.get('updated', ''))),
                }
                news_items.append(item)

            return news_items

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching feed {feed_url}: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing feed {feed_url}: {str(e)}")

    def fetch_multiple_feeds(self, sources: List[str]) -> Dict[str, List[Dict[str, str]]]:
        """
        Fetch multiple RSS feeds.

        Args:
            sources: List of source names or URLs

        Returns:
            Dictionary mapping source names to their news items
        """
        results = {}

        for source in sources:
            # Check if it's a known source name or a URL
            feed_url = self.DEFAULT_FEEDS.get(source.lower(), source)

            try:
                items = self.fetch_feed(feed_url)
                source_name = source.lower() if source.lower() in self.DEFAULT_FEEDS else 'custom'
                results[source_name] = items
            except Exception as e:
                print(f"Error fetching {source}: {str(e)}")
                results[source] = []

        return results

    @staticmethod
    def _clean_summary(summary: str) -> str:
        """Remove HTML tags and clean up summary text."""
        import re
        # Remove HTML tags
        clean = re.sub('<[^<]+?>', '', summary)
        # Remove extra whitespace
        clean = ' '.join(clean.split())
        # Limit length
        if len(clean) > 200:
            clean = clean[:197] + '...'
        return clean

    @staticmethod
    def _parse_date(date_str: str) -> str:
        """Parse and format publication date."""
        if not date_str:
            return 'Unknown date'

        try:
            # feedparser usually handles this, but let's format it nicely
            from dateutil import parser
            dt = parser.parse(date_str)
            return dt.strftime('%Y-%m-%d %H:%M')
        except:
            return date_str

    @classmethod
    def list_default_sources(cls) -> List[str]:
        """Get list of available default news sources."""
        return list(cls.DEFAULT_FEEDS.keys())
