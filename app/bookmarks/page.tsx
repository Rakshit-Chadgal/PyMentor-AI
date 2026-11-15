'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { TutorResponseCard } from '@/components/TutorResponseCard';
import { loadBookmarks, saveBookmarks } from '@/lib/storage';
import type { Bookmark } from '@/lib/types';

export default function BookmarksPage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [topicFilter, setTopicFilter] = useState<string>('All');

  useEffect(() => {
    queueMicrotask(() => {
      setBookmarks(loadBookmarks());
    });
  }, []);

  const topics = useMemo(() => {
    const set = new Set(bookmarks.map((b) => b.topic));
    return ['All', ...Array.from(set)];
  }, [bookmarks]);

  const filtered = useMemo(() => {
    if (topicFilter === 'All') return bookmarks;
    return bookmarks.filter((b) => b.topic === topicFilter);
  }, [bookmarks, topicFilter]);

  const handleRemove = (bookmarkId: string) => {
    const next = bookmarks.filter((b) => b.id !== bookmarkId);
    setBookmarks(next);
    saveBookmarks(next);
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <TopBar />

      <main id="main-content" className="mx-auto max-w-[960px] px-4 py-8 sm:px-6 sm:py-12">
        <header className="border-b border-[var(--line)] pb-6">
          <p className="text-xs font-medium text-[var(--accent)]">Saved Reference Library</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-[var(--ink)]">
            Bookmarked explanations
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Return to saved Python concepts, line-by-line walkthroughs, and debugging notes.
          </p>

          {topics.length > 1 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {topics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopicFilter(t)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    topicFilter === t
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </header>

        {filtered.length === 0 ? (
          <div className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center">
            <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
              No saved explanations yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              Click Save on any tutor lesson to keep its code, line-by-line rail, and dry-run table
              here for quick review.
            </p>
            <Link
              href="/tutor"
              className="mt-5 inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
            >
              Go to Tutor
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {filtered.map((bm) => (
              <div key={bm.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>Saved {new Date(bm.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/tutor?c=${encodeURIComponent(bm.conversationId)}`}
                      className="font-medium text-[var(--accent)] hover:underline"
                    >
                      Open conversation
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(bm.id)}
                      className="inline-flex items-center gap-1 text-[var(--danger)] hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>

                <TutorResponseCard
                  payload={bm.payload}
                  isBookmarked
                  onToggleBookmark={() => handleRemove(bm.id)}
                  onRunInSandbox={(code) =>
                    router.push(`/tutor?code=${encodeURIComponent(code)}`)
                  }
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
