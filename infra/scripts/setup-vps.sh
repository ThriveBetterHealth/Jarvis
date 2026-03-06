#!/bin/bash
# First-time VPS setup script for Ubuntu/Debian
set -euo pipefail

echo "=== Jarvis AI - VPS Setup ==="

# System update
apt-get update && apt-get upgrade -y

# Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Docker Compose (v2)
apt-get install -y docker-compose-plugin

# Certbot for Let's Encrypt
apt-get install -y certbot

# Create app directory
mkdir -p /opt/jarvis
mkdir -p /opt/jarvis/storage

# Set up SSL (replace yourdomain.com)
# certbot certonly --standalone -d yourdomain.com --email your@email.com --agree-tos

echo "=== VPS setup complete ==="
echo "Next: copy .env and docker-compose.yml to /opt/jarvis, then run deploy.sh"
