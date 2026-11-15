import ast
from dataclasses import dataclass

from app.core.logging import redact_secrets
from app.schemas.tutor import CitationSchema, TutorPayloadSchema


@dataclass(frozen=True)
class ValidationOutcome:
    payload: TutorPayloadSchema
    code_valid: bool
    warnings: list[str]


def validate_python_syntax(code: str) -> tuple[bool, str | None]:
    try:
        ast.parse(code)
        return True, None
    except SyntaxError as exc:
        return False, f"Line {exc.lineno}: {exc.msg}"


def validate_tutor_output(
    raw_data: dict[str, object],
    *,
    allowed_citation_urls: set[str] | None = None,
) -> ValidationOutcome:
    payload = TutorPayloadSchema.model_validate(raw_data)
    extra_warnings: list[str] = []

    # Redact any accidental secret-like patterns
    payload.summary = redact_secrets(payload.summary)
    if payload.code:
        payload.code = redact_secrets(payload.code)

    # Validate Python syntax when code is provided
    code_valid = True
    if payload.code and payload.code.strip():
        ok, err_msg = validate_python_syntax(payload.code)
        code_valid = ok
        if not ok and err_msg:
            extra_warnings.append(f"Generated snippet failed syntax validation ({err_msg}).")

    # Strip unverified citations against allowlist
    if allowed_citation_urls is not None:
        filtered: list[CitationSchema] = [
            c for c in payload.citations if c.url in allowed_citation_urls
        ]
        payload.citations = filtered

    # Align line_by_line strictly to code line bounds
    if payload.code:
        max_line = len(payload.code.splitlines())
        payload.line_by_line = [
            item for item in payload.line_by_line if 1 <= item.line <= max_line
        ]
        if max_line > 25:
            payload.dry_run = []
    else:
        payload.line_by_line = []
        payload.dry_run = []

    if extra_warnings:
        payload.warnings = [*payload.warnings, *extra_warnings]

    return ValidationOutcome(
        payload=payload,
        code_valid=code_valid,
        warnings=extra_warnings,
    )
