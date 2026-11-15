"""Offline benchmark dataset validator and syntax gate for PyMentor AI."""

import ast
import json
from pathlib import Path


def run_dataset_check(dataset_path: Path) -> dict[str, int]:
    total = 0
    valid_tests = 0
    refusal_cases = 0

    for line in dataset_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        item = json.loads(line)
        total += 1
        test_code = item.get("test_code", "")
        if test_code:
            ast.parse(test_code)
            valid_tests += 1
        if item.get("expect_refusal"):
            refusal_cases += 1

    return {
        "total_items": total,
        "executable_test_items": valid_tests,
        "refusal_items": refusal_cases,
    }


if __name__ == "__main__":
    path = Path(__file__).resolve().parent.parent / "datasets" / "bench_v1.jsonl"
    report = run_dataset_check(path)
    print(json.dumps(report, indent=2))
