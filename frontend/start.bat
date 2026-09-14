@echo off
REM Fathom Frontend Startup (Windows)

echo === Fathom Frontend Startup ===

REM Check Node
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: node not found in PATH
    exit /b 1
)

REM Install deps if needed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

REM Check .env
if not exist ".env" (
    echo Warning: .env not found, copying from .env.example
    copy .env.example .env
)

REM Run
echo Starting dev server on http://localhost:5173
npm run dev