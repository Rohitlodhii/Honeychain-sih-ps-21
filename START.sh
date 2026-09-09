#!/bin/bash

# HoneyChain Quick Start Script for Linux/macOS

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
    echo "Please run this script from the Honey/ directory."
    exit 1
fi

echo "Starting HoneyChain services..."
echo ""

# Start services
docker-compose up

echo ""
echo "========================================"
echo "   Services Started!"
echo "========================================"
echo ""
echo "Frontend:     http://localhost:3000"
echo "Backend API:  http://localhost:8000"
echo "API Docs:     http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop services."
echo ""
