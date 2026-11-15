from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

TutorModeLiteral = Literal["auto", "explain", "solve", "debug", "practice", "chat"]
UserLevelLiteral = Literal["beginner", "intermediate", "advanced"]


class ConversationCreate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    mode: TutorModeLiteral = "auto"
    level: UserLevelLiteral = "beginner"


class ConversationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    mode: TutorModeLiteral | None = None
    level: UserLevelLiteral | None = None


class MessageOut(BaseModel):
    id: UUID
    conversation_id: UUID
    seq: int
    role: str
    content: str
    payload: dict[str, object] | None = None
    mode: str | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationSummary(BaseModel):
    id: UUID
    title: str
    mode: str
    level: str
    message_count: int
    last_message_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(ConversationSummary):
    messages: list[MessageOut] = Field(default_factory=list)


class ChatMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=12000)
    mode: TutorModeLiteral | None = None
    level: UserLevelLiteral | None = None
    client_message_id: str | None = Field(default=None, max_length=64)
    editor_code: str | None = Field(default=None, max_length=32768)
    editor_stderr: str | None = Field(default=None, max_length=16384)
