from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.errors import NotFoundError
from app.db.session import get_db_session
from app.models.personalization import (
    PracticeAttempt,
    PracticeSession,
    SolvedProblem,
    TopicProgress,
)
from app.models.user import User
from app.schemas.common import CursorMeta, PaginatedResponse
from app.schemas.practice import (
    PracticeAttemptCreate,
    PracticeAttemptOut,
    PracticeSessionCreate,
    PracticeSessionDetail,
    PracticeSessionOut,
    PracticeTopicOut,
)

router = APIRouter(prefix="/practice", tags=["practice"])

CURATED_TOPICS: list[PracticeTopicOut] = [
    PracticeTopicOut(
        slug="variables-and-types",
        name="Variables & Types",
        description="Integers, floats, booleans, None, dynamic binding, and type conversion.",
        recommended_level="beginner",
    ),
    PracticeTopicOut(
        slug="strings-and-slicing",
        name="Strings & Slicing",
        description="Immutability, slice notation [start:stop:step], formatting, and methods.",
        recommended_level="beginner",
    ),
    PracticeTopicOut(
        slug="lists-and-tuples",
        name="Lists & Tuples",
        description="Indexing, mutation vs aliasing, comprehensions, and unpacking.",
        recommended_level="beginner",
    ),
    PracticeTopicOut(
        slug="dictionaries-and-sets",
        name="Dictionaries & Sets",
        description="Hashable keys, frequency counting, set operations, and dict views.",
        recommended_level="intermediate",
    ),
    PracticeTopicOut(
        slug="functions-and-scope",
        name="Functions & Scope",
        description="Parameters, return values, LEGB scope, and avoiding mutable defaults.",
        recommended_level="intermediate",
    ),
    PracticeTopicOut(
        slug="recursion",
        name="Recursion",
        description="Base cases, recursive decomposition, call stack frames, and memoization.",
        recommended_level="intermediate",
    ),
    PracticeTopicOut(
        slug="error-handling",
        name="Error Handling & Debugging",
        description="Reading tracebacks, try/except/else/finally, and raising clear exceptions.",
        recommended_level="intermediate",
    ),
    PracticeTopicOut(
        slug="oop-and-dataclasses",
        name="OOP & Dataclasses",
        description="Classes, __init__, dunder methods, composition, and @dataclass.",
        recommended_level="advanced",
    ),
]


@router.get("/topics", response_model=list[PracticeTopicOut])
async def list_practice_topics() -> list[PracticeTopicOut]:
    return CURATED_TOPICS


@router.get("/sessions", response_model=PaginatedResponse[PracticeSessionOut])
async def list_practice_sessions(
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> PaginatedResponse[PracticeSessionOut]:
    stmt = (
        select(PracticeSession)
        .where(PracticeSession.user_id == current_user.id)
        .order_by(PracticeSession.started_at.desc())
        .limit(limit + 1)
    )
    rows = list((await session.execute(stmt)).scalars().all())
    has_more = len(rows) > limit
    items = rows[:limit]
    return PaginatedResponse(
        data=[PracticeSessionOut.model_validate(s) for s in items],
        meta=CursorMeta(next_cursor=None, has_more=has_more, limit=limit),
    )


@router.post("/sessions", response_model=PracticeSessionOut, status_code=201)
async def create_practice_session(
    body: PracticeSessionCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> PracticeSessionOut:
    practice_session = PracticeSession(
        user_id=current_user.id,
        topic=body.topic,
        difficulty=body.difficulty,
        mode=body.mode,
    )
    session.add(practice_session)
    await session.commit()
    return PracticeSessionOut.model_validate(practice_session)


@router.get("/sessions/{session_id}", response_model=PracticeSessionDetail)
async def get_practice_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> PracticeSessionDetail:
    stmt = select(PracticeSession).where(
        PracticeSession.id == session_id,
        PracticeSession.user_id == current_user.id,
    )
    ps = (await session.execute(stmt)).scalar_one_or_none()
    if ps is None:
        raise NotFoundError("Practice session not found.")

    attempts_stmt = (
        select(PracticeAttempt)
        .where(PracticeAttempt.session_id == ps.id)
        .order_by(PracticeAttempt.created_at.asc())
    )
    attempts = list((await session.execute(attempts_stmt)).scalars().all())
    out = PracticeSessionDetail.model_validate(ps)
    out.attempts = [PracticeAttemptOut.model_validate(a) for a in attempts]
    return out


@router.post("/sessions/{session_id}/attempts", response_model=PracticeAttemptOut, status_code=201)
async def record_practice_attempt(
    session_id: UUID,
    body: PracticeAttemptCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> PracticeAttemptOut:
    ps_stmt = select(PracticeSession).where(
        PracticeSession.id == session_id,
        PracticeSession.user_id == current_user.id,
    )
    ps = (await session.execute(ps_stmt)).scalar_one_or_none()
    if ps is None:
        raise NotFoundError("Practice session not found.")

    attempt = PracticeAttempt(
        session_id=ps.id,
        question=body.question,
        topic=ps.topic,
        user_answer=body.user_answer,
        is_correct=body.is_correct,
        feedback=body.feedback,
    )
    session.add(attempt)

    # Update TopicProgress mastery metrics
    prog_stmt = select(TopicProgress).where(
        TopicProgress.user_id == current_user.id,
        TopicProgress.topic == ps.topic,
    )
    progress = (await session.execute(prog_stmt)).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if progress is None:
        progress = TopicProgress(
            user_id=current_user.id,
            topic=ps.topic,
            level=ps.difficulty,
            attempts=1,
            correct=1 if body.is_correct else 0,
            mastery_score=Decimal("100.00") if body.is_correct else Decimal("0.00"),
            last_practiced_at=now,
        )
        session.add(progress)
    else:
        progress.attempts += 1
        if body.is_correct:
            progress.correct += 1
        pct = round((progress.correct / progress.attempts) * 100.0, 2)
        progress.mastery_score = Decimal(f"{pct:.2f}")
        progress.last_practiced_at = now

    if body.is_correct and body.problem_key:
        solved_stmt = select(SolvedProblem).where(
            SolvedProblem.user_id == current_user.id,
            SolvedProblem.problem_key == body.problem_key,
        )
        existing_solved = (await session.execute(solved_stmt)).scalar_one_or_none()
        if existing_solved is None:
            session.add(
                SolvedProblem(
                    user_id=current_user.id,
                    problem_key=body.problem_key,
                    title=body.problem_title or body.question[:120],
                    topic=ps.topic,
                    difficulty=ps.difficulty,
                    solution_summary=body.feedback[:500],
                )
            )

    await session.flush()

    all_attempts = list(
        (
            await session.execute(
                select(PracticeAttempt).where(PracticeAttempt.session_id == ps.id)
            )
        )
        .scalars()
        .all()
    )
    if all_attempts:
        correct_count = sum(1 for a in all_attempts if a.is_correct)
        ps.score = Decimal(f"{(correct_count / len(all_attempts)) * 100:.2f}")
        if body.is_correct and ps.completed_at is None:
            ps.completed_at = now

    await session.commit()
    return PracticeAttemptOut.model_validate(attempt)
