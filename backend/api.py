import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from routes.news import router as news_router
from routes.sports import router as sports_router
from routes.bets import router as bets_router
from routes.pinned_games import router as pinned_games_router
from routes.teams import router as teams_router
from routes.account import router as account_router

app = FastAPI(title="Briefing API")

# Enable CORS
# Get additional origins from environment variable
extra_origins = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://briefing-sports-tracking.netlify.app",
] + [o.strip() for o in extra_origins if o.strip()]

print(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Briefing API is running"}


# Include routers
app.include_router(news_router)
app.include_router(sports_router)
app.include_router(bets_router)
app.include_router(pinned_games_router)
app.include_router(teams_router)
app.include_router(account_router)
