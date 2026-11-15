from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

from app.core.errors import RateLimitedError
from app.core.rate_limit import InMemoryRateLimiter
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    verify_password,
)


def test_argon2_password_roundtrip() -> None:
    hashed = hash_password("correct-horse-battery-staple")
    assert hashed.startswith("$argon2")
    assert verify_password("correct-horse-battery-staple", hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_jwt_access_token_roundtrip_and_expiry() -> None:
    uid = uuid4()
    token = create_access_token(uid)
    assert decode_access_token(token) == uid

    expired = create_access_token(
        uid, now=datetime.now(timezone.utc) - timedelta(hours=2)
    )
    with pytest.raises(Exception):
        decode_access_token(expired)


def test_refresh_token_hashing_is_deterministic() -> None:
    assert hash_token("abc") == hash_token("abc")
    assert hash_token("abc") != hash_token("abcd")


def test_rate_limiter_enforces_bucket_limit() -> None:
    limiter = InMemoryRateLimiter()
    limiter.check("user:1", limit=2, window_seconds=60)
    res = limiter.check("user:1", limit=2, window_seconds=60)
    assert res.remaining == 0
    with pytest.raises(RateLimitedError):
        limiter.check("user:1", limit=2, window_seconds=60)
