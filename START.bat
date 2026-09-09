@echo off
REM HoneyChain Quick Start Script for Windows

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

echo Starting HoneyChain services...
echo.

REM Check if docker-compose.yml exists
if not exist docker-compose.yml (
    echo ERROR: docker-compose.yml not found!
    echo Please run this script from the Honey/ directory.
    pause
    exit /b 1
)

REM Start services
echo Launching backend + frontend...
docker-compose up

echo.
echo ========================================
echo    Services Started!
echo ========================================
echo.
echo Frontend:     http://localhost:3000
echo Backend API:  http://localhost:8000
echo API Docs:     http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop services.
echo.

pause
