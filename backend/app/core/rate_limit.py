import time
from collections import defaultdict, deque
from dataclasses import dataclass

from app.core.errors import RateLimitedError


@dataclass(frozen=True)
class RateLimitResult:
    limit: int
    remaining: int
    reset_seconds: int


class InMemoryRateLimiter:
    """Sliding-window rate limiter for single-instance/dev use; swap with Redis in multi-node prod."""

    def __init__(self) -> None:
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, *, limit: int, window_seconds: int) -> RateLimitResult:
        now = time.monotonic()
        cutoff = now - window_seconds
        bucket = self._buckets[key]
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = max(1, int(bucket[0] + window_seconds - now) + 1)
            raise RateLimitedError(retry_after=retry_after)

        bucket.append(now)
        remaining = max(0, limit - len(bucket))
        reset = window_seconds if not bucket else max(1, int(bucket[0] + window_seconds - now) + 1)
        return RateLimitResult(limit=limit, remaining=remaining, reset_seconds=reset)


rate_limiter = InMemoryRateLimiter()
