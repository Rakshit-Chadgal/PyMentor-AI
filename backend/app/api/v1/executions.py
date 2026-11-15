from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.rate_limit import rate_limiter
from app.db.session import get_db_session
from app.models.personalization import ExecutionRecord
from app.models.user import User
from app.schemas.execution import ExecutionRequest, ExecutionResponse
from app.services.execution_service import ExecutionService

router = APIRouter(prefix="/executions", tags=["executions"])


@router.post("", response_model=ExecutionResponse)
async def run_code(
    body: ExecutionRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ExecutionResponse:
    settings = get_settings()
    rate_limiter.check(
        f"exec:{current_user.id}",
        limit=settings.execution.daily_quota,
        window_seconds=86400,
    )
    request_id = getattr(request.state, "request_id", "exec-req")
    svc = ExecutionService()
    result = await svc.execute(body, request_id=request_id)

    record = ExecutionRecord(
        user_id=current_user.id,
        conversation_id=body.conversation_id,
        language=body.language,
        status=result.status,
        exit_code=result.exit_code,
        duration_ms=result.duration_ms,
        stdout_truncated=result.stdout[:2000],
        stderr_truncated=result.stderr[:2000],
        error_class=result.error_class,
    )
    session.add(record)
    await session.commit()
    result.id = record.id
    return result
