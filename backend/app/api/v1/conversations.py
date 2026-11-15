import json
from collections.abc import AsyncIterator
from datetime import datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.base import ChatTurn
from app.ai.pipeline import CircuitBreaker, run_tutor_pipeline
from app.ai.providers.openai_compatible import OpenAICompatibleProvider
from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.errors import NotFoundError
from app.core.rate_limit import rate_limiter
from app.db.session import get_db_session
from app.models.user import User
from app.repositories.conversation_repo import ConversationRepository
from app.schemas.common import CursorMeta, PaginatedResponse
from app.schemas.conversation import (
    ChatMessageRequest,
    ConversationCreate,
    ConversationDetail,
    ConversationSummary,
    ConversationUpdate,
    MessageOut,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])
_breaker = CircuitBreaker()


@router.get("", response_model=PaginatedResponse[ConversationSummary])
async def list_conversations(
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> PaginatedResponse[ConversationSummary]:
    cursor_dt = datetime.fromisoformat(cursor) if cursor else None
    repo = ConversationRepository(session)
    rows = await repo.list_for_user(current_user.id, cursor_dt=cursor_dt, limit=limit)
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = items[-1].last_message_at.isoformat() if has_more and items else None
    return PaginatedResponse(
        data=[ConversationSummary.model_validate(c) for c in items],
        meta=CursorMeta(next_cursor=next_cursor, has_more=has_more, limit=limit),
    )


@router.post("", response_model=ConversationSummary, status_code=201)
async def create_conversation(
    body: ConversationCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ConversationSummary:
    repo = ConversationRepository(session)
    conv = await repo.create(
        user_id=current_user.id,
        title=body.title or "New Python Lesson",
        mode=body.mode,
        level=body.level,
    )
    await session.commit()
    return ConversationSummary.model_validate(conv)


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ConversationDetail:
    repo = ConversationRepository(session)
    conv = await repo.get_owned(conversation_id, current_user.id, include_messages=True)
    if conv is None:
        raise NotFoundError("Conversation not found.")
    return ConversationDetail.model_validate(conv)


@router.patch("/{conversation_id}", response_model=ConversationSummary)
async def update_conversation(
    conversation_id: UUID,
    body: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ConversationSummary:
    repo = ConversationRepository(session)
    conv = await repo.get_owned(conversation_id, current_user.id)
    if conv is None:
        raise NotFoundError("Conversation not found.")
    if body.title is not None:
        conv.title = body.title
    if body.mode is not None:
        conv.mode = body.mode
    if body.level is not None:
        conv.level = body.level
    await session.commit()
    return ConversationSummary.model_validate(conv)


@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    repo = ConversationRepository(session)
    conv = await repo.get_owned(conversation_id, current_user.id)
    if conv is None:
        raise NotFoundError("Conversation not found.")
    await repo.soft_delete(conv)
    await session.commit()


@router.post("/{conversation_id}/messages", response_model=list[MessageOut], status_code=201)
async def send_message(
    conversation_id: UUID,
    body: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[MessageOut]:
    rate_limiter.check(f"chat:{current_user.id}", limit=30, window_seconds=60)
    repo = ConversationRepository(session)
    conv = await repo.get_owned(conversation_id, current_user.id, include_messages=True)
    if conv is None:
        raise NotFoundError("Conversation not found.")

    user_msg = await repo.append_message(conv, role="user", content=body.content)
    history = [
        ChatTurn(role="assistant" if m.role == "assistant" else "user", content=m.content)
        for m in conv.messages[:-1]
    ]

    settings = get_settings()
    provider = OpenAICompatibleProvider(
        base_url=settings.ai.base_url, api_key=settings.ai.api_key
    )
    payload, prompt_version = await run_tutor_pipeline(
        provider,
        prompt=body.content,
        history=history,
        mode=body.mode or conv.mode,
        level=body.level or conv.level,
        style="balanced",
        model=settings.ai.model,
        fallback_model=settings.ai.fallback_model,
        timeout=settings.ai.timeout_seconds,
        breaker=_breaker,
    )

    assistant_msg = await repo.append_message(
        conv,
        role="assistant",
        content=payload.summary,
        payload=payload.model_dump(),
        mode=payload.mode,
        model=settings.ai.model,
        provider=provider.name,
        prompt_version=prompt_version,
        status="complete",
    )
    await session.commit()
    return [MessageOut.model_validate(user_msg), MessageOut.model_validate(assistant_msg)]


@router.post("/{conversation_id}/messages/stream")
async def stream_message(
    conversation_id: UUID,
    body: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> StreamingResponse:
    rate_limiter.check(f"chat:{current_user.id}", limit=30, window_seconds=60)
    repo = ConversationRepository(session)
    conv = await repo.get_owned(conversation_id, current_user.id, include_messages=True)
    if conv is None:
        raise NotFoundError("Conversation not found.")

    await repo.append_message(conv, role="user", content=body.content)
    await session.commit()

    async def event_stream() -> AsyncIterator[str]:
        assistant_id = str(uuid4())
        mode = body.mode or conv.mode
        yield f"event: meta\ndata: {json.dumps({'conversation_id': str(conv.id), 'assistant_message_id': assistant_id, 'mode': mode})}\n\n"

        settings = get_settings()
        provider = OpenAICompatibleProvider(
            base_url=settings.ai.base_url, api_key=settings.ai.api_key
        )
        history = [
            ChatTurn(role="assistant" if m.role == "assistant" else "user", content=m.content)
            for m in conv.messages[:-1]
        ]
        try:
            payload, prompt_version = await run_tutor_pipeline(
                provider,
                prompt=body.content,
                history=history,
                mode=mode,
                level=body.level or conv.level,
                style="balanced",
                model=settings.ai.model,
                fallback_model=settings.ai.fallback_model,
                timeout=settings.ai.timeout_seconds,
                breaker=_breaker,
            )
            yield f"event: delta\ndata: {json.dumps({'text': payload.summary})}\n\n"
            saved = await repo.append_message(
                conv,
                role="assistant",
                content=payload.summary,
                payload=payload.model_dump(),
                mode=payload.mode,
                model=settings.ai.model,
                provider=provider.name,
                prompt_version=prompt_version,
                status="complete",
            )
            await session.commit()
            yield f"event: completed\ndata: {json.dumps({'message': {'id': str(saved.id), 'payload': payload.model_dump()}})}\n\n"
        except Exception as exc:
            yield f"event: error\ndata: {json.dumps({'type': 'https://pymentor.ai/errors/provider-error', 'title': 'Provider Error', 'status': 502, 'detail': str(exc)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
