from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.errors import NotFoundError
from app.db.session import get_db_session
from app.models.personalization import (
    Bookmark,
    Feedback,
    SolvedProblem,
    TopicProgress,
    UserPreference,
)
from app.models.user import User
from app.schemas.common import CursorMeta, PaginatedResponse
from app.schemas.personalization import (
    BookmarkCreate,
    BookmarkOut,
    FeedbackCreate,
    PreferenceOut,
    PreferenceUpdate,
    ProgressSummaryOut,
    TopicProgressOut,
)

router = APIRouter(tags=["personalization"])


@router.get("/preferences", response_model=PreferenceOut)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> PreferenceOut:
    stmt = select(UserPreference).where(UserPreference.user_id == current_user.id)
    res = await session.execute(stmt)
    pref = res.scalar_one_or_none()
    if pref is None:
        pref = UserPreference(user_id=current_user.id)
        session.add(pref)
        await session.commit()
    return PreferenceOut.model_validate(pref)


@router.put("/preferences", response_model=PreferenceOut)
async def update_preferences(
    body: PreferenceUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> PreferenceOut:
    stmt = select(UserPreference).where(UserPreference.user_id == current_user.id)
    res = await session.execute(stmt)
    pref = res.scalar_one_or_none()
    if pref is None:
        pref = UserPreference(user_id=current_user.id)
        session.add(pref)
    pref.default_level = body.default_level
    pref.explanation_style = body.explanation_style
    pref.theme = body.theme
    pref.editor_font_size = body.editor_font_size
    pref.code_execution_enabled = body.code_execution_enabled
    await session.commit()
    return PreferenceOut.model_validate(pref)


@router.get("/progress", response_model=ProgressSummaryOut)
async def get_progress(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ProgressSummaryOut:
    topic_stmt = (
        select(TopicProgress)
        .where(TopicProgress.user_id == current_user.id)
        .order_by(TopicProgress.last_practiced_at.desc())
    )
    topics = list((await session.execute(topic_stmt)).scalars().all())
    solved_count = int(
        (
            await session.execute(
                select(func.count()).select_from(SolvedProblem).where(
                    SolvedProblem.user_id == current_user.id
                )
            )
        ).scalar_one()
    )
    total_attempts = sum(t.attempts for t in topics)
    total_correct = sum(t.correct for t in topics)
    accuracy = round((total_correct / total_attempts) * 100.0, 1) if total_attempts else 0.0
    return ProgressSummaryOut(
        topics=[TopicProgressOut.model_validate(t) for t in topics],
        solved_count=solved_count,
        total_attempts=total_attempts,
        accuracy_pct=accuracy,
    )


@router.get("/bookmarks", response_model=PaginatedResponse[BookmarkOut])
async def list_bookmarks(
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> PaginatedResponse[BookmarkOut]:
    stmt = (
        select(Bookmark)
        .where(Bookmark.user_id == current_user.id)
        .order_by(Bookmark.created_at.desc())
        .limit(limit + 1)
    )
    rows = list((await session.execute(stmt)).scalars().all())
    has_more = len(rows) > limit
    items = rows[:limit]
    return PaginatedResponse(
        data=[BookmarkOut.model_validate(b) for b in items],
        meta=CursorMeta(next_cursor=None, has_more=has_more, limit=limit),
    )


@router.post("/bookmarks", response_model=BookmarkOut, status_code=201)
async def create_bookmark(
    body: BookmarkCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> BookmarkOut:
    bm = Bookmark(
        user_id=current_user.id,
        message_id=body.message_id,
        conversation_id=body.conversation_id,
        kind=body.kind,
        title=body.title,
        payload=body.payload,
    )
    session.add(bm)
    await session.commit()
    return BookmarkOut.model_validate(bm)


@router.delete("/bookmarks/{bookmark_id}", status_code=204)
async def delete_bookmark(
    bookmark_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    stmt = select(Bookmark).where(
        Bookmark.id == bookmark_id, Bookmark.user_id == current_user.id
    )
    bm = (await session.execute(stmt)).scalar_one_or_none()
    if bm is None:
        raise NotFoundError("Bookmark not found.")
    await session.delete(bm)
    await session.commit()


@router.post("/feedback", status_code=201)
async def submit_feedback(
    body: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    fb = Feedback(
        user_id=current_user.id,
        target_type=body.target_type,
        target_id=body.target_id,
        rating=body.rating,
        comment=body.comment,
    )
    session.add(fb)
    await session.commit()
    return {"status": "recorded"}
