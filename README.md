# Jarvis AI — Personal AI Operating System

> Self-hosted, multi-model AI platform. Replaces ChatGPT + Notion + Todoist + Zapier with one coherent workspace deployed on your own VPS.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router, React Server Components) |
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 + pgvector |
| Cache / Queue | Redis 7 + ARQ |
| Reverse Proxy | Nginx (TLS 1.3) |
| Containers | Docker + Docker Compose |
| CI/CD | GitHub Actions → Hostinger VPS |

---

## Features

- **AI Assistant** — chat, voice, file analysis, streaming responses, multi-model routing (GPT-4o, Claude, Gemini)
- **Digital Notebook** — rich block editor, page hierarchy, tags, AI summarise/generate tasks/extract insights
- **Task Engine** — full CRUD, priorities, statuses, due dates, notebook linking, AI suggestions
- **Reminder System** — time-based, deadline-based, recurring triggers; desktop + email + in-app delivery
- **Daily Briefing Dashboard** — AI-generated overview of tasks, notes, reminders, and patterns
- **Document Intelligence** — PDF, DOCX, image (OCR), CSV, XLSX analysis pipeline
- **Research Agent** — autonomous web research, report synthesis, saves to notebook
- **AI Memory** — pgvector semantic search, context injection across sessions
- **Security** — JWT + refresh tokens, bcrypt, TOTP MFA, AES-256-GCM key vault, TLS 1.3, audit logs

---

## Quick Start (Local Development)

### 1. Clone and configure

```bash
git clone https://github.com/your-username/jarvis.git
cd jarvis
cp .env.example .env
```

Edit `.env` and set at minimum:
- `APP_SECRET_KEY` — random 64+ char string
- `JWT_SECRET_KEY` — random 64+ char string
- `ENCRYPTION_MASTER_KEY` — 64 hex chars (32 bytes), e.g.: `openssl rand -hex 32`
- `POSTGRES_PASSWORD` — strong password
- `REDIS_PASSWORD` — strong password
- `ANTHROPIC_API_KEY` — your Anthropic key (required for core AI features)
- `OPENAI_API_KEY` — your OpenAI key (for GPT-4o and Whisper transcription)

### 2. Start services

```bash
docker compose up -d
```

This starts: PostgreSQL, Redis, FastAPI backend (with Alembic migrations), ARQ worker, Next.js frontend, Nginx.

### 3. Create the owner account

```bash
# Using the API directly (single-user mode)
curl -X POST http://localhost:8000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"your-password","full_name":"Andy Jackson"}'
```

> **Note:** Registration is disabled for v1.0 (single-user). Run this script once against the dev server, or use the seed script below.

### 4. Seed the owner user

```bash
docker compose exec backend python scripts/create_owner.py \
  --email you@example.com \
  --password your-password \
  --name "Andy Jackson"
```

### 5. Open Jarvis

- **App:** http://localhost:3000
- **API docs:** http://localhost:8000/api/docs (dev only)

---

## Production Deployment (Hostinger VPS)

### Prerequisites

- Hostinger VPS: 4 vCPU / 8 GB RAM / 100 GB SSD (KVM2 or above)
- Ubuntu 22.04 LTS
- Domain name pointed at your VPS IP
- GitHub repository with the code

### Step 1 — Set up VPS

SSH into your VPS and run:

```bash
curl -sSL https://raw.githubusercontent.com/your-username/jarvis/main/infra/scripts/setup-vps.sh | sudo bash
```

### Step 2 — Get SSL certificate

```bash
sudo certbot certonly --standalone -d yourdomain.com --email you@example.com --agree-tos
```

### Step 3 — Configure GitHub Secrets

In your GitHub repository → Settings → Secrets and variables → Actions, add:

| Secret | Value |
|---|---|
| `VPS_HOST` | Your VPS IP address |
| `VPS_USER` | SSH user (usually `root`) |
| `VPS_SSH_KEY` | Private SSH key for VPS access |
| `VPS_PORT` | SSH port (default 22) |
| `GHCR_TOKEN` | GitHub Personal Access Token with `write:packages` |
| `ENCRYPTION_MASTER_KEY` | 64 hex chars (`openssl rand -hex 32`) |

### Step 4 — Set up `.env` on VPS

```bash
mkdir -p /opt/jarvis
# Upload your .env file to /opt/jarvis/.env
scp .env root@your-vps:/opt/jarvis/.env
```

Update `APP_DOMAIN` in the `.env` to your actual domain.

### Step 5 — Deploy

Push to `main` branch — GitHub Actions will:
1. Run linting and tests (CI)
2. Build Docker images and push to GHCR
3. SSH into your VPS, pull images, run migrations, rolling restart

Or trigger manually:
```bash
git push origin main
```

---

## Repository Structure

```
jarvis/
├── .github/
│   └── workflows/
│       ├── ci.yml          # Lint, test, build check on PRs
│       └── cd.yml          # Build, push, deploy on main
├── backend/
│   ├── alembic/            # Database migrations
│   ├── api/routes/         # FastAPI route handlers
│   ├── core/               # Config, database, security, dependencies
│   ├── models/             # SQLAlchemy models
│   ├── services/           # Business logic, AI providers, notifications
│   ├── workers/            # ARQ background tasks
│   ├── tests/              # pytest test suite
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   ├── components/     # React components
│   │   └── lib/            # API client, Zustand stores
│   ├── Dockerfile
│   └── package.json
├── infra/
│   ├── nginx/              # Nginx config (TLS, rate limiting, proxy)
│   └── scripts/            # VPS setup and deploy scripts
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Overview

| Group | Base Path |
|---|---|
| Authentication | `/api/auth/*` |
| AI Assistant | `/api/assistant/*` |
| Notebook | `/api/notebook/*` |
| Tasks | `/api/tasks/*` |
| Reminders | `/api/reminders/*` |
| Documents | `/api/documents/*` |
| Research Agent | `/api/research/*` |
| Files | `/api/files/*` |
| Memory | `/api/memory/*` |
| Dashboard | `/api/dashboard/*` |
| Admin | `/api/admin/*` |

Full interactive docs at `/api/docs` (disabled in production).

---

## Development Commands

```bash
# Start all services
docker compose up -d

# View backend logs
docker compose logs -f backend

# Run migrations manually
docker compose exec backend alembic upgrade head

# Generate new migration
docker compose exec backend alembic revision --autogenerate -m "description"

# Run backend tests
docker compose exec backend pytest tests/ -v

# Frontend dev with hot-reload (outside docker)
cd frontend && npm install && npm run dev

# Ruff linting
cd backend && ruff check .
```

---

## Security Notes

- All API keys stored AES-256-GCM encrypted in the database, never in files
- JWT access tokens expire in 15 minutes; refresh tokens rotate on use
- bcrypt cost factor 12 for passwords
- TOTP MFA enforced for admin accounts
- TLS 1.3 enforced at Nginx layer
- Append-only audit log with SHA-256 payload hashing
- Rate limiting: 60 req/min per IP on API, 10 req/min on auth endpoints
- UK GDPR compliant: soft deletes, export capability, erasure on request

---

## Phased Delivery

| Phase | Weeks | Focus |
|---|---|---|
| 1 | 1-4 | Infrastructure, auth, basic chat, VPS deployment |
| 2 | 5-10 | Multi-model routing, notebook, tasks, reminders, dashboard |
| 3 | 11-16 | Document intelligence, research agent, AI memory, voice |
| 4 | 17-20 | Polish, performance, security hardening, multi-account prep |

---

## License

Private — Andy Jackson. All rights reserved.
