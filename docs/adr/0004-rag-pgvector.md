# ADR-0004: Curated Hybrid RAG with pgvector

## Status
Accepted

## Decision
- Use PostgreSQL `pgvector` (HNSW cosine index) plus `tsvector` (GIN index) fused via Reciprocal Rank Fusion (RRF) instead of operating a separate vector database.
- Chunk Markdown by heading hierarchy while keeping fenced Python code blocks intact.
- Ground answers strictly against a license-audited manifest (`knowledge_base/sources/manifest.yaml`) with allowlisted URLs.
