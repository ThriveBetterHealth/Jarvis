#!/usr/bin/env bash
# =============================================================================
# Jarvis AI — Production Deployment Script
# Run on the VPS after cloning the repo and creating .env
# Usage: bash scripts/deploy.sh [--build] [--migrate-only] [--logs]
# =============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/jarvis}"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Argument parsing ──────────────────────────────────────────────────────────
BUILD=false
MIGRATE_ONLY=false
SHOW_LOGS=false

for arg in "$@"; do
    case $arg in
        --build)        BUILD=true ;;
        --migrate-only) MIGRATE_ONLY=true ;;
        --logs)         SHOW_LOGS=true ;;
        *) warn "Unknown argument: $arg" ;;
    esac
done

# ── Sanity checks ─────────────────────────────────────────────────────────────
[[ -f "$APP_DIR/.env" ]] || error ".env not found in $APP_DIR — copy .env.example and fill in secrets"
command -v docker  >/dev/null || error "docker not installed"
docker compose version >/dev/null 2>&1 || error "docker compose plugin not installed"

cd "$APP_DIR"

info "=== Jarvis AI — Deployment ==="
info "Directory : $APP_DIR"
info "Build flag: $BUILD"
echo ""

# ── Build images (optional) ───────────────────────────────────────────────────
if [[ "$BUILD" == "true" ]]; then
    info "Building Docker images..."
    docker compose build --no-cache backend worker frontend
    info "Build complete."
fi

# ── Migrate-only mode ─────────────────────────────────────────────────────────
if [[ "$MIGRATE_ONLY" == "true" ]]; then
    info "Running database migrations..."
    docker compose run --rm backend alembic upgrade head
    info "Migrations complete."
    exit 0
fi

# ── Start infrastructure first ────────────────────────────────────────────────
info "Starting postgres and redis..."
docker compose up -d postgres redis

info "Waiting for postgres to be healthy..."
timeout 60 bash -c 'until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-jarvis}" >/dev/null 2>&1; do sleep 2; done'
info "PostgreSQL ready."

# ── Run migrations ────────────────────────────────────────────────────────────
info "Running database migrations..."
docker compose run --rm backend alembic upgrade head
info "Migrations applied."

# ── Rolling restart of application services ───────────────────────────────────
info "Starting/restarting backend..."
docker compose up -d --no-deps --force-recreate backend
sleep 8

info "Starting/restarting worker..."
docker compose up -d --no-deps --force-recreate worker

info "Starting/restarting frontend..."
docker compose up -d --no-deps --force-recreate frontend
sleep 5

# ── Nginx ─────────────────────────────────────────────────────────────────────
info "Starting/reloading nginx..."
docker compose up -d --no-deps nginx
docker compose exec -T nginx nginx -s reload 2>/dev/null || true

# ── Health check ──────────────────────────────────────────────────────────────
info "Checking API health..."
sleep 5
if curl -sf http://localhost:8000/api/health >/dev/null; then
    info "✓ Backend health check passed"
else
    warn "Backend health check failed — check logs: docker compose logs backend"
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────
info "Pruning unused Docker images..."
docker image prune -f >/dev/null

echo ""
info "=== Deployment complete ==="
docker compose ps

# ── Show logs if requested ────────────────────────────────────────────────────
if [[ "$SHOW_LOGS" == "true" ]]; then
    echo ""
    info "=== Recent logs ==="
    docker compose logs --tail=50
fi
