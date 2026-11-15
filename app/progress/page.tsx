'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import {
  calculateStreak,
  loadActivityDays,
  loadConversations,
  loadSolvedProblems,
  loadTopicProgress,
} from '@/lib/storage';
import type { SolvedProblem, TopicProgress } from '@/lib/types';

export default function ProgressPage() {
  const [topics, setTopics] = useState<TopicProgress[]>([]);
  const [solved, setSolved] = useState<SolvedProblem[]>([]);
  const [streak, setStreak] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      setTopics(loadTopicProgress());
      setSolved(loadSolvedProblems());
      setStreak(calculateStreak(loadActivityDays()));
      setConversationCount(loadConversations().length);
    });
  }, []);

  const totalAttempts = topics.reduce((acc, t) => acc + t.attempts, 0);
  const totalCorrect = topics.reduce((acc, t) => acc + t.correct, 0);

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <TopBar />

      <main id="main-content" className="mx-auto max-w-[960px] px-4 py-8 sm:px-6 sm:py-12">
        <header className="border-b border-[var(--line)] pb-6">
          <p className="text-xs font-medium text-[var(--accent)]">Learning Progress</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-[var(--ink)]">
            Your Python practice record
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Tracked directly from your tutoring sessions and solved practice problems.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-6 border-t border-[var(--line)] pt-5 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-[var(--muted)]">Active Streak</dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">
                {streak} {streak === 1 ? 'day' : 'days'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Solved Problems</dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">
                {solved.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Practice Accuracy</dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">
                {totalAttempts > 0 ? `${Math.round((totalCorrect / totalAttempts) * 100)}%` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Lessons Saved</dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">
                {conversationCount}
              </dd>
            </div>
          </dl>
        </header>

        {/* Topic Mastery Rows */}
        <section className="mt-10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
              Topics Practiced
            </h2>
            <Link
              href="/practice"
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Practice a topic
            </Link>
          </div>

          {topics.length === 0 ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
              No practice attempts recorded yet. Complete an exercise in the{' '}
              <Link href="/practice" className="font-medium text-[var(--accent)] hover:underline">
                Practice Studio
              </Link>{' '}
              to start building topic mastery.
            </div>
          ) : (
            <div className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
              {topics.map((item) => {
                const pct =
                  item.attempts > 0 ? Math.round((item.correct / item.attempts) * 100) : 0;
                return (
                  <div
                    key={item.topic}
                    className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--ink)]">{item.topic}</p>
                      <p className="text-xs text-[var(--muted)] tabular-nums">
                        {item.correct} of {item.attempts} solved
                      </p>
                    </div>

                    <div className="flex items-center gap-3 sm:w-64">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-xs font-medium tabular-nums text-[var(--ink)]">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Solved Problems List */}
        <section className="mt-10 space-y-4">
          <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
            Solved Problems
          </h2>
          {solved.length === 0 ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
              Solved coding challenges and quizzes will appear here with their key takeaway.
            </div>
          ) : (
            <div className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
              {solved.map((prob) => (
                <div key={prob.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <span>{prob.topic}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{prob.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span>{new Date(prob.solvedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{prob.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                    {prob.summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
