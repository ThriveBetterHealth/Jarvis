# Jarvis AI — Personal AI Operating System

> Self-hosted, multi-model AI platform running at **https://jarvisapp.cloud**
> Replaces ChatGPT + Notion + Todoist + Zapier with one coherent workspace on your own VPS.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router, standalone output) |
| Backend | FastAPI (Python 3.12, async) |
| Database | PostgreSQL 16 + pgvector |
| Cache / Queue | Redis 7 + ARQ background workers |
| Reverse Proxy | Nginx (TLS 1.3, rate limiting) |
| Containers | Docker + Docker Compose v2 |
| CI/CD | GitHub Actions → Hostinger VPS via SSH |

---

## Features

- **AI Assistant** — chat, streaming responses, multi-model routing (GPT-4o, Claude Sonnet/Opus, Gemini Pro)
- **Digital Notebook** — block editor, page hierarchy, tags, AI summarise/generate/extract
- **Task Engine** — full CRUD, priorities, due dates, AI suggestions
- **Reminder System** — time-based, recurring; email + in-app delivery
- **Daily Briefing Dashboard** — AI overview of tasks, notes, reminders
- **Document Intelligence** — PDF, DOCX, image (OCR), CSV analysis pipeline
- **Research Agent** — autonomous web research → report → saves to notebook
- **AI Memory** — pgvector semantic search, context injection across sessions
- **File Manager** — versioned file storage
- **Security** — JWT (15min/7day), bcrypt cost 12, TOTP MFA, AES-256-GCM, TLS 1.3, audit log

---

## Repository Structure

```
jarvis/
├── backend/           FastAPI application
│   ├── api/routes/    11 API route groups
│   ├── core/          config, DB, security, dependencies
│   ├── models/        SQLAlchemy ORM models
│   ├── services/      business logic + AI providers
│   ├── workers/       ARQ background workers
│   ├── alembic/       DB migrations
│   ├── scripts/       create_owner.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/          Next.js 14 application
│   ├── src/app/       pages (App Router)
│   ├── src/components/ UI components
│   ├── src/lib/       api client, Zustand stores
│   ├── package.json
│   └── Dockerfile
├── infra/
│   ├── nginx/         nginx.conf + jarvis.conf
│   └── scripts/       setup-vps.sh, deploy.sh, init-db.sql
├── scripts/
│   └── deploy.sh      root-level deployment script
├── .github/workflows/ CI + CD pipelines
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Hostinger VPS Deployment Guide

### Prerequisites

- Hostinger VPS running **Ubuntu 22.04 or 24.04**
- DNS A records pointing `jarvisapp.cloud` and `www.jarvisapp.cloud` at your VPS IP
- SSH root access to the VPS
- GitHub repository: `https://github.com/ThriveBetterHealth/Jarvis`

---

### Step 1 — Run the VPS Setup Script

SSH into your VPS as root, then run:

```bash
ssh root@<YOUR_VPS_IP>

curl -fsSL https://raw.githubusercontent.com/ThriveBetterHealth/Jarvis/main/infra/scripts/setup-vps.sh | bash
```

This script installs:
- Docker + Docker Compose plugin
- Certbot + Let's Encrypt SSL certificate for `jarvisapp.cloud`
- UFW firewall (ports 22, 80, 443)
- Clones the repo to `/opt/jarvis`

---

### Step 2 — Create Your `.env` File

On your **local machine**, copy and fill in the secrets:

```bash
cp .env.example .env
```

Generate all secrets:

```bash
# APP_SECRET_KEY
openssl rand -hex 32

# JWT_SECRET_KEY
openssl rand -hex 32

# ENCRYPTION_MASTER_KEY (must be exactly 64 hex chars)
openssl rand -hex 32

# POSTGRES_PASSWORD
openssl rand -base64 24

# REDIS_PASSWORD
openssl rand -base64 24
```

Edit `.env` and replace every `CHANGE_ME` value. Set at least one AI provider key:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

Upload to VPS:

```bash
scp .env root@<YOUR_VPS_IP>:/opt/jarvis/.env
```

---

### Step 3 — Build and Deploy

SSH back into the VPS:

```bash
ssh root@<YOUR_VPS_IP>
cd /opt/jarvis
bash scripts/deploy.sh --build
```

This:
1. Builds Docker images locally on the VPS
2. Runs Alembic database migrations
3. Starts all services: postgres, redis, backend, worker, frontend, nginx
4. Verifies the API health endpoint

---

### Step 4 — Create the Owner Account

```bash
cd /opt/jarvis
docker compose exec backend python scripts/create_owner.py
```

Follow the prompts to set your email and password.

---

### Step 5 — Verify

```bash
# Check all containers are running
docker compose ps

# Check API health
curl https://jarvisapp.cloud/api/health

# View logs
docker compose logs -f backend
```

Open **https://jarvisapp.cloud** in your browser and log in.

---

## GitHub Actions CI/CD

Every push to `main` automatically:

1. **CI** — lints + tests backend (pytest) and frontend (ESLint + TypeScript)
2. **CD** — builds Docker images, pushes to GHCR, deploys to VPS via SSH

### Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Description |
|---|---|
| `VPS_HOST` | VPS IP address or hostname |
| `VPS_USER` | SSH username (e.g. `root`) |
| `VPS_SSH_KEY` | Private SSH key (RSA or Ed25519) |
| `VPS_PORT` | SSH port (default: `22`) |
| `GHCR_TOKEN` | GitHub PAT with `read:packages` scope |
| `ENCRYPTION_MASTER_KEY` | Same 64-char hex key as in your `.env` |

---

## Useful Commands

```bash
# View live logs
docker compose logs -f

# Restart a single service
docker compose restart backend

# Run migrations manually
docker compose exec backend alembic upgrade head

# Open backend Python shell
docker compose exec backend python

# Access PostgreSQL
docker compose exec postgres psql -U jarvis -d jarvis

# Full redeploy (rebuild images)
bash scripts/deploy.sh --build

# Deploy without rebuild (pull latest pre-built images)
bash scripts/deploy.sh
```

---

## Local Development

```bash
# Clone
git clone https://github.com/ThriveBetterHealth/Jarvis.git
cd Jarvis

# Create .env
cp .env.example .env
# Edit .env — change APP_ENV=development, use localhost URLs

# Start services
docker compose up -d postgres redis

# Run backend locally
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000

# Run frontend locally (in a separate terminal)
cd frontend
npm install
npm run dev
```

---

## Environment Variables Reference

See [`.env.example`](.env.example) for the full annotated list.

Key variables:

| Variable | Description |
|---|---|
| `APP_SECRET_KEY` | Application secret (64+ chars) |
| `POSTGRES_PASSWORD` | Database password |
| `REDIS_PASSWORD` | Redis auth password |
| `JWT_SECRET_KEY` | JWT signing secret (64+ chars) |
| `ENCRYPTION_MASTER_KEY` | AES-256-GCM key (exactly 64 hex chars) |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic/Claude API key |
| `GOOGLE_AI_API_KEY` | Google Gemini API key |
| `NEXT_PUBLIC_API_URL` | Public API URL (`https://jarvisapp.cloud`) |

---

## Security Notes

- All secrets are loaded from `.env` — never committed to git (`.gitignore` excludes `.env`)
- API keys are stored AES-256-GCM encrypted in the database after initial setup
- JWT access tokens expire in 15 minutes; refresh tokens rotate on each use
- Rate limiting: 60 req/min general, 10 req/min auth endpoints
- TLS 1.2/1.3 enforced at Nginx; HSTS with 1-year max-age

---

## License

MIT — self-hosted use only. See LICENSE.
