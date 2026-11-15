import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from app.limits import clamp_timeout_ms, extract_error_class, truncate_output


def build_docker_args(work_dir: str, timeout_s: float) -> list[str]:
    seccomp_path = Path(__file__).resolve().parent.parent / "seccomp" / "python-sandbox.json"
    args = [
        "docker",
        "run",
        "--rm",
        "--init",
        "--network",
        "none",
        "--read-only",
        "--memory",
        "256m",
        "--memory-swap",
        "256m",
        "--cpus",
        "0.5",
        "--pids-limit",
        "64",
        "--user",
        "10001:10001",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        "--ulimit",
        "nofile=64:64",
        "--ulimit",
        "fsize=1048576:1048576",
        "--tmpfs",
        "/tmp:rw,noexec,nosuid,size=16m",
        "--mount",
        f"type=bind,source={work_dir},target=/work,readonly",
        "--workdir",
        "/work",
        "--stop-timeout",
        "1",
    ]
    if seccomp_path.exists():
        args.extend(["--security-opt", f"seccomp={seccomp_path}"])
    args.extend(["python:3.11-slim", "python3", "-I", "/work/main.py"])
    return args


def run_sandboxed_python(
    *,
    request_id: str,
    source: str,
    stdin: str,
    timeout_ms: int | None,
) -> dict[str, object]:
    clamped_ms = clamp_timeout_ms(timeout_ms)
    timeout_s = clamped_ms / 1000.0
    start = time.perf_counter()

    temp_dir = tempfile.mkdtemp(prefix="pymentor_run_")
    try:
        main_file = Path(temp_dir) / "main.py"
        main_file.write_text(source, encoding="utf-8")

        docker_bin = shutil.which("docker")
        if docker_bin is None:
            return {
                "request_id": request_id,
                "status": "error",
                "exit_code": 1,
                "stdout": "",
                "stderr": "Docker runtime is required for server-side container isolation.",
                "truncated": {"stdout": False, "stderr": False},
                "duration_ms": 0,
                "error_class": "SandboxUnavailable",
            }

        cmd = build_docker_args(temp_dir, timeout_s)
        try:
            proc = subprocess.run(
                cmd,
                input=stdin,
                text=True,
                capture_output=True,
                timeout=timeout_s,
                env={"PATH": os.environ.get("PATH", "/usr/bin:/bin")},
            )
            duration_ms = int((time.perf_counter() - start) * 1000)
            stdout, out_trunc = truncate_output(proc.stdout)
            stderr, err_trunc = truncate_output(proc.stderr)
            status = (
                "output_limit"
                if (out_trunc or err_trunc)
                else ("ok" if proc.returncode == 0 else "error")
            )
            return {
                "request_id": request_id,
                "status": status,
                "exit_code": proc.returncode,
                "stdout": stdout,
                "stderr": stderr,
                "truncated": {"stdout": out_trunc, "stderr": err_trunc},
                "duration_ms": duration_ms,
                "error_class": None if proc.returncode == 0 else extract_error_class(stderr),
            }
        except subprocess.TimeoutExpired:
            duration_ms = int((time.perf_counter() - start) * 1000)
            return {
                "request_id": request_id,
                "status": "timeout",
                "exit_code": 124,
                "stdout": "",
                "stderr": f"Execution stopped after {timeout_s:.1f}s time limit.",
                "truncated": {"stdout": False, "stderr": False},
                "duration_ms": duration_ms,
                "error_class": "TimeoutError",
            }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
