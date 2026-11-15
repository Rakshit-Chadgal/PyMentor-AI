import Link from 'next/link';
import { TopBar } from '@/components/TopBar';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <TopBar />
      <main
        id="main-content"
        className="mx-auto flex max-w-xl flex-col items-start px-6 py-20"
      >
        <p className="text-xs font-medium tracking-wide text-[var(--accent)]">404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--ink)]">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          The lesson or route you requested does not exist. Return to the Python tutor or
          practice studio to continue learning.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/tutor"
            className="inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Open Tutor
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-[var(--surface-subtle)]"
          >
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
