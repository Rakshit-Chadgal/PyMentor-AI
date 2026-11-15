from typing import Literal

from pydantic import BaseModel, Field


class ConceptSchema(BaseModel):
    name: str
    why: str


class LineExplanationSchema(BaseModel):
    line: int = Field(..., ge=1)
    explanation: str


class DryRunStepSchema(BaseModel):
    step: int = Field(..., ge=1)
    variables: dict[str, str]
    output: str = ""


class SampleIOSchema(BaseModel):
    input: str = ""
    output: str


class ComplexitySchema(BaseModel):
    time: str
    space: str


class ErrorAnalysisSchema(BaseModel):
    error_class: str
    root_cause: str
    fix_summary: str


class PracticePromptSchema(BaseModel):
    question: str
    hint: str
    solution: str | None = None


class CitationSchema(BaseModel):
    title: str
    section: str
    url: str


class TutorPayloadSchema(BaseModel):
    schema_version: str = "1.0"
    mode: Literal["explain", "solve", "debug", "practice", "chat"]
    level: Literal["beginner", "intermediate", "advanced"]
    topic: str
    title: str
    summary: str
    problem_understanding: str | None = None
    error_analysis: ErrorAnalysisSchema | None = None
    concepts: list[ConceptSchema] = Field(default_factory=list)
    approach: str | None = None
    algorithm: list[str] = Field(default_factory=list)
    code: str | None = None
    line_by_line: list[LineExplanationSchema] = Field(default_factory=list)
    dry_run: list[DryRunStepSchema] = Field(default_factory=list)
    sample_io: list[SampleIOSchema] = Field(default_factory=list)
    complexity: ComplexitySchema | None = None
    prevention: str | None = None
    practice: PracticePromptSchema | None = None
    citations: list[CitationSchema] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    follow_up_prompts: list[str] = Field(default_factory=list)
    refusal: bool = False
