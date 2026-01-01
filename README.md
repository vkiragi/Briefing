# Briefing

A sports betting tracker and live scores app. Track bets across 20+ sports, monitor live game stats for prop bets, analyze your betting performance with detailed analytics, and personalize your experience with favorite teams. Built as a React web app with a FastAPI backend; the original CLI is still available for terminal users.

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Supabase Auth
**Backend:** Python, FastAPI, Uvicorn
**Database:** Supabase (PostgreSQL)
**Deployment:** Netlify (frontend), Fly.io (backend)

## Local Setup

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && pip install -r requirements.txt && python -m uvicorn api:app --reload
```

## Environment Variables

Copy the example files and fill in your values:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

See each `.env.example` for required variables.

## Project Structure

```
briefing/
├── frontend/                 # React + TypeScript web app
│   ├── src/
│   │   ├── pages/            # Dashboard, AddBet, BetHistory, Analytics, Bankroll
│   │   ├── components/       # UI components, modals, trackers
│   │   ├── context/          # Auth, Bets, Settings, PinnedGames
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # API client, Supabase, utilities
│   │   └── types.ts          # TypeScript interfaces
│   └── package.json
│
├── backend/                  # FastAPI server
│   ├── api.py                # REST API (35+ endpoints)
│   ├── briefing/             # Core fetchers (ESPN, F1, news)
│   ├── supabase_migrations/  # Database schema
│   └── requirements.txt
│
└── README.md
```

## Features

- **Bet Tracking** — Singles, parlays, props, combined props across 20+ sports
- **Live Scores** — Real-time game updates, box scores, play-by-play
- **Prop Monitoring** — Track player stats vs your lines during games
- **Analytics** — Win rate, ROI, profit/loss trends, bankroll history
- **Favorite Teams** — Personalized dashboard with your teams' results
- **Pinned Games** — Save games for quick access

## CLI (Optional)

The original CLI is still available in `backend/`:

```bash
cd backend
pip install -e .
briefing sports --sport nfl --scores
briefing news --sources bbc cnn
```
