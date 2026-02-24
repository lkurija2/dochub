# DocHub

> Version-controlled documentation for tech teams.

DocHub is like GitHub but for documentation. Teams create **Document Repositories**, add **Documents**, and submit **DURs (Document Update Requests)** — pull requests for your docs. Every change is versioned, reviewed, and auditable.

---

## Features

- 📁 **Document Repositories** — Organize documentation into repos with access control
- 📝 **Versioned Documents** — Every change is stored as a version with a commit message
- 🔄 **DURs** — Propose changes to documents; team reviews and approves/rejects
- 👥 **Role-based Access** — Admin, Editor, Viewer per repository
- 🔐 **JWT Auth** — Access + refresh tokens
- 📊 **Diff View** — See exactly what changed in a DUR before approving

---

## Quick Start (Development)

```bash
git clone https://github.com/your-org/dochub.git
cd dochub
docker compose up
```

- **API**: http://localhost:8000
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs

---

## Production Deployment

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

Required variables:
```env
POSTGRES_PASSWORD=your-secure-password
SECRET_KEY=your-64-char-random-secret
POSTGRES_DB=dochub
POSTGRES_USER=dochub
```

### 2. Pull and run

```bash
# Pull the latest image
docker pull ghcr.io/your-org/dochub/dochub:latest

# Run production stack
DOCKER_IMAGE=ghcr.io/your-org/dochub/dochub:latest docker compose -f docker-compose.prod.yml up -d
```

---

## Architecture

```
┌──────────────────────────────────────┐
│           Single Docker Container    │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │  FastAPI (port 8000)            │ │
│  │                                 │ │
│  │  /api/*  →  REST API            │ │
│  │  /*      →  React SPA (static)  │ │
│  └─────────────────────────────────┘ │
└──────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐
│  PostgreSQL (db)    │
└─────────────────────┘
```

FastAPI serves the compiled React frontend as static files — no separate web server needed in production.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + SQLAlchemy + Alembic |
| Frontend | React + Vite + TypeScript + shadcn/ui |
| Database | PostgreSQL 16 |
| Auth | JWT (access + refresh) |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions → GHCR |

---

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Get tokens |
| `GET /api/repos` | List repositories |
| `POST /api/repos` | Create repository |
| `GET /api/repos/{slug}/docs` | List documents |
| `POST /api/repos/{slug}/docs` | Create document |
| `GET /api/repos/{slug}/docs/{slug}/versions` | Version history |
| `POST /api/repos/{slug}/durs` | Submit a DUR |
| `POST /api/repos/{slug}/durs/{id}/approve` | Approve & merge |
| `POST /api/repos/{slug}/durs/{id}/reject` | Reject a DUR |

Full interactive API docs available at `/docs` (Swagger) and `/redoc`.

---

## CI/CD

On every push to `main`, GitHub Actions:
1. Builds the multi-stage Docker image (frontend → backend → combined)
2. Pushes to GHCR with `latest` + short SHA tags
3. Supports `linux/amd64` and `linux/arm64`

---

## Development

### Local backend setup (with uv)

```bash
# Install uv if you don't have it
curl -LsSf https://astral.sh/uv/install.sh | sh

cd backend

# Create venv and install all deps
uv sync

# Generate lockfile (commit this)
uv lock

# Run with hot reload
uv run uvicorn app.main:app --reload
```

### Running tests

```bash
cd backend
uv run pytest
```

### Database migrations

```bash
cd backend
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

### Adding a backend dependency

```bash
cd backend
uv add <package>        # adds to pyproject.toml + updates uv.lock
uv add --dev <package>  # dev-only dependency
```

### Adding shadcn components

```bash
cd frontend
npx shadcn-ui@latest add <component>
```
