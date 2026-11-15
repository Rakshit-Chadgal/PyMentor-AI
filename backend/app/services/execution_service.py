import httpx

from app.core.config import get_settings
from app.core.errors import ExecutionUnavailableError
from app.schemas.execution import ExecutionRequest, ExecutionResponse


class ExecutionService:
    def __init__(self) -> None:
        self._settings = get_settings()

    async def execute(self, payload: ExecutionRequest, *, request_id: str) -> ExecutionResponse:
        if not self._settings.execution.enabled:
            raise ExecutionUnavailableError(
                "Code execution is temporarily disabled by configuration."
            )

        try:
            async with httpx.AsyncClient(
                timeout=self._settings.execution.timeout_seconds + 2.0
            ) as client:
                resp = await client.post(
                    f"{self._settings.execution.url.rstrip('/')}/internal/execute",
                    headers={
                        "X-Executor-Token": self._settings.execution.internal_token,
                        "X-Request-ID": request_id,
                    },
                    json={
                        "request_id": request_id,
                        "language": payload.language,
                        "source": payload.source,
                        "stdin": payload.stdin,
                        "timeout_ms": payload.timeout_ms,
                    },
                )
                if resp.status_code >= 500:
                    raise ExecutionUnavailableError("Execution sandbox failed to respond.")
                if resp.status_code >= 400:
                    raise ExecutionUnavailableError("Execution payload rejected by sandbox.")
                return ExecutionResponse.model_validate(resp.json())
        except httpx.HTTPError as exc:
            raise ExecutionUnavailableError("Execution sandbox unreachable.") from exc
