#!/usr/bin/env bash
# =============================================================================
# Jarvis AI — First-Time VPS Setup (Ubuntu 22.04 / 24.04)
# Run as root on a fresh Hostinger VPS:
#   curl -fsSL https://raw.githubusercontent.com/ThriveBetterHealth/Jarvis/main/infra/scripts/setup-vps.sh | bash
# =============================================================================

set -euo pipefail

DOMAIN="jarvisapp.cloud"
EMAIL="andy@jarvisapp.cloud"
APP_DIR="/opt/jarvis"

echo "=== Jarvis AI — VPS Setup ==="

# ── 1. System update ──────────────────────────────────────────────────────────
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ufw fail2ban

# ── 2. UFW firewall ───────────────────────────────────────────────────────────
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "Firewall configured."

# ── 3. Docker (official installer) ───────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "Docker installed."
else
    echo "Docker already installed."
fi

# Docker Compose plugin
apt-get install -y docker-compose-plugin
docker compose version

# ── 4. Certbot (Let's Encrypt) ────────────────────────────────────────────────
apt-get install -y certbot

# Obtain SSL certificate
# Stop any process on port 80 before running certbot standalone
# (On first run, nginx isn't running yet)
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    certbot certonly --standalone \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --non-interactive
    echo "SSL certificate obtained for $DOMAIN"
else
    echo "SSL certificate already exists for $DOMAIN"
fi

# Auto-renew cron (certbot renew uses webroot after initial setup)
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --deploy-hook 'docker exec jarvis_nginx nginx -s reload'") | crontab -

# ── 5. Application directory ──────────────────────────────────────────────────
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/storage"
mkdir -p /var/www/certbot

# ── 6. Clone / update repo ───────────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" pull origin main
    echo "Repository updated."
else
    git clone https://github.com/ThriveBetterHealth/Jarvis.git "$APP_DIR"
    echo "Repository cloned."
fi

# ── 7. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "=== VPS setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Copy your .env file to $APP_DIR/.env"
echo "     scp .env root@<VPS_IP>:$APP_DIR/.env"
echo ""
echo "  2. Run the deployment:"
echo "     cd $APP_DIR && bash scripts/deploy.sh --build"
echo ""
echo "  3. Create the owner account:"
echo "     docker compose exec backend python scripts/create_owner.py"
