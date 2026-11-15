# PyMentor AI Operations Runbook

## Local Stack Startup
```bash
# Frontend (Next.js on port 3000)
npm install
npm run dev

# Full Backend Stack (PostgreSQL + pgvector, Redis, FastAPI, Executor)
docker compose up -d postgres redis
cd backend && alembic upgrade head && uvicorn app.main:app --reload
```

## Database Migrations
- Apply migrations before rolling out new API containers: `alembic upgrade head`
- Verify downgrade path in staging: `alembic downgrade -1 && alembic upgrade head`

## Secret Rotation
1. Rotate `AUTH__JWT_SECRET` (minimum 32 random bytes) and `EXECUTION__INTERNAL_TOKEN` in secret manager.
2. Restart `api` and `executor` simultaneously.

## Rollback
1. Redeploy the previous immutable image tag.
2. Run `curl -sf https://<api-host>/api/v1/ready` to confirm database and execution checks pass.
