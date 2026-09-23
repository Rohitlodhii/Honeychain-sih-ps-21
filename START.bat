@echo off
REM HoneyChain Quick Start Script for Windows
REM Starts Postgres first (waits healthy), then backend + frontend.

echo.
echo ========================================
echo    HoneyChain - Quick Start
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not in PATH.
    echo Please install Docker Desktop from https://www.docker.com/
    pause
    exit /b 1
)

echo Docker found:
docker --version
echo.

REM Check if docker-compose.yml exists
if not exist docker-compose.yml (
    echo ERROR: docker-compose.yml not found!
    echo Please run this script from the HoneyChain-sih-ps-21 directory.
    pause
    exit /b 1
)

REM Pick compose command (v2 preferred, v1 fallback)
set COMPOSE=docker compose
docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    docker-compose --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: neither "docker compose" nor "docker-compose" works.
        pause
        exit /b 1
    )
    set COMPOSE=docker-compose
)

echo [1/3] Starting Postgres (honeychain-postgres)...
%COMPOSE% up -d postgres
if %errorlevel% neq 0 (
    echo ERROR: failed to start postgres.
    pause
    exit /b 1
)

echo [2/3] Waiting for Postgres to become healthy...
set TRIES=0
:waitloop
set /a TRIES+=1
for /f %%s in ('docker inspect --format "{{.State.Health.Status}}" honeychain-postgres 2^>nul') do set HEALTH=%%s
if "%HEALTH%"=="healthy" goto healthy
if %TRIES% GEQ 24 (
    echo ERROR: Postgres did not become healthy in time. Check with:
    echo   docker logs honeychain-postgres
    pause
    exit /b 1
)
echo   ... waiting ^(%TRIES%^/24^)
timeout /t 5 /nobreak >nul
goto waitloop

:healthy
echo Postgres is healthy.
echo.

echo [3/3] Launching backend + frontend...
%COMPOSE% up --build backend frontend

echo.
echo ========================================
echo    Services Stopped.
echo ========================================
echo.
echo Frontend:     http://localhost:3000
echo Backend API:  http://localhost:8000
echo API Docs:     http://localhost:8000/docs
echo Postgres:     localhost:5433 (user/db: honeychain)
echo.
echo Tip: "docker compose down" stops everything.
echo.

pause
