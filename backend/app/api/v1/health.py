from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db_session

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def ready(session: AsyncSession = Depends(get_db_session)) -> JSONResponse:
    checks: dict[str, str] = {}
    healthy = True
    try:
        await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "unavailable"
        healthy = False

    settings = get_settings()
    checks["ai_provider"] = "configured" if settings.ai.api_key else "unconfigured"
    checks["execution"] = "enabled" if settings.execution.enabled else "disabled"

    return JSONResponse(
        status_code=200 if healthy else 503,
        content={"status": "ready" if healthy else "degraded", "checks": checks},
    )


@router.get("/version")
async def version() -> dict[str, str]:
    settings = get_settings()
    return {"version": settings.app.version, "env": settings.app.env}
