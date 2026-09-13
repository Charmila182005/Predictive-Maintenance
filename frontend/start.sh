#!/bin/bash
# Frontend startup script

set -e

echo "=== Fathom Frontend Startup ==="

# Check Node
if ! command -v node &> /dev/null; then
    echo "Error: node not found"
    exit 1
fi

# Install deps if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check .env
if [ ! -f ".env" ]; then
    echo "Warning: .env not found, copying from .env.example"
    cp .env.example .env
fi

# Run
echo "Starting dev server on http://localhost:5173"
npm run dev