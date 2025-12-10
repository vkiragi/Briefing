#!/bin/bash
# Start the FastAPI backend server

cd "$(dirname "$0")"

echo "Starting Briefing API server on http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn api:app --reload --host 0.0.0.0 --port 8000

