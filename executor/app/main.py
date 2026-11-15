import hmac
import os
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from app.limits import MAX_CODE_BYTES, MAX_STDIN_BYTES
from app.sandbox import run_sandboxed_python

app = FastAPI(title="PyMentor Internal Execution Service", docs_url=None, redoc_url=None)


class ExecutePayload(BaseModel):
    request_id: str
    language: Literal["python"] = "python"
    source: str = Field(..., min_length=1, max_length=MAX_CODE_BYTES)
    stdin: str = Field(default="", max_length=MAX_STDIN_BYTES)
    timeout_ms: int = Field(default=5000, ge=1000, le=10000)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/internal/execute")
def execute(
    body: ExecutePayload,
    x_executor_token: str | None = Header(default=None),
) -> dict[str, object]:
    expected = os.environ.get("EXECUTION__INTERNAL_TOKEN", "")
    if not expected or not x_executor_token or not hmac.compare_digest(x_executor_token, expected):
        raise HTTPException(status_code=401, detail="Invalid internal executor token")

    return run_sandboxed_python(
        request_id=body.request_id,
        source=body.source,
        stdin=body.stdin,
        timeout_ms=body.timeout_ms,
    )
