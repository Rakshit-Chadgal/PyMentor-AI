import React, { Suspense } from 'react';
import { TutorWorkspace } from '@/components/TutorWorkspace';

export default function TutorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] text-sm text-[var(--muted)]">
          Loading PyMentor workspace…
        </div>
      }
    >
      <TutorWorkspace />
    </Suspense>
  );
}
