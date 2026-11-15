# ADR-0003: Authentication & Session Rotation

## Status
Accepted

## Decision
- Passwords hashed with Argon2id (`argon2-cffi`).
- Short-lived JWT Bearer access tokens (`15m`) paired with `14d` refresh tokens stored as SHA-256 hashes in `refresh_tokens` and delivered via `httpOnly` cookies.
- Refresh token rotation with family-based reuse detection: presenting a previously rotated token revokes the entire token family immediately.
