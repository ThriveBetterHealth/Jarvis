#!/usr/bin/env bash
# =============================================================================
# Jarvis AI — Production Deployment Script
# Run on the VPS after cloning the repo and creating .env
# Usage: bash scripts/deploy.sh [--build] [--migrate-only] [--logs]
# =============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/jarvis}"

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

# ── Wait for postgres using Docker's own healthcheck status ──────────────────
info "Waiting for postgres to be healthy (up to 120s)..."
WAIT=0
until [ "$(docker inspect --format='{{.State.Health.Status}}' jarvis_postgres 2>/dev/null)" = "healthy" ]; do
    if [ "$WAIT" -ge 120 ]; then
        error "Postgres did not become healthy within 120s. Check: docker logs jarvis_postgres"
    fi
    sleep 3
    WAIT=$((WAIT + 3))
    info "  ...still waiting (${WAIT}s)"
done
info "PostgreSQL ready."

# ── Run migrations ────────────────────────────────────────────────────────────
info "Running database migrations..."
docker compose run --rm \
    --no-deps \
    -e DATABASE_URL \
    backend \
    alembic upgrade head
info "Migrations applied."

# ── Rolling restart of application services ───────────────────────────────────
info "Starting/restarting backend..."
docker compose up -d --no-deps --force-recreate backend

info "Waiting for backend to be healthy (up to 90s)..."
WAIT=0
until [ "$(docker inspect --format='{{.State.Health.Status}}' jarvis_backend 2>/dev/null)" = "healthy" ]; do
    if [ "$WAIT" -ge 90 ]; then
        warn "Backend health check timed out. Continuing anyway — check: docker compose logs backend"
        break
    fi
    sleep 5
    WAIT=$((WAIT + 5))
    info "  ...still waiting (${WAIT}s)"
done

info "Starting/restarting worker..."
docker compose up -d --no-deps --force-recreate worker

info "Starting/restarting frontend..."
docker compose up -d --no-deps --force-recreate frontend

# ── Nginx ─────────────────────────────────────────────────────────────────────
info "Starting/reloading nginx..."
docker compose up -d --no-deps nginx
sleep 3
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
