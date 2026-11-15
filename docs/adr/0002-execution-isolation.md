# ADR-0002: Python Code Execution Isolation

## Status
Accepted

## Decision
Untrusted learner Python code must never execute inside the FastAPI or Next.js server process.
- **Browser Mode**: Isolated Web Worker running WebAssembly Python 3 (Pyodide) with a 5s wall-clock termination timer and 64 KiB output cap.
- **Server Executor (`executor/`)**: Separate internal microservice invoking hardened Docker containers (`--network none`, `--read-only`, `--cap-drop ALL`, `--pids-limit 64`, `--user 10001:10001`, seccomp profile), requiring gVisor (`runsc`) or managed microVMs in public production.

## Consequences
- Zero exposure of server secrets (`GEMINI_API_KEY`, `AUTH__JWT_SECRET`) or host filesystem.
- Production deployment must pass `executor/tests/security/test_sandbox_escape.py`.
