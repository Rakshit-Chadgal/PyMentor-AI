from dataclasses import dataclass


@dataclass(frozen=True)
class RankedCandidate:
    chunk_id: str
    section_path: str
    content: str
    source_title: str
    source_url: str


def reciprocal_rank_fusion(
    dense_ids: list[str],
    lexical_ids: list[str],
    *,
    k: int = 60,
    top_n: int = 10,
) -> list[tuple[str, float]]:
    scores: dict[str, float] = {}
    for rank, cid in enumerate(dense_ids, start=1):
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank)
    for rank, cid in enumerate(lexical_ids, start=1):
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank)

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return ranked[:top_n]


def assemble_grounded_context(
    candidates: list[RankedCandidate],
    *,
    max_words: int = 1500,
) -> tuple[str, set[str]]:
    blocks: list[str] = []
    allowed_urls: set[str] = set()
    used_words = 0

    for i, item in enumerate(candidates, start=1):
        words = len(item.content.split())
        if used_words + words > max_words and blocks:
            break
        blocks.append(
            f"[REFERENCE {i}] {item.source_title} ({item.section_path}) — {item.source_url}\n{item.content}"
        )
        allowed_urls.add(item.source_url)
        used_words += words

    return "\n\n".join(blocks), allowed_urls
