MAX_CODE_BYTES = 32 * 1024
MAX_STDIN_BYTES = 8 * 1024
MAX_OUTPUT_BYTES = 64 * 1024
DEFAULT_TIMEOUT_MS = 5000
MIN_TIMEOUT_MS = 1000
MAX_TIMEOUT_MS = 10000


def clamp_timeout_ms(timeout_ms: int | None) -> int:
    if timeout_ms is None:
        return DEFAULT_TIMEOUT_MS
    return max(MIN_TIMEOUT_MS, min(MAX_TIMEOUT_MS, timeout_ms))


def truncate_output(text: str, limit_bytes: int = MAX_OUTPUT_BYTES) -> tuple[str, bool]:
    encoded = text.encode("utf-8", errors="replace")
    if len(encoded) <= limit_bytes:
        return text, False
    truncated = encoded[:limit_bytes].decode("utf-8", errors="ignore")
    return truncated, True


def extract_error_class(stderr: str) -> str | None:
    if not stderr.strip():
        return None
    for line in reversed(stderr.strip().splitlines()):
        if ":" in line:
            candidate = line.split(":", 1)[0].strip()
            if candidate.isidentifier() and (
                candidate.endswith("Error") or candidate.endswith("Exception")
            ):
                return candidate
    return "RuntimeError"
