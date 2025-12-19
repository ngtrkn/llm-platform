#!/bin/bash
# Frontend startup script

echo "Starting LLM Platform Frontend..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the development server
echo "Starting Vite development server on http://localhost:3000"
npm run dev
