from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, Message


class ConversationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_user(
        self,
        user_id: UUID,
        *,
        cursor_dt: datetime | None = None,
        limit: int = 20,
    ) -> list[Conversation]:
        stmt = (
            select(Conversation)
            .where(Conversation.user_id == user_id, Conversation.deleted_at.is_(None))
            .order_by(Conversation.last_message_at.desc())
            .limit(limit + 1)
        )
        if cursor_dt is not None:
            stmt = stmt.where(Conversation.last_message_at < cursor_dt)
        res = await self._session.execute(stmt)
        return list(res.scalars().all())

    async def get_owned(
        self, conversation_id: UUID, user_id: UUID, *, include_messages: bool = False
    ) -> Conversation | None:
        stmt = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
            Conversation.deleted_at.is_(None),
        )
        if include_messages:
            stmt = stmt.options(selectinload(Conversation.messages))
        res = await self._session.execute(stmt)
        return res.scalar_one_or_none()

    async def create(
        self,
        *,
        user_id: UUID,
        title: str,
        mode: str,
        level: str,
    ) -> Conversation:
        conv = Conversation(user_id=user_id, title=title, mode=mode, level=level)
        self._session.add(conv)
        await self._session.flush()
        return conv

    async def append_message(
        self,
        conversation: Conversation,
        *,
        role: str,
        content: str,
        payload: dict[str, object] | None = None,
        mode: str | None = None,
        model: str | None = None,
        provider: str | None = None,
        prompt_version: str | None = None,
        status: str = "complete",
    ) -> Message:
        stmt = select(func.coalesce(func.max(Message.seq), 0)).where(
            Message.conversation_id == conversation.id
        )
        res = await self._session.execute(stmt)
        next_seq = int(res.scalar_one()) + 1
        now = datetime.now(timezone.utc)

        msg = Message(
            conversation_id=conversation.id,
            seq=next_seq,
            role=role,
            content=content,
            payload=payload,
            mode=mode,
            model=model,
            provider=provider,
            prompt_version=prompt_version,
            status=status,
        )
        self._session.add(msg)
        conversation.message_count += 1
        conversation.last_message_at = now
        await self._session.flush()
        return msg

    async def soft_delete(self, conversation: Conversation) -> None:
        conversation.deleted_at = datetime.now(timezone.utc)
        await self._session.flush()
