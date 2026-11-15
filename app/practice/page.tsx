'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { PythonSandbox } from '@/components/PythonSandbox';
import { PythonCodeBlock } from '@/components/PythonCodeBlock';
import { usePreferences } from '@/components/AppProviders';
import { PYTHON_TOPICS } from '@/lib/types';
import type {
  ExecutionResult,
  PracticeEvaluation,
  PracticeProblem,
  UserLevel,
} from '@/lib/types';
import { recordSolvedProblem, recordTopicAttempt } from '@/lib/storage';

const LEVELS: { value: UserLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default function PracticePage() {
  const { preferences } = usePreferences();

  const [topic, setTopic] = useState<string>(PYTHON_TOPICS[0]);
  const [difficulty, setDifficulty] = useState<UserLevel>(preferences.defaultLevel);
  const [practiceMode, setPracticeMode] = useState<'hint_first' | 'quiz'>('hint_first');

  const [problem, setProblem] = useState<PracticeProblem | null>(null);
  const [previousTitles, setPreviousTitles] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [lastExec, setLastExec] = useState<ExecutionResult | null>(null);

  const [hintOpen, setHintOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<PracticeEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setEvaluation(null);
    setHintOpen(false);
    setLastExec(null);
    setSelectedOption('');

    try {
      const res = await fetch('/api/practice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          difficulty,
          practiceMode,
          previousTitles,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Could not generate exercise.');
      }
      const nextProblem = data as PracticeProblem;
      setProblem(nextProblem);
      setCode(nextProblem.starter_code || '');
      setPreviousTitles((prev) => [nextProblem.title, ...prev].slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate practice problem.');
    } finally {
      setGenerating(false);
    }
  };

  const handleEvaluate = async () => {
    if (!problem) return;
    const answer = practiceMode === 'quiz' ? selectedOption : code;
    if (!answer.trim()) return;

    setEvaluating(true);
    setError(null);

    try {
      const res = await fetch('/api/practice/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: problem.topic,
          difficulty: problem.difficulty,
          practiceMode: problem.practiceMode,
          title: problem.title,
          prompt: problem.prompt,
          userAnswer: answer,
          executionStdout: lastExec?.stdout,
          executionStderr: lastExec?.stderr,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Evaluation failed.');
      }
      const evalResult = data as PracticeEvaluation;
      setEvaluation(evalResult);

      recordTopicAttempt(problem.topic, evalResult.is_correct);
      if (evalResult.is_correct) {
        recordSolvedProblem({
          id: `${problem.topic}-${problem.title}`.toLowerCase().replace(/\s+/g, '-'),
          title: problem.title,
          topic: problem.topic,
          difficulty: problem.difficulty,
          summary: evalResult.key_takeaway,
          solvedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to evaluate answer.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <TopBar />

      <main id="main-content" className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        <div className="border-b border-[var(--line)] pb-6">
          <p className="text-xs font-medium text-[var(--accent)]">Guided Practice Studio</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-[var(--ink)]">
            Practice Python with hints before solutions
          </h1>
          <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-[var(--muted)]">
            Choose a topic and level to generate a focused coding exercise or concept quiz. Test
            your code in the sandbox, inspect hints when stuck, and get feedback explaining why an
            approach succeeds or fails.
          </p>

          {/* Controls */}
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <div className="min-w-[220px] flex-1 sm:flex-initial">
              <label htmlFor="practice-topic" className="block text-xs font-medium text-[var(--muted)]">
                Topic
              </label>
              <select
                id="practice-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]"
              >
                {PYTHON_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-xs font-medium text-[var(--muted)]">Difficulty</span>
              <div className="mt-1.5 flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface)] p-0.5">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setDifficulty(l.value)}
                    className={`rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                      difficulty === l.value
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-[var(--muted)]">Format</span>
              <div className="mt-1.5 flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface)] p-0.5">
                <button
                  type="button"
                  onClick={() => setPracticeMode('hint_first')}
                  className={`rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    practiceMode === 'hint_first'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  Coding Challenge
                </button>
                <button
                  type="button"
                  onClick={() => setPracticeMode('quiz')}
                  className={`rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    practiceMode === 'quiz'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  Concept Quiz
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-ink)] whitespace-nowrap shrink-0 transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {problem ? 'New Exercise' : 'Start Exercise'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-[var(--danger)]/40 bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {!problem && !generating && (
          <div className="mt-10 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center">
            <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
              Ready when you are
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              Select a Python topic above and click Start Exercise. You will receive a problem
              description, sample cases, and an optional hint before any solution is revealed.
            </p>
          </div>
        )}

        {problem && (
          <div className="mt-8 grid gap-6 lg:grid-cols-12">
            {/* Problem Statement + Hint + Evaluation */}
            <div className="space-y-5 lg:col-span-6">
              <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                  <span>{problem.topic}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{problem.difficulty}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {problem.practiceMode === 'quiz' ? 'Concept Quiz' : 'Coding Challenge'}
                  </span>
                </div>
                <h2 className="mt-1.5 font-display text-2xl font-semibold text-[var(--ink)]">
                  {problem.title}
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
                  {problem.prompt}
                </p>

                {problem.sample_io.length > 0 && (
                  <div className="mt-5 space-y-2 border-t border-[var(--line)] pt-4">
                    <h3 className="text-xs font-semibold text-[var(--muted)]">Sample Examples</h3>
                    <div className="space-y-2 font-mono text-xs">
                      {problem.sample_io.map((io, idx) => (
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

                {/* Hint Drawer */}
                <div className="mt-5 border-t border-[var(--line)] pt-4">
                  <button
                    type="button"
                    onClick={() => setHintOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)]"
                  >
                    <Lightbulb className="h-3.5 w-3.5 text-[var(--accent)]" />
                    {hintOpen ? 'Hide Hint' : 'Reveal Hint'}
                    {hintOpen ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {hintOpen && (
                    <p className="mt-3 rounded-md border border-[var(--line)] bg-[var(--paper)] p-3.5 text-xs leading-relaxed text-[var(--ink)]">
                      {problem.hint}
                    </p>
                  )}
                </div>

                {/* Quiz Choices */}
                {problem.practiceMode === 'quiz' && problem.options && (
                  <div className="mt-5 space-y-2 border-t border-[var(--line)] pt-4">
                    <h3 className="text-xs font-semibold text-[var(--muted)]">
                      Choose the best answer
                    </h3>
                    <div className="space-y-2">
                      {problem.options.map((opt, idx) => (
                        <label
                          key={idx}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                            selectedOption === opt
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                              : 'border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--surface-subtle)]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="quiz-option"
                            checked={selectedOption === opt}
                            onChange={() => setSelectedOption(opt)}
                            className="mt-1 accent-[var(--accent)]"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
                  <button
                    type="button"
                    onClick={handleEvaluate}
                    disabled={
                      evaluating ||
                      (problem.practiceMode === 'quiz' ? !selectedOption : !code.trim())
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
                  >
                    {evaluating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Check My Answer
                  </button>

                  <Link
                    href={`/tutor?q=${encodeURIComponent(`Help me understand: ${problem.title}\n\n${problem.prompt}`)}`}
                    className="text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Discuss in Tutor
                  </Link>
                </div>
              </section>

              {/* Evaluation Result */}
              {evaluation && (
                <section
                  className={`rounded-xl border p-5 sm:p-6 ${
                    evaluation.is_correct
                      ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]/50'
                      : 'border-[var(--warn)]/40 bg-[var(--warn-soft)]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {evaluation.is_correct ? (
                      <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                    ) : (
                      <XCircle className="h-4 w-4 text-[var(--warn)]" />
                    )}
                    <span>{evaluation.score_label}</span>
                  </div>

                  <p className="mt-2.5 text-sm leading-relaxed text-[var(--ink)]">
                    {evaluation.feedback}
                  </p>

                  <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-3 text-sm">
                    <p>
                      <span className="font-semibold">Why: </span>
                      {evaluation.why_it_works_or_fails}
                    </p>
                    <p>
                      <span className="font-semibold">Key takeaway: </span>
                      {evaluation.key_takeaway}
                    </p>
                  </div>

                  {evaluation.corrected_code && (
                    <div className="mt-4 space-y-1.5">
                      <p className="text-xs font-semibold text-[var(--muted)]">
                        Suggested Correction
                      </p>
                      <PythonCodeBlock
                        code={evaluation.corrected_code}
                        onRunInSandbox={(c) => setCode(c)}
                      />
                    </div>
                  )}

                  {evaluation.solution_code && (
                    <div className="mt-4 space-y-1.5">
                      <p className="text-xs font-semibold text-[var(--muted)]">
                        Reference Solution
                      </p>
                      <PythonCodeBlock
                        code={evaluation.solution_code}
                        onRunInSandbox={(c) => setCode(c)}
                      />
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Sandbox Column */}
            <div className="lg:col-span-6">
              {problem.practiceMode === 'quiz' && problem.starter_code ? (
                <div className="space-y-4">
                  <PythonCodeBlock code={problem.starter_code} />
                  <PythonSandbox
                    code={code}
                    onChangeCode={setCode}
                    fontSize={preferences.editorFontSize}
                    onResult={setLastExec}
                  />
                </div>
              ) : (
                <PythonSandbox
                  code={code}
                  onChangeCode={setCode}
                  fontSize={preferences.editorFontSize}
                  onResult={setLastExec}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
