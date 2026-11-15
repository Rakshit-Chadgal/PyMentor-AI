'use client';

import React, { useState } from 'react';
import { Check, Copy, Play } from 'lucide-react';

const PYTHON_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
  'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
  'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
]);

const PYTHON_BUILTINS = new Set([
  'abs', 'all', 'any', 'bool', 'dict', 'enumerate', 'filter', 'float', 'input',
  'int', 'len', 'list', 'map', 'max', 'min', 'print', 'range', 'reversed',
  'round', 'set', 'sorted', 'str', 'sum', 'tuple', 'type', 'zip',
]);

export function highlightPythonLine(line: string): React.ReactNode {
  const tokenRegex =
    /(#.*$)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_][A-Za-z0-9_]*)\b/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }
    const [full, comment, str, num, word] = match;
    if (comment) {
      nodes.push(
        <span key={key++} className="text-[#8E9687] italic">
          {comment}
        </span>
      );
    } else if (str) {
      nodes.push(
        <span key={key++} className="text-[#A8D5BA]">
          {str}
        </span>
      );
    } else if (num) {
      nodes.push(
        <span key={key++} className="text-[#E0B36A]">
          {num}
        </span>
      );
    } else if (word) {
      if (PYTHON_KEYWORDS.has(word)) {
        nodes.push(
          <span key={key++} className="font-medium text-[#E69A8D]">
            {word}
          </span>
        );
      } else if (PYTHON_BUILTINS.has(word)) {
        nodes.push(
          <span key={key++} className="text-[#9AC7DB]">
            {word}
          </span>
        );
      } else {
        nodes.push(full);
      }
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }
  return nodes.length > 0 ? nodes : ' ';
}

interface PythonCodeBlockProps {
  code: string;
  onRunInSandbox?: (code: string) => void;
  highlightedLine?: number | null;
  onHoverLine?: (line: number | null) => void;
}

export function PythonCodeBlock({
  code,
  onRunInSandbox,
  highlightedLine,
  onHoverLine,
}: PythonCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\r\n/g, '\n').split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--code-bg)] text-[var(--code-ink)]">
      <div className="flex items-center justify-between border-b border-white/10 bg-[var(--code-surface)] px-3.5 py-2">
        <span className="font-mono text-xs text-[var(--code-muted)]">python</span>
        <div className="flex items-center gap-2">
          {onRunInSandbox && (
            <button
              type="button"
              onClick={() => onRunInSandbox(code)}
              className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-[#A8D5BA] whitespace-nowrap shrink-0 transition-colors hover:bg-white/10"
            >
              <Play className="h-3.5 w-3.5" />
              Run in Sandbox
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-[var(--code-ink)] whitespace-nowrap shrink-0 transition-colors hover:bg-white/10"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#A8D5BA]" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto py-3 font-mono text-[13px] leading-6">
        {lines.map((line, idx) => {
          const lineNumber = idx + 1;
          const isActive = highlightedLine === lineNumber;
          return (
            <div
              key={lineNumber}
              onMouseEnter={() => onHoverLine?.(lineNumber)}
              onMouseLeave={() => onHoverLine?.(null)}
              className={`flex px-3.5 transition-colors duration-100 ${
                isActive ? 'bg-[#7FBF9E]/15' : 'hover:bg-white/5'
              }`}
            >
              <span className="mr-4 w-6 shrink-0 select-none text-right text-xs leading-6 text-[var(--code-muted)] tabular-nums">
                {lineNumber}
              </span>
              <pre className="whitespace-pre text-[var(--code-ink)]">{highlightPythonLine(line)}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
