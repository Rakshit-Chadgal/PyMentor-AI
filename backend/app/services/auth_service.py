from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import ConflictError, InvalidCredentialsError, TokenRevokedError
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.user import RefreshToken, User
from app.repositories.user_repo import UserRepository


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = UserRepository(session)
        self._settings = get_settings()

    async def register(
        self, *, email: str, password: str, display_name: str | None
    ) -> tuple[User, str, str]:
        existing = await self._repo.get_by_email(email)
        if existing is not None:
            raise ConflictError("An account with this email already exists.")

        user = await self._repo.create_user(
            email=email,
            password_hash=hash_password(password),
            display_name=display_name,
        )
        access, refresh = await self._issue_token_pair(user)
        await self._session.commit()
        return user, access, refresh

    async def login(self, *, email: str, password: str) -> tuple[User, str, str]:
        user = await self._repo.get_by_email(email)
        if user is None or not user.is_active or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError()

        user.last_login_at = datetime.now(timezone.utc)
        access, refresh = await self._issue_token_pair(user)
        await self._session.commit()
        return user, access, refresh

    async def rotate_refresh(self, raw_refresh: str) -> tuple[User, str, str]:
        token_hash = hash_token(raw_refresh)
        record = await self._repo.get_refresh_by_hash(token_hash)
        now = datetime.now(timezone.utc)

        if record is None:
            raise TokenRevokedError()

        # Reuse detection: if a revoked token is presented, revoke its entire family
        if record.revoked_at is not None:
            await self._repo.revoke_family(record.family_id)
            await self._session.commit()
            raise TokenRevokedError("Refresh token reuse detected; session family revoked.")

        if record.expires_at <= now:
            raise TokenRevokedError("Refresh token expired.")

        user = await self._repo.get_by_id(record.user_id)
        if user is None or not user.is_active:
            raise TokenRevokedError()

        new_raw = generate_refresh_token()
        new_record = RefreshToken(
            id=uuid4(),
            user_id=user.id,
            token_hash=hash_token(new_raw),
            family_id=record.family_id,
            expires_at=now + timedelta(seconds=self._settings.auth.refresh_ttl_seconds),
        )
        record.revoked_at = now
        record.replaced_by = new_record.id
        await self._repo.create_refresh_token(new_record)
        await self._session.commit()

        access = create_access_token(user.id)
        return user, access, new_raw

    async def logout(self, raw_refresh: str | None) -> None:
        if not raw_refresh:
            return
        record = await self._repo.get_refresh_by_hash(hash_token(raw_refresh))
        if record is not None:
            await self._repo.revoke_family(record.family_id)
            await self._session.commit()

    async def _issue_token_pair(self, user: User) -> tuple[str, str]:
        now = datetime.now(timezone.utc)
        raw_refresh = generate_refresh_token()
        refresh_record = RefreshToken(
            id=uuid4(),
            user_id=user.id,
            token_hash=hash_token(raw_refresh),
            family_id=uuid4(),
            expires_at=now + timedelta(seconds=self._settings.auth.refresh_ttl_seconds),
        )
        await self._repo.create_refresh_token(refresh_record)
        return create_access_token(user.id, now=now), raw_refresh
