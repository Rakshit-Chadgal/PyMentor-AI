from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class PracticeTopicOut(BaseModel):
    slug: str
    name: str
    description: str
    recommended_level: Literal["beginner", "intermediate", "advanced"]


class PracticeSessionCreate(BaseModel):
    topic: str = Field(..., min_length=1, max_length=120)
    difficulty: Literal["beginner", "intermediate", "advanced"] = "beginner"
    mode: Literal["hint_first", "quiz"] = "hint_first"


class PracticeAttemptCreate(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    user_answer: str = Field(..., min_length=1, max_length=20000)
    is_correct: bool
    feedback: str = Field(..., min_length=1, max_length=4000)
    problem_key: str | None = Field(default=None, max_length=200)
    problem_title: str | None = Field(default=None, max_length=200)


class PracticeAttemptOut(BaseModel):
    id: UUID
    session_id: UUID
    question: str
    topic: str
    user_answer: str
    is_correct: bool
    feedback: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PracticeSessionOut(BaseModel):
    id: UUID
    topic: str
    difficulty: str
    mode: str
    started_at: datetime
    completed_at: datetime | None
    score: Decimal | None

    model_config = {"from_attributes": True}


class PracticeSessionDetail(PracticeSessionOut):
    attempts: list[PracticeAttemptOut] = Field(default_factory=list)
