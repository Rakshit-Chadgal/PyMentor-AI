from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

PROBLEM_BASE_URI = "https://pymentor.ai/errors"


class ProblemDetail(BaseModel):
    type: str
    title: str
    status: int
    detail: str
    instance: str | None = None
    errors: list[dict[str, str]] | None = None


class DomainError(Exception):
    def __init__(
        self,
        *,
        slug: str,
        title: str,
        status: int,
        detail: str,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(detail)
        self.type = f"{PROBLEM_BASE_URI}/{slug}"
        self.title = title
        self.status = status
        self.detail = detail
        self.headers = headers or {}


class ValidationDomainError(DomainError):
    def __init__(self, detail: str = "Request failed validation") -> None:
        super().__init__(slug="validation-error", title="Validation Error", status=422, detail=detail)


class InvalidCredentialsError(DomainError):
    def __init__(self) -> None:
        super().__init__(
            slug="invalid-credentials",
            title="Invalid Credentials",
            status=401,
            detail="Email or password is incorrect.",
        )


class TokenRevokedError(DomainError):
    def __init__(self, detail: str = "Session expired or revoked. Sign in again.") -> None:
        super().__init__(slug="token-revoked", title="Token Revoked", status=401, detail=detail)


class ForbiddenError(DomainError):
    def __init__(self, detail: str = "You do not have access to this resource.") -> None:
        super().__init__(slug="forbidden", title="Forbidden", status=403, detail=detail)


class NotFoundError(DomainError):
    def __init__(self, detail: str = "Resource not found.") -> None:
        super().__init__(slug="not-found", title="Not Found", status=404, detail=detail)


class ConflictError(DomainError):
    def __init__(self, detail: str = "Resource already exists.") -> None:
        super().__init__(slug="conflict", title="Conflict", status=409, detail=detail)


class RateLimitedError(DomainError):
    def __init__(self, retry_after: int = 60) -> None:
        super().__init__(
            slug="rate-limited",
            title="Rate Limited",
            status=429,
            detail="Too many requests. Please slow down briefly.",
            headers={"Retry-After": str(retry_after)},
        )


class ExecutionUnavailableError(DomainError):
    def __init__(self, detail: str = "Python execution sandbox is unavailable.") -> None:
        super().__init__(
            slug="execution-unavailable",
            title="Execution Unavailable",
            status=503,
            detail=detail,
        )


class ProviderTimeoutError(DomainError):
    def __init__(self, detail: str = "The tutor timed out; please retry.") -> None:
        super().__init__(
            slug="provider-timeout",
            title="Provider Timeout",
            status=504,
            detail=detail,
        )


class ProviderError(DomainError):
    def __init__(self, detail: str = "The tutor request could not be processed.") -> None:
        super().__init__(slug="provider-error", title="Provider Error", status=502, detail=detail)


async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    body = ProblemDetail(
        type=exc.type,
        title=exc.title,
        status=exc.status,
        detail=exc.detail,
        instance=request_id,
    )
    return JSONResponse(
        status_code=exc.status,
        content=body.model_dump(exclude_none=True),
        media_type="application/problem+json",
        headers=exc.headers,
    )


async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    errors = [
        {
            "field": ".".join(str(p) for p in err.get("loc", [])),
            "message": str(err.get("msg", "Invalid value")),
        }
        for err in exc.errors()
    ]
    body = ProblemDetail(
        type=f"{PROBLEM_BASE_URI}/validation-error",
        title="Validation Error",
        status=422,
        detail="One or more request fields failed validation.",
        instance=request_id,
        errors=errors,
    )
    return JSONResponse(
        status_code=422,
        content=body.model_dump(exclude_none=True),
        media_type="application/problem+json",
    )
