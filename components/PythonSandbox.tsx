'use client';

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Square,
  Terminal,
} from 'lucide-react';
import { runPythonInSandbox, stopPythonExecution } from '@/lib/python-sandbox';
import type { ExecutionResult } from '@/lib/types';

interface PythonSandboxProps {
  code: string;
  onChangeCode: (code: string) => void;
  fontSize?: number;
  onAskDebug?: (code: string, stderr: string) => void;
  onResult?: (result: ExecutionResult) => void;
}

export function PythonSandbox({
  code,
  onChangeCode,
  fontSize = 14,
  onAskDebug,
  onResult,
}: PythonSandboxProps) {
  const [stdin, setStdin] = useState('');
  const [stdinOpen, setStdinOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const lines = code.replace(/\r\n/g, '\n').split('\n');

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    try {
      const execResult = await runPythonInSandbox({ code, stdin, timeoutMs: 5000 });
      setResult(execResult);
      onResult?.(execResult);
    } catch {
      // Stopped by user
    } finally {
      setRunning(false);
    }
  };

  const handleStop = () => {
    stopPythonExecution();
    setRunning(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = code.slice(0, start) + '    ' + code.slice(end);
      onChangeCode(next);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 4;
          textareaRef.current.selectionEnd = start + 4;
        }
      });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink)]">
          <Terminal className="h-4 w-4 text-[var(--accent)]" />
          <span>Python 3 Sandbox</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStdinOpen((v) => !v)}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--ink)] whitespace-nowrap shrink-0 hover:bg-[var(--paper)]"
          >
            Input
            {stdinOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              onChangeCode('');
              setResult(null);
            }}
            aria-label="Clear editor"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--muted)] whitespace-nowrap shrink-0 hover:text-[var(--ink)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </button>

          {running ? (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--danger)] px-3 text-xs font-medium text-white whitespace-nowrap shrink-0"
            >
              <Square className="h-3 w-3 fill-current" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRun}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--accent)] px-3.5 text-xs font-medium text-[var(--accent-ink)] whitespace-nowrap shrink-0 transition-colors hover:bg-[var(--accent-hover)]"
            >
              <Play className="h-3.5 w-3.5" />
              Run
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Stdin Drawer */}
      {stdinOpen && (
        <div className="border-b border-[var(--line)] bg-[var(--paper)] px-4 py-3">
          <label htmlFor="sandbox-stdin" className="block text-xs font-medium text-[var(--muted)]">
            Standard Input (one line per <code className="font-mono">input()</code> call)
          </label>
          <textarea
            id="sandbox-stdin"
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={2}
            placeholder="e.g.&#10;Alice&#10;42"
            className="mt-1.5 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--ink)] placeholder:text-[var(--muted)]"
          />
        </div>
      )}

      {/* Line-numbered Code Editor */}
      <div className="relative flex min-h-[220px] flex-1 overflow-auto bg-[var(--code-bg)] font-mono text-[var(--code-ink)]">
        <div
          aria-hidden="true"
          className="select-none border-r border-white/10 bg-[var(--code-surface)] px-3 py-3 text-right text-xs text-[var(--code-muted)] tabular-nums"
          style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
        >
          {lines.map((_, idx) => (
            <div key={idx}>{idx + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          aria-label="Python code editor"
          value={code}
          onChange={(e) => onChangeCode(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          placeholder="# Write or paste Python code here (Ctrl/Cmd + Enter to run)"
          className="w-full flex-1 resize-none bg-transparent p-3 text-[var(--code-ink)] placeholder:text-[var(--code-muted)] focus:outline-none"
          style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
        />
      </div>

      {/* Output Pane */}
      <div className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-2">
          <div className="flex items-center gap-2 text-xs">
            {running ? (
              <span className="font-medium text-[var(--muted)]">
                Running in Python 3 sandbox…
              </span>
            ) : result ? (
              result.status === 'ok' ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--accent)] tabular-nums">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Completed · {result.duration_ms} ms
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--danger)] tabular-nums">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {result.error_class ?? 'Error'} · {result.duration_ms} ms
                </span>
              )
            ) : (
              <span className="text-[var(--muted)]">Output · Press Ctrl/Cmd + Enter to run</span>
            )}
          </div>

          {onAskDebug && result && result.stderr && (
            <button
              type="button"
              onClick={() => onAskDebug(code, result.stderr)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--danger)]/40 bg-[var(--danger-soft)] px-2.5 py-1 text-xs font-medium text-[var(--danger)] whitespace-nowrap shrink-0 transition-colors hover:opacity-90"
            >
              <Bug className="h-3.5 w-3.5" />
              Debug with PyMentor
            </button>
          )}
        </div>

        <div className="max-h-48 min-h-[96px] overflow-auto bg-[var(--code-bg)] px-4 py-3 font-mono text-xs leading-relaxed text-[var(--code-ink)]">
          {!result && !running && (
            <p className="text-[var(--code-muted)]">Program stdout and tracebacks appear here.</p>
          )}
          {result?.stdout && <pre className="whitespace-pre-wrap text-[#A8D5BA]">{result.stdout}</pre>}
          {result?.stderr && (
            <pre className="mt-1 whitespace-pre-wrap text-[#F0A3A3]">{result.stderr}</pre>
          )}
          {result && !result.stdout && !result.stderr && result.status === 'ok' && (
            <p className="text-[var(--code-muted)]">(Program exited with 0 and produced no output.)</p>
          )}
          {(result?.truncated.stdout || result?.truncated.stderr) && (
            <p className="mt-2 text-[#E0B36A]">
              Output truncated at 64 KiB sandbox limit.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
