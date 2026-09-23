#!/bin/bash

# HoneyChain Quick Start Script for Linux/macOS
# Starts Postgres first (waits healthy), then backend + frontend.

echo ""
echo "========================================"
echo "   HoneyChain - Quick Start"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not in PATH."
    echo "Please install Docker Desktop from https://www.docker.com/"
    exit 1
fi

echo "Docker found:"
docker --version
echo ""

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "ERROR: docker-compose.yml not found!"
    echo "Please run this script from the HoneyChain-sih-ps-21 directory."
    exit 1
fi

# Pick compose command (v2 preferred, v1 fallback)
if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo 'ERROR: neither "docker compose" nor "docker-compose" works.'
    exit 1
fi

echo "[1/3] Starting Postgres (honeychain-postgres)..."
$COMPOSE up -d postgres || { echo "ERROR: failed to start postgres."; exit 1; }

echo "[2/3] Waiting for Postgres to become healthy..."
for i in $(seq 1 24); do
    HEALTH=$(docker inspect --format "{{.State.Health.Status}}" honeychain-postgres 2>/dev/null)
    if [ "$HEALTH" = "healthy" ]; then
        echo "Postgres is healthy."
        break
    fi
    echo "  ... waiting ($i/24)"
    sleep 5
    if [ "$i" = "24" ]; then
        echo "ERROR: Postgres did not become healthy in time. Check with:"
        echo "  docker logs honeychain-postgres"
        exit 1
    fi
done
echo ""

echo "[3/3] Launching backend + frontend..."
$COMPOSE up --build backend frontend

echo ""
echo "========================================"
echo "   Services Stopped."
echo "========================================"
echo ""
echo "Frontend:     http://localhost:3000"
echo "Backend API:  http://localhost:8000"
echo "API Docs:     http://localhost:8000/docs"
echo "Postgres:     localhost:5433 (user/db: honeychain)"
echo ""
echo 'Tip: "docker compose down" stops everything.'
echo ""
