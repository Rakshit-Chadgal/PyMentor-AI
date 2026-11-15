import type { ExecutionResult } from './types';

const MAX_CODE_BYTES = 32 * 1024;
const MAX_STDIN_BYTES = 8 * 1024;

let activeWorker: Worker | null = null;
let activeTimer: ReturnType<typeof setTimeout> | null = null;
let activeReject: ((reason?: unknown) => void) | null = null;

function getOrCreateWorker(): Worker {
  if (!activeWorker) {
    activeWorker = new Worker('/workers/python-worker.js');
  }
  return activeWorker;
}

export function stopPythonExecution(): void {
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
  if (activeReject) {
    activeReject(new Error('Execution stopped by user.'));
    activeReject = null;
  }
}

export async function runPythonInSandbox(params: {
  code: string;
  stdin?: string;
  timeoutMs?: number;
}): Promise<ExecutionResult> {
  const { code, stdin = '', timeoutMs = 5000 } = params;
  const clampedTimeout = Math.max(1000, Math.min(10000, timeoutMs));

  if (new Blob([code]).size > MAX_CODE_BYTES) {
    return {
      status: 'error',
      exit_code: 1,
      stdout: '',
      stderr: 'Code exceeds the 32 KiB sandbox limit.',
      truncated: { stdout: false, stderr: false },
      duration_ms: 0,
      error_class: 'PayloadLimitError',
    };
  }

  if (new Blob([stdin]).size > MAX_STDIN_BYTES) {
    return {
      status: 'error',
      exit_code: 1,
      stdout: '',
      stderr: 'Standard input exceeds the 8 KiB sandbox limit.',
      truncated: { stdout: false, stderr: false },
      duration_ms: 0,
      error_class: 'PayloadLimitError',
    };
  }

  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return {
      status: 'unavailable',
      exit_code: 1,
      stdout: '',
      stderr: 'Web Workers are not available in this browser.',
      truncated: { stdout: false, stderr: false },
      duration_ms: 0,
      error_class: 'SandboxUnavailable',
    };
  }

  const runId = crypto.randomUUID();
  const worker = getOrCreateWorker();
  const startedAt = performance.now();

  return new Promise<ExecutionResult>((resolve, reject) => {
    activeReject = reject;

    activeTimer = setTimeout(() => {
      if (activeWorker) {
        activeWorker.terminate();
        activeWorker = null;
      }
      activeTimer = null;
      activeReject = null;
      resolve({
        status: 'timeout',
        exit_code: 124,
        stdout: '',
        stderr: `Execution stopped after ${(clampedTimeout / 1000).toFixed(1)}s time limit (check for infinite loops).`,
        truncated: { stdout: false, stderr: false },
        duration_ms: Math.round(performance.now() - startedAt),
        error_class: 'TimeoutError',
      });
    }, clampedTimeout + 12000);

    // Note: first-time Pyodide initialization gets a 12s grace window on top of execution timeout,
    // while subsequent runs use a strict execution deadline once loaded.
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.id !== runId) return;
      if (activeTimer) {
        clearTimeout(activeTimer);
        activeTimer = null;
      }
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      activeReject = null;
      resolve(event.data.result as ExecutionResult);
    };

    const handleError = (err: ErrorEvent) => {
      if (activeTimer) {
        clearTimeout(activeTimer);
        activeTimer = null;
      }
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      activeWorker?.terminate();
      activeWorker = null;
      activeReject = null;
      resolve({
        status: 'unavailable',
        exit_code: 1,
        stdout: '',
        stderr: err.message || 'Failed to run Python sandbox worker.',
        truncated: { stdout: false, stderr: false },
        duration_ms: Math.round(performance.now() - startedAt),
        error_class: 'SandboxError',
      });
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({ id: runId, code, stdin });
  });
}
