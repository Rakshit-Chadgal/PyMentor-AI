from app.limits import clamp_timeout_ms, extract_error_class, truncate_output
from app.sandbox import build_docker_args


def test_docker_hardening_flags_enforced() -> None:
    args = build_docker_args("/tmp/work_test", 5.0)
    joined = " ".join(args)
    assert "--network none" in joined
    assert "--read-only" in joined
    assert "--cap-drop ALL" in joined
    assert "--security-opt no-new-privileges" in joined
    assert "--pids-limit 64" in joined
    assert "--user 10001:10001" in joined
    assert "--memory 256m" in joined
    assert "python3 -I /work/main.py" in joined


def test_timeout_and_output_limits() -> None:
    assert clamp_timeout_ms(50) == 1000
    assert clamp_timeout_ms(999999) == 10000

    truncated, flag = truncate_output("A" * 70000, limit_bytes=65536)
    assert flag is True
    assert len(truncated.encode("utf-8")) == 65536


def test_error_class_extraction() -> None:
    tb = (
        'Traceback (most recent call last):\n'
        '  File "/work/main.py", line 1, in <module>\n'
        '    print(1 / 0)\n'
        'ZeroDivisionError: division by zero'
    )
    assert extract_error_class(tb) == "ZeroDivisionError"
