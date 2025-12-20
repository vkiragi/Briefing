"""
Sports fetcher module for retrieving data from ESPN public APIs.
"""

from .base_fetcher import BaseSportsFetcher
from .nfl_fetcher import NFLFetcherMixin
from .nba_fetcher import NBAFetcherMixin
from .mlb_fetcher import MLBFetcherMixin
from .soccer_fetcher import SoccerFetcherMixin
from .f1_fetcher import F1FetcherMixin
from .tennis_fetcher import TennisFetcherMixin
from .boxing_fetcher import BoxingFetcherMixin

class SportsFetcher(
    TennisFetcherMixin, # Tennis mixin must come before BaseSportsFetcher to intercept calls
    BaseSportsFetcher,
    NFLFetcherMixin,
    NBAFetcherMixin,
    MLBFetcherMixin,
    SoccerFetcherMixin,
    F1FetcherMixin,
    BoxingFetcherMixin
):
    """Fetches sports scores and news from ESPN public JSON endpoints."""
    # Logic is now distributed across BaseSportsFetcher and Mixins
    pass
