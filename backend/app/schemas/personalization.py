from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class PreferenceUpdate(BaseModel):
    default_level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    explanation_style: Literal["concise", "balanced", "detailed"] = "balanced"
    theme: Literal["light", "dark", "system"] = "system"
    editor_font_size: int = Field(default=14, ge=12, le=20)
    code_execution_enabled: bool = True


class PreferenceOut(PreferenceUpdate):
    user_id: UUID
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookmarkCreate(BaseModel):
    message_id: UUID | None = None
    conversation_id: UUID | None = None
    kind: Literal["explanation", "solution", "practice"] = "explanation"
    title: str = Field(..., min_length=1, max_length=200)
    payload: dict[str, object]


class BookmarkOut(BaseModel):
    id: UUID
    message_id: UUID | None
    conversation_id: UUID | None
    kind: str
    title: str
    payload: dict[str, object]
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedbackCreate(BaseModel):
    target_type: Literal["message", "execution", "answer"]
    target_id: UUID
    rating: Literal[-1, 0, 1]
    comment: str | None = Field(default=None, max_length=2000)


class TopicProgressOut(BaseModel):
    topic: str
    level: str
    attempts: int
    correct: int
    last_practiced_at: datetime

    model_config = {"from_attributes": True}


class ProgressSummaryOut(BaseModel):
    topics: list[TopicProgressOut]
    solved_count: int
    total_attempts: int
    accuracy_pct: float
