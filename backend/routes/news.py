from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from briefing.news_fetcher import NewsFetcher
from briefing.config import Config

router = APIRouter(prefix="/api/news", tags=["news"])

config = Config()
news_fetcher = NewsFetcher()


@router.get("")
def get_news(sources: Optional[List[str]] = Query(None)):
    try:
        if not sources:
            sources = config.get('news.default_sources', ['bbc', 'cnn'])
        return news_fetcher.fetch_multiple_feeds(sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources")
def get_news_sources():
    return news_fetcher.list_default_sources()
