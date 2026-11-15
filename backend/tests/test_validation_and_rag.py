from pathlib import Path

from app.ai.pipeline import CircuitBreaker, classify_intent
from app.ai.validation import validate_python_syntax, validate_tutor_output
from app.rag.chunking import chunk_markdown
from app.rag.ingestion import ingest_from_manifest
from app.rag.retrieval import RankedCandidate, assemble_grounded_context, reciprocal_rank_fusion


def test_validate_python_syntax_accepts_valid_code() -> None:
    ok, err = validate_python_syntax("def add(a, b):\n    return a + b\n")
    assert ok is True
    assert err is None


def test_validate_python_syntax_rejects_broken_code() -> None:
    ok, err = validate_python_syntax("def add(a, b)\n    return a + b")
    assert ok is False
    assert err is not None and "Line 1" in err


def test_validate_tutor_output_strips_unverified_citations() -> None:
    raw = {
        "mode": "solve",
        "level": "beginner",
        "topic": "Strings",
        "title": "Reverse string",
        "summary": "Use slicing.",
        "code": "s = 'abc'\nprint(s[::-1])",
        "line_by_line": [
            {"line": 1, "explanation": "Bind text."},
            {"line": 2, "explanation": "Slice backwards."},
            {"line": 99, "explanation": "Out of bounds line."},
        ],
        "citations": [
            {"title": "Official", "section": "Strings", "url": "https://docs.python.org/3/"},
            {"title": "Fake", "section": "Hallucinated", "url": "https://example.com/fake"},
        ],
    }
    outcome = validate_tutor_output(
        raw, allowed_citation_urls={"https://docs.python.org/3/"}
    )
    assert outcome.code_valid is True
    assert len(outcome.payload.citations) == 1
    assert outcome.payload.citations[0].url == "https://docs.python.org/3/"
    assert len(outcome.payload.line_by_line) == 2


def test_intent_classifier_and_circuit_breaker() -> None:
    assert classify_intent("Why does this traceback say IndexError?", explicit_mode="auto") == "debug"
    assert classify_intent("Write a function to check primes", explicit_mode="auto") == "solve"
    assert classify_intent("Give me a quiz on dicts", explicit_mode="auto") == "practice"

    breaker = CircuitBreaker(failure_threshold=2, reset_seconds=60.0)
    assert breaker.allow() is True
    breaker.record_failure()
    assert breaker.allow() is True
    breaker.record_failure()
    assert breaker.allow() is False
    breaker.record_success()
    assert breaker.allow() is True


def test_markdown_chunker_preserves_code_fences() -> None:
    md = (
        "# Strings\n\n"
        "Intro text.\n\n"
        "```python\n"
        "# Not a heading inside code\n"
        "def f():\n"
        "    return 42\n"
        "```\n\n"
        "## More\n\n"
        "Closing paragraph."
    )
    chunks = chunk_markdown(md, source_id="py-docs", source_version="3.12", target_tokens=80)
    assert len(chunks) >= 1
    combined = "\n".join(c.content for c in chunks)
    assert "```python\n# Not a heading inside code" in combined


def test_rrf_and_context_assembly() -> None:
    fused = reciprocal_rank_fusion(["c1", "c2", "c3"], ["c2", "c4", "c1"], top_n=2)
    assert fused[0][0] in {"c1", "c2"}
    ctx, urls = assemble_grounded_context(
        [
            RankedCandidate(
                chunk_id="c1",
                section_path="Lists",
                content="Lists are mutable.",
                source_title="Python Docs",
                source_url="https://docs.python.org/3/tutorial/",
            )
        ]
    )
    assert "[REFERENCE 1]" in ctx
    assert "https://docs.python.org/3/tutorial/" in urls


def test_manifest_ingestion_produces_deterministic_chunks() -> None:
    manifest = (
        Path(__file__).resolve().parents[2]
        / "knowledge_base"
        / "sources"
        / "manifest.yaml"
    )
    reports, chunks = ingest_from_manifest(manifest)
    assert len(reports) >= 2
    assert len(chunks) >= 2
    ids = [c.deterministic_id for c in chunks]
    assert len(ids) == len(set(ids))
