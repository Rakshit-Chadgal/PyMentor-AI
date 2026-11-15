'use client';

import React, { useState } from 'react';
import { Check, Download, Trash2 } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { usePreferences } from '@/components/AppProviders';
import { clearAllLearnerData, exportAllLearnerData } from '@/lib/storage';
import type { ExplanationStyle, ThemePreference, UserLevel } from '@/lib/types';

export default function SettingsPage() {
  const { preferences, updatePreferences } = usePreferences();
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);

  const handleExport = () => {
    const json = exportAllLearnerData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pymentor-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    clearAllLearnerData();
    setConfirmClear(false);
    setClearedNotice(true);
    setTimeout(() => setClearedNotice(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <TopBar />

      <main id="main-content" className="mx-auto max-w-[720px] px-4 py-8 sm:px-6 sm:py-12">
        <header className="border-b border-[var(--line)] pb-6">
          <p className="text-xs font-medium text-[var(--accent)]">Preferences</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-[var(--ink)]">
            Tutor & editor settings
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Customize how PyMentor explains Python concepts, adapts code idioms, and renders the
            workspace.
          </p>
        </header>

        <div className="mt-8 space-y-8">
          {/* Default Level */}
          <section className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Default Python Skill Level</h2>
            <p className="text-xs text-[var(--muted)]">
              Controls vocabulary depth, code idioms, and whether line-by-line walkthroughs appear
              automatically.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {(['beginner', 'intermediate', 'advanced'] as UserLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => updatePreferences({ defaultLevel: lvl })}
                  className={`rounded-md border px-4 py-2 text-xs font-medium capitalize transition-colors ${
                    preferences.defaultLevel === lvl
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </section>

          {/* Explanation Style */}
          <section className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Explanation Depth</h2>
            <p className="text-xs text-[var(--muted)]">
              Adjusts prose length across concept explanations and debugging takeaways.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {(['concise', 'balanced', 'detailed'] as ExplanationStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => updatePreferences({ explanationStyle: style })}
                  className={`rounded-md border px-4 py-2 text-xs font-medium capitalize transition-colors ${
                    preferences.explanationStyle === style
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </section>

          {/* Appearance & Editor */}
          <section className="space-y-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--ink)]">Color Theme</h2>
              <div className="flex flex-wrap gap-2">
                {(['light', 'dark', 'system'] as ThemePreference[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updatePreferences({ theme: t })}
                    className={`rounded-md border px-4 py-2 text-xs font-medium capitalize transition-colors ${
                      preferences.theme === t
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                        : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-[var(--line)] pt-4">
              <div className="flex items-center justify-between">
                <label htmlFor="editor-font-size" className="text-sm font-semibold text-[var(--ink)]">
                  Sandbox Editor Font Size
                </label>
                <span className="font-mono text-xs tabular-nums text-[var(--muted)]">
                  {preferences.editorFontSize} px
                </span>
              </div>
              <input
                id="editor-font-size"
                type="range"
                min={12}
                max={18}
                step={1}
                value={preferences.editorFontSize}
                onChange={(e) =>
                  updatePreferences({ editorFontSize: Number(e.target.value) })
                }
                className="w-full accent-[var(--accent)]"
              />
            </div>
          </section>

          {/* Data Management */}
          <section className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Local Data Controls</h2>
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              Conversations, bookmarks, and practice progress are stored locally in your browser.
              Export a backup anytime or clear your saved history.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)]"
              >
                <Download className="h-3.5 w-3.5" />
                Export JSON Backup
              </button>

              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--danger)]/40 bg-[var(--danger-soft)] px-4 py-2 text-xs font-medium text-[var(--danger)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Saved Data
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-md bg-[var(--danger)] px-3.5 py-2 text-xs font-medium text-white"
                  >
                    Confirm Delete All
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs font-medium text-[var(--ink)]"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {clearedNotice && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
                  <Check className="h-3.5 w-3.5" />
                  Local data cleared
                </span>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
