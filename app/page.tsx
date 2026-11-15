'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { LineByLineRail } from '@/components/LineByLineRail';
import { DryRunTable } from '@/components/DryRunTable';
import { SAMPLE_LANDING_LESSON } from '@/lib/sample-lesson';

const STARTER_PROMPTS = [
  'How does list slicing work in Python?',
  'Debug my loop that raises IndexError',
  'Write a function to check palindromes',
  'Give me a beginner practice exercise on dictionaries',
];

export default function LandingPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (trimmed) {
      router.push(`/tutor?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/tutor');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <TopBar />

      <main id="main-content" className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 sm:py-16">
        {/* Hero */}
        <section className="max-w-3xl space-y-6">
          <p className="text-xs font-medium tracking-wide text-[var(--accent)]">
            Python 3 Programming Tutor · Interactive Sandbox
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] [text-wrap:balance] sm:text-5xl sm:leading-[1.1]">
            Understand the logic before you copy the code.
          </h1>
          <p className="max-w-[65ch] text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            PyMentor AI teaches Python the way a patient human tutor would: plain-language
            concepts first, synchronized line-by-line walkthroughs, step-by-step variable traces,
            and an isolated Python 3 sandbox to test every idea.
          </p>

          <form onSubmit={handleLaunch} className="flex flex-col gap-3 pt-2 sm:flex-row">
            <label htmlFor="hero-question" className="sr-only">
              Ask a Python question
            </label>
            <input
              id="hero-question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about Python, or paste a traceback…"
              className="h-12 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]"
            />
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-6 text-sm font-medium text-[var(--accent-ink)] whitespace-nowrap shrink-0 transition-colors hover:bg-[var(--accent-hover)]"
            >
              Ask PyMentor
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-[var(--muted)]">Try:</span>
            {STARTER_PROMPTS.map((prompt) => (
              <Link
                key={prompt}
                href={`/tutor?q=${encodeURIComponent(prompt)}`}
                className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
              >
                {prompt}
              </Link>
            ))}
          </div>
        </section>

        {/* Live Signature Example */}
        <section className="mt-14 border-t border-[var(--line)] pt-10">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-medium text-[var(--muted)]">
                Sample Lesson · {SAMPLE_LANDING_LESSON.topic} · Beginner
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-[var(--ink)] sm:text-3xl">
                {SAMPLE_LANDING_LESSON.title}
              </h2>
              <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-[var(--muted)]">
                {SAMPLE_LANDING_LESSON.summary}
              </p>
            </div>
            <Link
              href={`/tutor?q=${encodeURIComponent('How do I count vowels in a sentence in Python?')}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] whitespace-nowrap shrink-0 hover:underline"
            >
              Try this in Tutor
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-5">
            <LineByLineRail
              code={SAMPLE_LANDING_LESSON.code ?? ''}
              explanations={SAMPLE_LANDING_LESSON.line_by_line}
              onRunInSandbox={(code) =>
                router.push(`/tutor?code=${encodeURIComponent(code)}`)
              }
            />
            <DryRunTable steps={SAMPLE_LANDING_LESSON.dry_run} />
          </div>
        </section>

        {/* Pedagogical Modes */}
        <section className="mt-16 grid gap-8 border-t border-[var(--line)] pt-12 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--accent)]">01 · Explain & Solve</p>
            <h3 className="font-display text-xl font-semibold text-[var(--ink)]">
              Concept before syntax
            </h3>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Every solution states the problem understanding, approach, and ordered steps before
              presenting runnable Python adapted to your chosen skill level.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--accent)]">02 · Debug & Sandbox</p>
            <h3 className="font-display text-xl font-semibold text-[var(--ink)]">
              Learn from every traceback
            </h3>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Run code in an isolated browser Python 3 sandbox. When an error occurs, send the
              traceback directly to PyMentor to learn the root cause and prevention rule.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--accent)]">03 · Guided Practice</p>
            <h3 className="font-display text-xl font-semibold text-[var(--ink)]">
              Hints before answers
            </h3>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Request topic-specific coding challenges or quizzes that withhold the answer until
              you have tested your own attempt and reviewed why it works or fails.
            </p>
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-[var(--line)] bg-[var(--surface)] py-8">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-4 px-4 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:px-6">
          <p>PyMentor AI — Python programming tutor and interactive sandbox.</p>
          <div className="flex items-center gap-5">
            <Link href="/tutor" className="hover:text-[var(--ink)]">
              Tutor
            </Link>
            <Link href="/practice" className="hover:text-[var(--ink)]">
              Practice
            </Link>
            <Link href="/progress" className="hover:text-[var(--ink)]">
              Progress
            </Link>
            <Link href="/settings" className="hover:text-[var(--ink)]">
              Settings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
