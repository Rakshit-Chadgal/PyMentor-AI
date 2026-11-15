'use client';

import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertTriangle,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lightbulb,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import type { TutorPayload } from '@/lib/types';
import { PythonCodeBlock } from './PythonCodeBlock';
import { LineByLineRail } from './LineByLineRail';
import { DryRunTable } from './DryRunTable';

interface TutorResponseCardProps {
  payload: TutorPayload;
  isBookmarked?: boolean;
  feedback?: -1 | 0 | 1;
  onToggleBookmark?: () => void;
  onFeedback?: (rating: -1 | 1) => void;
  onRunInSandbox?: (code: string) => void;
  onFollowUp?: (prompt: string) => void;
}

const MODE_LABELS: Record<TutorPayload['mode'], string> = {
  explain: 'Concept Explanation',
  solve: 'Guided Solution',
  debug: 'Debugging Analysis',
  practice: 'Practice Exercise',
  chat: 'Follow-up',
};

const LEVEL_LABELS: Record<TutorPayload['level'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function TutorResponseCard({
  payload,
  isBookmarked = false,
  feedback,
  onToggleBookmark,
  onFeedback,
  onRunInSandbox,
  onFollowUp,
}: TutorResponseCardProps) {
  const [hintOpen, setHintOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);

  return (
    <article className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
      {/* Header: Title + Unboxed Metadata + Actions */}
      <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <span>{MODE_LABELS[payload.mode]}</span>
            <span aria-hidden="true">·</span>
            <span>{LEVEL_LABELS[payload.level]}</span>
            <span aria-hidden="true">·</span>
            <span>{payload.topic}</span>
          </div>
          <h3 className="font-display text-xl font-semibold tracking-tight text-[var(--ink)] sm:text-2xl">
            {payload.title}
          </h3>
        </div>

        {(onToggleBookmark || onFeedback) && (
          <div className="flex items-center gap-1.5 shrink-0">
            {onFeedback && (
              <>
                <button
                  type="button"
                  onClick={() => onFeedback(1)}
                  aria-label="Mark explanation helpful"
                  aria-pressed={feedback === 1}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    feedback === 1
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Helpful
                </button>
                <button
                  type="button"
                  onClick={() => onFeedback(-1)}
                  aria-label="Mark explanation needs improvement"
                  aria-pressed={feedback === -1}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-xs transition-colors ${
                    feedback === -1
                      ? 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]'
                      : 'border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {onToggleBookmark && (
              <button
                type="button"
                onClick={onToggleBookmark}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark explanation'}
                aria-pressed={isBookmarked}
                className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isBookmarked
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-3.5 w-3.5" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )}
                {isBookmarked ? 'Saved' : 'Save'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body Sections */}
      <div className="mt-5 space-y-6 text-[15px] leading-relaxed text-[var(--ink)]">
        {/* Refusal Notice */}
        {payload.refusal && (
          <div className="flex items-start gap-3 rounded-lg border border-[var(--warn)]/30 bg-[var(--warn-soft)] p-4 text-sm text-[var(--warn)]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Outside Python Tutoring Scope</p>
              <p className="mt-1 text-[var(--ink)]">{payload.summary}</p>
            </div>
          </div>
        )}

        {/* Summary */}
        {!payload.refusal && payload.summary && (
          <div className="markdown-body max-w-[68ch] text-[var(--ink)]">
            <Markdown remarkPlugins={[remarkGfm]}>{payload.summary}</Markdown>
          </div>
        )}

        {/* Problem Understanding */}
        {payload.problem_understanding && (
          <section className="space-y-1.5 border-t border-[var(--line)] pt-4">
            <h4 className="text-xs font-semibold tracking-wide text-[var(--muted)]">
              Problem Understanding
            </h4>
            <p className="max-w-[68ch] text-sm text-[var(--ink)]">
              {payload.problem_understanding}
            </p>
          </section>
        )}

        {/* Debug Error Analysis */}
        {payload.error_analysis && (
          <section className="rounded-lg border border-[var(--danger)]/35 bg-[var(--danger-soft)] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--danger)]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Error Diagnosis · {payload.error_analysis.error_class}</span>
            </div>
            <p className="mt-2 text-sm text-[var(--ink)]">
              <span className="font-semibold">Cause: </span>
              {payload.error_analysis.root_cause}
            </p>
            {payload.error_analysis.fix_summary && (
              <p className="mt-1.5 text-sm text-[var(--ink)]">
                <span className="font-semibold">Fix: </span>
                {payload.error_analysis.fix_summary}
              </p>
            )}
          </section>
        )}

        {/* Key Concepts */}
        {payload.concepts.length > 0 && (
          <section className="space-y-2.5 border-t border-[var(--line)] pt-4">
            <h4 className="text-xs font-semibold tracking-wide text-[var(--muted)]">
              Key Concepts
            </h4>
            <dl className="grid gap-3 sm:grid-cols-2">
              {payload.concepts.map((concept) => (
                <div
                  key={concept.name}
                  className="rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3.5"
                >
                  <dt className="text-sm font-semibold text-[var(--ink)]">{concept.name}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                    {concept.why}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Approach & Algorithm */}
        {(payload.approach || payload.algorithm.length > 0) && (
          <section className="space-y-3 border-t border-[var(--line)] pt-4">
            <h4 className="text-xs font-semibold tracking-wide text-[var(--muted)]">
              Approach & Steps
            </h4>
            {payload.approach && (
              <div className="markdown-body max-w-[68ch] text-sm text-[var(--ink)]">
                <Markdown remarkPlugins={[remarkGfm]}>{payload.approach}</Markdown>
              </div>
            )}
            {payload.algorithm.length > 0 && (
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[var(--ink)]">
                {payload.algorithm.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {/* Code + Synchronized Line-by-Line Rail */}
        {payload.code && payload.line_by_line.length > 0 && (
          <section className="space-y-2 border-t border-[var(--line)] pt-4">
            <LineByLineRail
              code={payload.code}
              explanations={payload.line_by_line}
              onRunInSandbox={onRunInSandbox}
            />
          </section>
        )}

        {payload.code && payload.line_by_line.length === 0 && (
          <section className="space-y-2 border-t border-[var(--line)] pt-4">
            <PythonCodeBlock code={payload.code} onRunInSandbox={onRunInSandbox} />
          </section>
        )}

        {/* Dry-Run Variable Trace */}
        {payload.dry_run.length > 0 && (
          <section className="space-y-2">
            <DryRunTable steps={payload.dry_run} />
          </section>
        )}

        {/* Sample I/O & Complexity */}
        {(payload.sample_io.length > 0 || payload.complexity) && (
          <section className="grid gap-4 border-t border-[var(--line)] pt-4 sm:grid-cols-2">
            {payload.sample_io.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold tracking-wide text-[var(--muted)]">
                  Sample Input & Output
                </h4>
                <div className="space-y-2 font-mono text-xs">
                  {payload.sample_io.map((io, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
                    >
                      {io.input && (
                        <div className="text-[var(--muted)]">
                          in: <span className="text-[var(--ink)]">{io.input}</span>
                        </div>
                      )}
                      <div className="text-[var(--accent)]">
                        out: <span className="text-[var(--ink)]">{io.output}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {payload.complexity && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold tracking-wide text-[var(--muted)]">
                  Complexity
                </h4>
                <div className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 font-mono text-xs tabular-nums">
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--muted)]">Time</span>
                    <span className="font-medium text-[var(--ink)]">{payload.complexity.time}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--line)] py-1">
                    <span className="text-[var(--muted)]">Space</span>
                    <span className="font-medium text-[var(--ink)]">{payload.complexity.space}</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Prevention Rule */}
        {payload.prevention && (
          <section className="rounded-lg border border-[var(--line)] bg-[var(--paper)] p-4">
            <h4 className="text-xs font-semibold tracking-wide text-[var(--accent)]">
              Rule to Remember
            </h4>
            <p className="mt-1 text-sm text-[var(--ink)]">{payload.prevention}</p>
          </section>
        )}

        {/* Warnings */}
        {payload.warnings.length > 0 && (
          <section className="rounded-lg border border-[var(--warn)]/30 bg-[var(--warn-soft)] p-3.5 text-xs text-[var(--warn)]">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Notes & Version Caveats</span>
            </div>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[var(--ink)]">
              {payload.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Practice Check (Hint before Solution) */}
        {payload.practice && (
          <section className="rounded-lg border border-[var(--line)] bg-[var(--paper)] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
              <Lightbulb className="h-4 w-4" />
              <span>Try It Yourself</span>
            </div>
            <p className="mt-1.5 text-sm text-[var(--ink)]">{payload.practice.question}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setHintOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] transition-colors hover:bg-[var(--surface-subtle)]"
              >
                {hintOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {hintOpen ? 'Hide Hint' : 'Reveal Hint'}
              </button>
              {payload.practice.solution && (
                <button
                  type="button"
                  onClick={() => setSolutionOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
                >
                  {solutionOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {solutionOpen ? 'Hide Solution' : 'Reveal Solution'}
                </button>
              )}
            </div>

            {hintOpen && (
              <p className="mt-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 text-xs leading-relaxed text-[var(--muted)]">
                <span className="font-semibold text-[var(--ink)]">Hint: </span>
                {payload.practice.hint}
              </p>
            )}

            {solutionOpen && payload.practice.solution && (
              <div className="mt-3">
                <PythonCodeBlock
                  code={payload.practice.solution}
                  onRunInSandbox={onRunInSandbox}
                />
              </div>
            )}
          </section>
        )}

        {/* Grounded References */}
        {payload.citations && payload.citations.length > 0 && (
          <section className="space-y-2 border-t border-[var(--line)] pt-4">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[var(--muted)]">
              <BookOpen className="h-3.5 w-3.5" />
              Official Python References
            </h4>
            <ul className="space-y-1.5 text-xs">
              {payload.citations.map((cite, idx) => (
                <li key={idx}>
                  <a
                    href={cite.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[var(--accent)] hover:underline"
                  >
                    <span>
                      {cite.title} — {cite.section}
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Follow-up Prompts */}
        {onFollowUp && payload.follow_up_prompts.length > 0 && (
          <section className="border-t border-[var(--line)] pt-4">
            <p className="mb-2 text-xs font-medium text-[var(--muted)]">Suggested follow-ups</p>
            <div className="flex flex-wrap gap-2">
              {payload.follow_up_prompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onFollowUp(prompt)}
                  className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 text-left text-xs font-medium text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
