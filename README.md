# PyMentor AI

PyMentor AI is an interactive Python 3 programming tutor built to teach concepts before code, walk through solutions line by line, trace variable state step by step, and execute learner code in an isolated sandbox.

## Architecture

- **Frontend (`app/`, `components/`, `lib/`)**: Next.js 15 (App Router), React 19, TypeScript strict mode, Tailwind CSS v4, server-side Gemini streaming (`/api/chat/stream`), curated Python documentation grounding (`lib/knowledge-pack.ts`), and an isolated WebAssembly Python 3 Web Worker sandbox (`public/workers/python-worker.js`).
- **FastAPI Backend (`backend/`)**: Production-ready async Python 3.11+ service with Argon2id auth, rotating refresh tokens, RFC 7807 `application/problem+json` error handling, PostgreSQL + `pgvector` + `tsvector` hybrid RAG, Alembic migrations, and `ast.parse` response validation.
- **Execution Service (`executor/`)**: Internal sandbox runner applying `--network none`, `--read-only`, `--cap-drop ALL`, `--pids-limit 64`, seccomp filtering, and wall-clock/output caps.
- **Knowledge Base & Evaluation (`knowledge_base/`, `eval/`)**: License-audited Python documentation manifest and offline evaluation dataset (`bench_v1.jsonl`).

## Quick Start (Web App)

```bash
npm install
npm run dev
```

## Full Multi-Service Stack (Docker)

```bash
docker compose up -d postgres redis
cd backend
alembic upgrade head
uvicorn app.main:app --reload
```
