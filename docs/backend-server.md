# Starting the Backend Server (Local Development)

The frontend requires the backend FastAPI server to be running to fetch live games, scores, and other data. In production, the backend runs on Fly.io.

## Quick Start

From the `backend` directory, run:

```bash
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

Or use the provided script:

```bash
chmod +x start_server.sh
./start_server.sh
```

## What This Does

- Starts the FastAPI server on `http://localhost:8000`
- Enables auto-reload (server restarts when you change code)
- The frontend at `http://localhost:5173` will be able to connect to it

## Verify It's Running

Open your browser and go to: http://localhost:8000

You should see:
```json
{"status":"ok","message":"Briefing API is running"}
```

Or test an endpoint:
- http://localhost:8000/api/sports/list

## Troubleshooting

### Port 8000 already in use

If port 8000 is already taken, use a different port:

```bash
uvicorn api:app --reload --host 0.0.0.0 --port 8001
```

Then update `frontend/src/lib/api.ts` to use the new port:
```typescript
const API_BASE_URL = 'http://localhost:8001/api';
```

### Dependencies not installed

Make sure you have all dependencies installed:

```bash
cd backend
pip install -r requirements.txt
```

### CORS errors in browser

The backend is configured to allow CORS from `http://localhost:5173` and `http://localhost:3000`. If you're using a different port, update the CORS settings in `api.py`:

```python
allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:YOUR_PORT"],
```

