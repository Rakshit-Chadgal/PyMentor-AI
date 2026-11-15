"""Offline and database-backed ingestion pipeline for Python knowledge base documents."""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import asdict, dataclass
from pathlib import Path

import yaml

from app.rag.chunking import MarkdownChunk, chunk_markdown


@dataclass(frozen=True)
class IngestedSourceReport:
    source_id: str
    title: str
    source_url: str
    license: str
    content_hash: str
    chunk_count: int
    deterministic_ids: list[str]


def ingest_from_manifest(manifest_path: Path) -> tuple[list[IngestedSourceReport], list[MarkdownChunk]]:
    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    version = str(manifest.get("version", "1.0"))
    sources = manifest.get("sources", [])
    base_dir = manifest_path.parent

    reports: list[IngestedSourceReport] = []
    all_chunks: list[MarkdownChunk] = []

    for entry in sources:
        rel_file = entry["file"]
        source_path = (base_dir / rel_file).resolve()
        raw_text = source_path.read_text(encoding="utf-8")
        content_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()

        chunks = chunk_markdown(
            raw_text,
            source_id=entry["id"],
            source_version=version,
        )
        all_chunks.extend(chunks)
        reports.append(
            IngestedSourceReport(
                source_id=entry["id"],
                title=entry["title"],
                source_url=entry["source_url"],
                license=entry["license"],
                content_hash=content_hash,
                chunk_count=len(chunks),
                deterministic_ids=[c.deterministic_id for c in chunks],
            )
        )

    return reports, all_chunks


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest PyMentor curated Python docs")
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path(__file__).resolve().parents[3] / "knowledge_base" / "sources" / "manifest.yaml",
    )
    args = parser.parse_args()
    reports, all_chunks = ingest_from_manifest(args.manifest)
    print(
        json.dumps(
            {
                "sources_processed": len(reports),
                "total_chunks": len(all_chunks),
                "reports": [asdict(r) for r in reports],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
