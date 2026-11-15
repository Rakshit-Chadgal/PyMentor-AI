from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ExecutionRequest(BaseModel):
    language: Literal["python"] = "python"
    source: str = Field(..., min_length=1, max_length=32768)
    stdin: str = Field(default="", max_length=8192)
    timeout_ms: int = Field(default=5000, ge=1000, le=10000)
    conversation_id: UUID | None = None


class TruncationInfo(BaseModel):
    stdout: bool = False
    stderr: bool = False


class ExecutionResponse(BaseModel):
    id: UUID | None = None
    request_id: str
    status: Literal["ok", "error", "timeout", "memory", "output_limit", "killed"]
    exit_code: int
    stdout: str
    stderr: str
    truncated: TruncationInfo
    duration_ms: int
    error_class: str | None = None
