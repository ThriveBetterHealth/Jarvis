#!/bin/bash
# Production deployment script for Hostinger VPS
set -euo pipefail

echo "=== Jarvis AI - Deployment Script ==="

# Configuration
APP_DIR="${APP_DIR:-/opt/jarvis}"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_PREFIX="${IMAGE_PREFIX:-your-github-username/jarvis}"

# Pull latest images
echo "Pulling latest images..."
docker pull "$REGISTRY/$IMAGE_PREFIX-backend:latest"
docker pull "$REGISTRY/$IMAGE_PREFIX-frontend:latest"

# Run database migrations first
echo "Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm backend alembic upgrade head

# Rolling restart (zero downtime)
echo "Restarting backend..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate backend

echo "Restarting worker..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate worker

echo "Restarting frontend..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate frontend

# Reload Nginx
echo "Reloading Nginx..."
docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload

echo "=== Deployment complete ==="
docker compose -f "$COMPOSE_FILE" ps
