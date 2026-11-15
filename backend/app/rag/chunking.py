import hashlib
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class MarkdownChunk:
    chunk_index: int
    section_path: str
    content: str
    token_estimate: int
    deterministic_id: str


_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$")


def _estimate_tokens(text: str) -> int:
    return max(1, len(text.split()) * 4 // 3)


def chunk_markdown(
    markdown: str,
    *,
    source_id: str,
    source_version: str,
    target_tokens: int = 900,
    min_tokens: int = 120,
) -> list[MarkdownChunk]:
    """Split Markdown by headings while keeping fenced code blocks intact."""
    lines = markdown.replace("\r\n", "\n").splitlines()
    sections: list[tuple[str, list[str]]] = []
    heading_stack: list[tuple[int, str]] = []
    current_lines: list[str] = []
    in_fence = False

    def current_path() -> str:
        return " > ".join(title for _, title in heading_stack) or "Overview"

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            current_lines.append(line)
            continue

        if not in_fence:
            match = _HEADING_RE.match(line)
            if match:
                if current_lines and "\n".join(current_lines).strip():
                    sections.append((current_path(), current_lines))
                    current_lines = []
                level = len(match.group(1))
                title = match.group(2).strip()
                heading_stack = [(lvl, t) for lvl, t in heading_stack if lvl < level]
                heading_stack.append((level, title))
                current_lines.append(line)
                continue

        current_lines.append(line)

    if current_lines and "\n".join(current_lines).strip():
        sections.append((current_path(), current_lines))

    # Merge tiny sections upward and split oversized sections safely outside fences
    chunks: list[MarkdownChunk] = []
    buffer_path = ""
    buffer_text = ""

    def flush(path: str, text: str) -> None:
        cleaned = text.strip()
        if not cleaned:
            return
        idx = len(chunks)
        digest = hashlib.sha256(
            f"{source_id}:{source_version}:{idx}:{cleaned}".encode("utf-8")
        ).hexdigest()[:32]
        chunks.append(
            MarkdownChunk(
                chunk_index=idx,
                section_path=path,
                content=cleaned,
                token_estimate=_estimate_tokens(cleaned),
                deterministic_id=digest,
            )
        )

    for path, sec_lines in sections:
        text = "\n".join(sec_lines).strip()
        if not buffer_text:
            buffer_path = path
            buffer_text = text
        elif _estimate_tokens(buffer_text) < min_tokens or (
            _estimate_tokens(buffer_text) + _estimate_tokens(text) <= target_tokens
        ):
            buffer_text = f"{buffer_text}\n\n{text}"
        else:
            flush(buffer_path, buffer_text)
            buffer_path = path
            buffer_text = text

    if buffer_text:
        flush(buffer_path, buffer_text)

    return chunks
