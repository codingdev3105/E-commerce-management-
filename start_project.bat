@echo off
echo Starting Project Locally...

echo Starting Backend...
cd /d "%~dp0backend"
start "Backend Server" npm run dev

echo Starting Frontend...
cd /d "%~dp0frontend"
start "Frontend Client" npm run dev

echo All services initiated.
