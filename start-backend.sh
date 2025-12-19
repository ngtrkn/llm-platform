#!/bin/bash
cd "$(dirname "$0")/backend"
source venv/bin/activate
echo "Starting backend server on http://localhost:8000"
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
