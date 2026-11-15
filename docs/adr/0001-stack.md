# ADR-0001: Application Stack

## Status
Accepted

## Decision
- **Frontend**: Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind CSS v4.
- **Backend Service (`backend/`)**: FastAPI, Pydantic v2, SQLAlchemy 2.0 async, Alembic, PostgreSQL + `pgvector`.
- **AI Gateway**: Provider-independent adapter (`LLMProvider` protocol in `backend/` and `@google/genai` server routes in Next.js `/api/*`).
- **Streaming**: Server-Sent Events (SSE) with structured JSON schema validation and single repair pass.

## Consequences
- Frontend communicates strictly via HTTP/SSE without importing model SDKs in browser bundles.
- FastAPI service can scale independently with managed PostgreSQL and Redis.
