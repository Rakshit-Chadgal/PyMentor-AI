from fastapi import APIRouter, Cookie, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.errors import TokenRevokedError
from app.core.rate_limit import rate_limiter
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.auth import AuthTokenResponse, LoginRequest, RegisterRequest, UserSummary
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
REFRESH_COOKIE_NAME = "pymentor_refresh"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.auth.cookie_secure,
        samesite=settings.auth.cookie_samesite,
        max_age=settings.auth.refresh_ttl_seconds,
        path="/api/v1/auth",
    )


@router.post("/register", response_model=AuthTokenResponse, status_code=201)
async def register(
    body: RegisterRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> AuthTokenResponse:
    client_ip = request.client.host if request.client else "unknown"
    rate_limiter.check(f"register:{client_ip}", limit=10, window_seconds=300)

    svc = AuthService(session)
    user, access, refresh = await svc.register(
        email=body.email, password=body.password, display_name=body.display_name
    )
    _set_refresh_cookie(response, refresh)
    return AuthTokenResponse(
        access_token=access,
        expires_in=get_settings().auth.access_ttl_seconds,
        user=UserSummary.model_validate(user),
    )


@router.post("/login", response_model=AuthTokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> AuthTokenResponse:
    client_ip = request.client.host if request.client else "unknown"
    rate_limiter.check(f"login:{client_ip}", limit=15, window_seconds=300)

    svc = AuthService(session)
    user, access, refresh = await svc.login(email=body.email, password=body.password)
    _set_refresh_cookie(response, refresh)
    return AuthTokenResponse(
        access_token=access,
        expires_in=get_settings().auth.access_ttl_seconds,
        user=UserSummary.model_validate(user),
    )


@router.post("/refresh", response_model=AuthTokenResponse)
async def refresh(
    response: Response,
    pymentor_refresh: str | None = Cookie(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> AuthTokenResponse:
    if not pymentor_refresh:
        raise TokenRevokedError("Missing refresh cookie.")
    svc = AuthService(session)
    user, access, new_refresh = await svc.rotate_refresh(pymentor_refresh)
    _set_refresh_cookie(response, new_refresh)
    return AuthTokenResponse(
        access_token=access,
        expires_in=get_settings().auth.access_ttl_seconds,
        user=UserSummary.model_validate(user),
    )


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    pymentor_refresh: str | None = Cookie(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    svc = AuthService(session)
    await svc.logout(pymentor_refresh)
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/api/v1/auth")


@router.get("/me", response_model=UserSummary)
async def me(current_user: User = Depends(get_current_user)) -> UserSummary:
    return UserSummary.model_validate(current_user)
