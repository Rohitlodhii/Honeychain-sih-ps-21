@echo off
REM HoneyChain Native Start (no Docker) for Windows
REM Uses: native PostgreSQL service + backend venv + npm.
REM Postgres must be running: service "postgresql-x64-17" (Automatic).

echo.
echo ========================================
echo    HoneyChain - Native Start (no Docker)
echo ========================================
echo.

if not exist backend\.env (
    echo ERROR: backend\.env not found. Run from HoneyChain-sih-ps-21 directory.
    pause
    exit /b 1
)

REM Check native Postgres answers on 5432
"%ProgramFiles%\PostgreSQL\17\bin\psql.exe" -h 127.0.0.1 -U honeychain -d honeychain -w -t -c "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo Postgres not reachable as honeychain@127.0.0.1:5432.
    echo Trying to start the service...
    net start postgresql-x64-17 >nul 2>&1
    "%ProgramFiles%\PostgreSQL\17\bin\psql.exe" -h 127.0.0.1 -U honeychain -d honeychain -w -t -c "SELECT 1;" >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: cannot reach native Postgres. Check service postgresql-x64-17.
        pause
        exit /b 1
    )
)
echo Postgres OK (native, localhost:5432).
echo.

echo Starting backend (FastAPI :8000)...
start "HoneyChain backend" /min cmd /c "cd /d %~dp0backend && venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo Starting frontend (Next.js :3000)...
start "HoneyChain frontend" /min cmd /c "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo    Starting... give it ~20 seconds.
echo ========================================
echo Frontend:     http://localhost:3000
echo Backend API:  http://localhost:8000
echo API Docs:     http://localhost:8000/docs
echo Postgres:     localhost:5432 (native service)
echo.
echo Two minimized windows were opened (backend + frontend).
echo Close those windows to stop. Docker is NOT used.
echo.
pause
