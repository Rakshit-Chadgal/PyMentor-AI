'use client';

import React, { useState } from 'react';
import { Check, Copy, Play } from 'lucide-react';
import type { LineExplanation } from '@/lib/types';
import { highlightPythonLine } from './PythonCodeBlock';

interface LineByLineRailProps {
  code: string;
  explanations: LineExplanation[];
  onRunInSandbox?: (code: string) => void;
}

export function LineByLineRail({
  code,
  explanations,
  onRunInSandbox,
}: LineByLineRailProps) {
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const lines = code.replace(/\r\n/g, '\n').split('\n');
  const explanationMap = new Map<number, string>();
  for (const item of explanations) {
    explanationMap.set(item.line, item.explanation);
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-2.5">
        <span className="text-xs font-medium text-[var(--muted)]">
          Line-by-Line Walkthrough · Hover or tap a line to highlight
        </span>
        <div className="flex items-center gap-2">
          {onRunInSandbox && (
            <button
              type="button"
              onClick={() => onRunInSandbox(code)}
              className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-[var(--accent)] whitespace-nowrap shrink-0 transition-colors hover:bg-[var(--accent-soft)]"
            >
              <Play className="h-3.5 w-3.5" />
              Run in Sandbox
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-[var(--ink)] whitespace-nowrap shrink-0 transition-colors hover:bg-[var(--line)]/50"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Synchronized Desktop Two-Column Rail */}
      <div className="hidden lg:grid lg:grid-cols-12">
        <div className="lg:col-span-6 overflow-x-auto bg-[var(--code-bg)] py-3 font-mono text-[13px] leading-7 text-[var(--code-ink)]">
          {lines.map((line, idx) => {
            const num = idx + 1;
            const hasNote = explanationMap.has(num);
            const isActive = activeLine === num;
            return (
              <div
                key={num}
                tabIndex={hasNote ? 0 : undefined}
                onMouseEnter={() => setActiveLine(num)}
                onFocus={() => setActiveLine(num)}
                onMouseLeave={() => setActiveLine(null)}
                onBlur={() => setActiveLine(null)}
                className={`flex px-3.5 transition-colors duration-100 ${
                  isActive
                    ? 'bg-[#7FBF9E]/20'
                    : hasNote
                      ? 'hover:bg-white/5 cursor-pointer'
                      : ''
                }`}
              >
                <span className="mr-3.5 w-5 shrink-0 select-none text-right text-xs leading-7 text-[var(--code-muted)] tabular-nums">
                  {num}
                </span>
                <pre className="whitespace-pre">{highlightPythonLine(line)}</pre>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-6 divide-y divide-[var(--line)] bg-[var(--surface)]">
          {explanations.map((item) => {
            const isActive = activeLine === item.line;
            return (
              <button
                key={item.line}
                type="button"
                onMouseEnter={() => setActiveLine(item.line)}
                onFocus={() => setActiveLine(item.line)}
                onMouseLeave={() => setActiveLine(null)}
                onBlur={() => setActiveLine(null)}
                onClick={() => setActiveLine(activeLine === item.line ? null : item.line)}
                className={`flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm transition-colors duration-100 ${
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--ink)]'
                    : 'hover:bg-[var(--surface-subtle)]/60 text-[var(--ink)]'
                }`}
              >
                <span className="mt-0.5 w-11 shrink-0 font-mono text-xs font-medium text-[var(--accent)] tabular-nums">
                  Line {item.line}
                </span>
                <span className="leading-relaxed text-[var(--ink)]">{item.explanation}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile / Tablet Stacked View */}
      <div className="lg:hidden">
        <div className="overflow-x-auto bg-[var(--code-bg)] py-3 font-mono text-[13px] leading-6 text-[var(--code-ink)]">
          {lines.map((line, idx) => {
            const num = idx + 1;
            const isActive = activeLine === num;
            return (
              <div
                key={num}
                onClick={() => setActiveLine(activeLine === num ? null : num)}
                className={`flex px-3 transition-colors ${isActive ? 'bg-[#7FBF9E]/20' : ''}`}
              >
                <span className="mr-3 w-5 shrink-0 select-none text-right text-xs leading-6 text-[var(--code-muted)] tabular-nums">
                  {num}
                </span>
                <pre className="whitespace-pre">{highlightPythonLine(line)}</pre>
              </div>
            );
          })}
        </div>

        <div className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {explanations.map((item) => {
            const isActive = activeLine === item.line;
            return (
              <button
                key={item.line}
                type="button"
                onClick={() => setActiveLine(activeLine === item.line ? null : item.line)}
                className={`flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm ${
                  isActive ? 'bg-[var(--accent-soft)]' : ''
                }`}
              >
                <span className="mt-0.5 w-11 shrink-0 font-mono text-xs font-medium text-[var(--accent)] tabular-nums">
                  Line {item.line}
                </span>
                <span className="leading-relaxed text-[var(--ink)]">{item.explanation}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
