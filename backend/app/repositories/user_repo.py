from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.personalization import UserPreference
from app.models.user import RefreshToken, User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email.lower().strip())
        res = await self._session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_id(self, user_id: UUID) -> User | None:
        stmt = select(User).where(User.id == user_id)
        res = await self._session.execute(stmt)
        return res.scalar_one_or_none()

    async def create_user(
        self, *, email: str, password_hash: str, display_name: str | None
    ) -> User:
        user = User(
            email=email.lower().strip(),
            password_hash=password_hash,
            display_name=display_name,
        )
        self._session.add(user)
        await self._session.flush()
        pref = UserPreference(user_id=user.id)
        self._session.add(pref)
        await self._session.flush()
        return user

    async def create_refresh_token(self, token: RefreshToken) -> RefreshToken:
        self._session.add(token)
        await self._session.flush()
        return token

    async def get_refresh_by_hash(self, token_hash: str) -> RefreshToken | None:
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        res = await self._session.execute(stmt)
        return res.scalar_one_or_none()

    async def revoke_family(self, family_id: UUID) -> None:
        now = datetime.now(timezone.utc)
        stmt = (
            update(RefreshToken)
            .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await self._session.execute(stmt)
