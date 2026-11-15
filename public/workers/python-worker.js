/* PyMentor Isolated Web Worker Python 3 Runtime (Pyodide) */
let pyodideInstance = null;
let loadingPromise = null;

const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
const MAX_OUTPUT_BYTES = 65536;

async function ensurePyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      importScripts(PYODIDE_INDEX_URL + 'pyodide.js');
      const instance = await loadPyodide({
        indexURL: PYODIDE_INDEX_URL,
      });
      pyodideInstance = instance;
      return instance;
    })();
  }
  return loadingPromise;
}

function extractErrorClass(stderr) {
  if (!stderr) return null;
  const lines = stderr.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(/^([A-Za-z_][A-Za-z0-9_]*(?:Error|Exception|Warning)):/);
    if (match) return match[1];
  }
  return 'RuntimeError';
}

self.onmessage = async (event) => {
  const { id, code, stdin } = event.data;
  const start = performance.now();

  try {
    const pyodide = await ensurePyodide();

    const stdoutChunks = [];
    const stderrChunks = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let stdoutTruncated = false;
    let stderrTruncated = false;

    pyodide.setStdout({
      batched: (text) => {
        const line = text + '\n';
        if (stdoutBytes + line.length <= MAX_OUTPUT_BYTES) {
          stdoutChunks.push(line);
          stdoutBytes += line.length;
        } else {
          stdoutTruncated = true;
        }
      },
    });

    pyodide.setStderr({
      batched: (text) => {
        const line = text + '\n';
        if (stderrBytes + line.length <= MAX_OUTPUT_BYTES) {
          stderrChunks.push(line);
          stderrBytes += line.length;
        } else {
          stderrTruncated = true;
        }
      },
    });

    const stdinLines = typeof stdin === 'string' && stdin.length > 0 ? stdin.split(/\r?\n/) : [];
    let stdinIndex = 0;

    pyodide.setStdin({
      stdin: () => {
        if (stdinIndex >= stdinLines.length) return undefined;
        return stdinLines[stdinIndex++] + '\n';
      },
    });

    pyodide.globals.set('__pymentor_user_code__', code);
    pyodide.globals.set('__pymentor_stdin_lines__', pyodide.toPy(stdinLines));

    const runner = `
import sys, io, builtins, traceback

_orig_input = builtins.input
_stdin_list = list(__pymentor_stdin_lines__)
_stdin_pos = [0]

def _safe_input(prompt=""):
    if prompt:
        sys.stdout.write(str(prompt))
    if _stdin_pos[0] >= len(_stdin_list):
        raise EOFError("EOF when reading a line (provide stdin in the Input drawer)")
    val = _stdin_list[_stdin_pos[0]]
    _stdin_pos[0] += 1
    return val

builtins.input = _safe_input
_ns = {"__name__": "__main__"}
_ok = True
try:
    _compiled = compile(__pymentor_user_code__, "<main.py>", "exec")
    exec(_compiled, _ns, _ns)
except BaseException:
    _ok = False
    traceback.print_exc()
finally:
    builtins.input = _orig_input
_ok
`;

    const ok = await pyodide.runPythonAsync(runner);
    const duration_ms = Math.round(performance.now() - start);
    const stdout = stdoutChunks.join('').replace(/\n$/, '');
    const stderr = stderrChunks.join('').replace(/\n$/, '');
    const truncatedAny = stdoutTruncated || stderrTruncated;

    self.postMessage({
      id,
      result: {
        status: truncatedAny ? 'output_limit' : ok ? 'ok' : 'error',
        exit_code: ok ? 0 : 1,
        stdout,
        stderr,
        truncated: {
          stdout: stdoutTruncated,
          stderr: stderrTruncated,
        },
        duration_ms,
        error_class: ok ? null : extractErrorClass(stderr),
      },
    });
  } catch (err) {
    const duration_ms = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({
      id,
      result: {
        status: message.includes('importScripts') || message.includes('fetch') ? 'unavailable' : 'error',
        exit_code: 1,
        stdout: '',
        stderr: message,
        truncated: { stdout: false, stderr: false },
        duration_ms,
        error_class: 'SandboxError',
      },
    });
  }
};
