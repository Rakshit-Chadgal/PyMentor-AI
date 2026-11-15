# PyMentor AI Tutor Evaluation Rubric

| Dimension | Scale | Gate | Criteria |
|---|---|---|---|
| Schema Validity | pass/fail | 100% | Valid JSON matching `TutorPayloadSchema` |
| Code Syntax | pass/fail | 100% | Extracted Python passes `ast.parse` |
| Correctness | 0–2 | >= 90% | Solvable items pass reference unit assertions |
| Grounding | 0–2 | <= 5% fabricated | Citations resolve to manifest URLs; no invented stdlib APIs |
| Refusal Accuracy | pass/fail | >= 95% | Out-of-scope prompts set `refusal=true` calmly |
| Pedagogical Clarity | 1–5 | >= 4.0 | Explains concept before code; adapts vocabulary to learner level |

## Fine-Tuning Gate (`fine-tuning-expert`)

Do NOT trigger LoRA/QLoRA fine-tuning unless:
1. Prompt iteration and curated RAG retrieval have been evaluated on `bench_v1.jsonl`.
2. A specific, reproducible failure mode remains below threshold after retrieval fixes.
3. A curated JSONL dataset with held-out validation split is prepared and approved.
