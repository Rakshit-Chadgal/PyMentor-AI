'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Code2,
  MessageSquarePlus,
  Moon,
  PanelLeft,
  PanelRight,
  Pencil,
  RotateCcw,
  Send,
  Square,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { TutorResponseCard } from '@/components/TutorResponseCard';
import { PythonSandbox } from '@/components/PythonSandbox';
import { PythonCodeBlock } from '@/components/PythonCodeBlock';
import { usePreferences } from '@/components/AppProviders';
import {
  loadBookmarks,
  loadConversations,
  loadEditorDraft,
  recordActivityDay,
  saveBookmarks,
  saveConversations,
  saveEditorDraft,
} from '@/lib/storage';
import { consumeChatSSE, extractStreamingPreview } from '@/lib/sse';
import type {
  Bookmark,
  ChatMessage,
  Conversation,
  TutorMode,
  TutorPayload,
  UserLevel,
} from '@/lib/types';

const MODES: { value: TutorMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'explain', label: 'Explain' },
  { value: 'solve', label: 'Solve' },
  { value: 'debug', label: 'Debug' },
  { value: 'practice', label: 'Practice' },
  { value: 'chat', label: 'Chat' },
];

const LEVELS: { value: UserLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const QUICK_TOPICS = [
  'How do Python list comprehensions work?',
  'Write a function that finds duplicate items in a list',
  'Why does `a = [1, 2]; b = a` mutate both lists?',
  'Explain recursion with factorial and a base case',
];

const DEFAULT_SANDBOX_CODE = `# Test any Python 3 snippet here
def greet(name):
    return f"Hello, {name}!"

print(greet("Python learner"))
`;

export function TutorWorkspace() {
  const searchParams = useSearchParams();
  const { preferences, resolvedTheme, toggleTheme } = usePreferences();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [mode, setMode] = useState<TutorMode>('auto');
  const [level, setLevel] = useState<UserLevel>(preferences.defaultLevel);
  const [input, setInput] = useState('');
  const [includeEditorCode, setIncludeEditorCode] = useState(false);
  const [editorCode, setEditorCode] = useState(DEFAULT_SANDBOX_CODE);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [healthNotice, setHealthNotice] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const initialQueryHandledRef = useRef(false);

  // Check tutor API readiness once on mount
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('unhealthy'))))
      .then((data: { providerConfigured?: boolean }) => {
        if (data && data.providerConfigured === false) {
          setHealthNotice(
            'AI tutor model is not configured in this environment. You can still run Python 3 code in the Sandbox and review saved lessons.'
          );
        }
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') {
          setHealthNotice(
            'Unable to reach the tutor service right now. Local Python 3 Sandbox and saved lessons remain available.'
          );
        }
      });
    return () => controller.abort();
  }, []);

  // Hydrate stored conversations & bookmarks
  useEffect(() => {
    queueMicrotask(() => {
      const loaded = loadConversations();
      const loadedBookmarks = loadBookmarks();
      setConversations(loaded);
      setBookmarks(loadedBookmarks);
      setLevel(preferences.defaultLevel);

      const paramId = searchParams.get('c');
      if (paramId && loaded.some((c) => c.id === paramId)) {
        setActiveId(paramId);
        const draft = loadEditorDraft(paramId);
        if (draft !== null) setEditorCode(draft);
      } else if (loaded.length > 0 && !searchParams.get('q')) {
        setActiveId(loaded[0].id);
        const draft = loadEditorDraft(loaded[0].id);
        if (draft !== null) setEditorCode(draft);
      }

      const paramCode = searchParams.get('code');
      if (paramCode) {
        setEditorCode(paramCode);
        setSandboxOpen(true);
      } else if (window.innerWidth < 768) {
        setSandboxOpen(false);
      }

      setHydrated(true);
    });
  }, [preferences.defaultLevel, searchParams]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  const persistConversations = useCallback((next: Conversation[]) => {
    setConversations(next);
    saveConversations(next);
  }, []);

  const handleSelectConversation = (convId: string) => {
    if (streaming) return;
    setActiveId(convId);
    setStreamError(null);
    setSidebarOpen(false);
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      setMode(conv.mode);
      setLevel(conv.level);
    }
    const draft = loadEditorDraft(convId);
    if (draft !== null) {
      setEditorCode(draft);
    }
  };

  const handleNewConversation = () => {
    if (streaming) return;
    setActiveId(null);
    setStreamError(null);
    setSidebarOpen(false);
  };

  const handleEditorChange = (nextCode: string) => {
    setEditorCode(nextCode);
    if (activeId) {
      saveEditorDraft(activeId, nextCode);
    }
  };

  const sendPrompt = useCallback(
    async (
      promptText: string,
      opts?: {
        overrideMode?: TutorMode;
        attachedCode?: string;
        attachedStderr?: string;
        reuseConversationId?: string | null;
      }
    ) => {
      const trimmed = promptText.trim();
      if (!trimmed || streaming) return;

      setStreamError(null);
      const effectiveMode = opts?.overrideMode ?? mode;
      const targetConvId =
        opts?.reuseConversationId !== undefined ? opts.reuseConversationId : activeId;

      const now = new Date().toISOString();
      const userMsgId = crypto.randomUUID();
      const assistantMsgId = crypto.randomUUID();

      const userMessage: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: trimmed,
        status: 'complete',
        createdAt: now,
      };

      const placeholderAssistant: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        partialText: '',
        status: 'streaming',
        createdAt: now,
      };

      let updatedConversations: Conversation[];
      let convId: string;
      let priorHistory: { role: 'user' | 'assistant'; content: string }[] = [];

      const existing = targetConvId
        ? conversations.find((c) => c.id === targetConvId)
        : undefined;

      if (existing) {
        convId = existing.id;
        priorHistory = existing.messages
          .filter((m) => m.status === 'complete')
          .map((m) => ({
            role: m.role,
            content:
              m.role === 'assistant' && m.payload
                ? `${m.payload.title}: ${m.payload.summary}\n${m.payload.code ?? ''}`
                : m.content,
          }));
        const nextConv: Conversation = {
          ...existing,
          mode: effectiveMode,
          level,
          updatedAt: now,
          messages: [...existing.messages, userMessage, placeholderAssistant],
        };
        updatedConversations = [
          nextConv,
          ...conversations.filter((c) => c.id !== existing.id),
        ];
      } else {
        convId = crypto.randomUUID();
        const shortTitle =
          trimmed.length > 46 ? trimmed.slice(0, 46).trim() + '…' : trimmed;
        const newConv: Conversation = {
          id: convId,
          title: shortTitle,
          mode: effectiveMode,
          level,
          messages: [userMessage, placeholderAssistant],
          createdAt: now,
          updatedAt: now,
        };
        updatedConversations = [newConv, ...conversations];
      }

      setActiveId(convId);
      persistConversations(updatedConversations);
      setInput('');
      setStreaming(true);
      recordActivityDay();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const updateAssistantMessage = (updater: (msg: ChatMessage) => ChatMessage) => {
        setConversations((prev) => {
          const next = prev.map((conv) => {
            if (conv.id !== convId) return conv;
            return {
              ...conv,
              updatedAt: new Date().toISOString(),
              messages: conv.messages.map((m) =>
                m.id === assistantMsgId ? updater(m) : m
              ),
            };
          });
          saveConversations(next);
          return next;
        });
      };

      try {
        const res = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            messageId: assistantMsgId,
            mode: effectiveMode,
            level,
            style: preferences.explanationStyle,
            history: priorHistory,
            prompt: trimmed,
            editorCode:
              opts?.attachedCode ?? (includeEditorCode ? editorCode : undefined),
            editorStderr: opts?.attachedStderr,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.detail || `Request failed (${res.status})`);
        }

        let completedPayload: TutorPayload | null = null;
        let erroredMessage: string | null = null;

        await consumeChatSSE(
          res,
          {
            onDelta: ({ accumulated }) => {
              updateAssistantMessage((m) => ({
                ...m,
                partialText: accumulated,
              }));
            },
            onCompleted: ({ payload }) => {
              completedPayload = payload;
              setConversations((prev) => {
                const next = prev.map((conv) => {
                  if (conv.id !== convId) return conv;
                  const isFirstTurn = conv.messages.length <= 2;
                  return {
                    ...conv,
                    title: isFirstTurn && payload.title ? payload.title : conv.title,
                    updatedAt: new Date().toISOString(),
                    messages: conv.messages.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            content: payload.summary,
                            payload,
                            partialText: undefined,
                            mode: payload.mode,
                            level: payload.level,
                            status: 'complete' as const,
                          }
                        : m
                    ),
                  };
                });
                saveConversations(next);
                return next;
              });
            },
            onError: ({ detail }) => {
              erroredMessage = detail;
            },
          },
          controller.signal
        );

        if (erroredMessage) {
          throw new Error(erroredMessage);
        }

        if (!completedPayload && !controller.signal.aborted) {
          throw new Error('The tutor stream ended before completing.');
        }
      } catch (err) {
        if (controller.signal.aborted) {
          updateAssistantMessage((m) => ({
            ...m,
            status: 'incomplete',
          }));
        } else {
          const message =
            err instanceof Error ? err.message : 'Unable to reach PyMentor.';
          setStreamError(message);
          updateAssistantMessage((m) => ({
            ...m,
            status: 'failed',
            content: message,
          }));
        }
      } finally {
        setStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [
      activeId,
      conversations,
      editorCode,
      includeEditorCode,
      level,
      mode,
      persistConversations,
      preferences.explanationStyle,
      streaming,
    ]
  );

  // Handle initial ?q=... launch once hydrated
  useEffect(() => {
    if (!hydrated || initialQueryHandledRef.current) return;
    const q = searchParams.get('q');
    const qMode = searchParams.get('mode') as TutorMode | null;
    if (q) {
      initialQueryHandledRef.current = true;
      queueMicrotask(() => {
        const validMode =
          qMode && MODES.some((m) => m.value === qMode) ? qMode : undefined;
        if (validMode) {
          setMode(validMode);
        }
        sendPrompt(q, {
          overrideMode: validMode,
          reuseConversationId: null,
        });
      });
    }
  }, [hydrated, searchParams, sendPrompt]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeConversation?.messages.length, streaming]);

  const handleStopStream = () => {
    abortControllerRef.current?.abort();
  };

  const handleRetryFailed = (failedAssistantId: string) => {
    if (!activeConversation || streaming) return;
    const idx = activeConversation.messages.findIndex((m) => m.id === failedAssistantId);
    if (idx <= 0) return;
    const prevUserMsg = activeConversation.messages[idx - 1];
    if (!prevUserMsg || prevUserMsg.role !== 'user') return;

    const trimmedMessages = activeConversation.messages.slice(0, idx - 1);
    const updated = conversations.map((c) =>
      c.id === activeConversation.id ? { ...c, messages: trimmedMessages } : c
    );
    persistConversations(updated);
    sendPrompt(prevUserMsg.content, { reuseConversationId: activeConversation.id });
  };

  const handleDeleteConversation = (convId: string) => {
    if (streaming) return;
    const next = conversations.filter((c) => c.id !== convId);
    persistConversations(next);
    if (activeId === convId) {
      setActiveId(next[0]?.id ?? null);
    }
  };

  const handleSaveRename = (convId: string) => {
    const trimmed = renameText.trim();
    if (trimmed) {
      const next = conversations.map((c) =>
        c.id === convId ? { ...c, title: trimmed } : c
      );
      persistConversations(next);
    }
    setRenamingId(null);
  };

  const handleToggleBookmark = (message: ChatMessage) => {
    if (!message.payload || !activeConversation) return;
    const exists = bookmarks.some((b) => b.messageId === message.id);
    const next = exists
      ? bookmarks.filter((b) => b.messageId !== message.id)
      : [
          {
            id: crypto.randomUUID(),
            messageId: message.id,
            conversationId: activeConversation.id,
            title: message.payload.title,
            topic: message.payload.topic,
            mode: message.payload.mode,
            level: message.payload.level,
            payload: message.payload,
            createdAt: new Date().toISOString(),
          },
          ...bookmarks,
        ];
    setBookmarks(next);
    saveBookmarks(next);
  };

  const handleMessageFeedback = (messageId: string, rating: -1 | 1) => {
    if (!activeConversation) return;
    const next: Conversation[] = conversations.map((c) =>
      c.id !== activeConversation.id
        ? c
        : {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== messageId) return m;
              const nextFeedback: -1 | 0 | 1 = m.feedback === rating ? 0 : rating;
              return { ...m, feedback: nextFeedback };
            }),
          }
    );
    persistConversations(next);
  };

  const handleLoadInSandbox = (code: string) => {
    setEditorCode(code);
    if (activeId) saveEditorDraft(activeId, code);
    setSandboxOpen(true);
  };

  const handleDebugFromSandbox = (brokenCode: string, stderr: string) => {
    setMode('debug');
    sendPrompt('Please debug this Python code and explain the traceback.', {
      overrideMode: 'debug',
      attachedCode: brokenCode,
      attachedStderr: stderr,
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendPrompt(input);
  };

  return (
    <div className="flex h-screen flex-col bg-[var(--paper)] text-[var(--ink)]">
      <TopBar />

      {/* Workspace Toolbar */}
      <div className="border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2 sm:px-6">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle conversations sidebar"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--paper)] px-2.5 text-xs font-medium text-[var(--ink)] xl:hidden"
            >
              <PanelLeft className="h-3.5 w-3.5" />
              History
            </button>

            {/* Mode Segmented Control */}
            <div
              role="group"
              aria-label="Tutor mode"
              className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--paper)] p-0.5"
            >
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    mode === m.value
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Level Segmented Control */}
            <div
              role="group"
              aria-label="Skill level"
              className="flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--paper)] p-0.5"
            >
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLevel(l.value)}
                  className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    level === l.value
                      ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs border border-[var(--line)]'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] transition-colors hover:bg-[var(--surface-subtle)]"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSandboxOpen((v) => !v)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                sandboxOpen
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]'
              }`}
            >
              <PanelRight className="h-3.5 w-3.5" />
              Sandbox
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-Pane Workspace */}
      <div className="relative mx-auto flex min-h-0 w-full max-w-[1440px] flex-1">
        {/* Mobile / Tablet Sidebar Backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 xl:hidden"
          />
        )}

        {/* Left Sidebar: Conversations */}
        <aside
          aria-label="Conversations"
          className={`${
            sidebarOpen ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden'
          } w-[272px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)] xl:static xl:flex`}
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] p-3.5">
            <button
              type="button"
              onClick={handleNewConversation}
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 text-xs font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
            >
              <MessageSquarePlus className="h-4 w-4" />
              New Lesson
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] xl:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5">
            {conversations.length === 0 ? (
              <p className="px-2 py-4 text-xs leading-relaxed text-[var(--muted)]">
                Your Python tutoring sessions are saved here automatically.
              </p>
            ) : (
              <ul className="space-y-1">
                {conversations.map((conv) => {
                  const isActive = conv.id === activeId;
                  return (
                    <li key={conv.id} className="group relative">
                      {renamingId === conv.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveRename(conv.id);
                          }}
                          className="flex items-center gap-1 px-1 py-1"
                        >
                          <input
                            type="text"
                            autoFocus
                            value={renameText}
                            onChange={(e) => setRenameText(e.target.value)}
                            onBlur={() => handleSaveRename(conv.id)}
                            className="h-8 flex-1 rounded border border-[var(--accent)] bg-[var(--paper)] px-2 text-xs text-[var(--ink)]"
                          />
                        </form>
                      ) : (
                        <div
                          className={`flex items-center justify-between rounded-md px-2.5 py-2 text-xs transition-colors ${
                            isActive
                              ? 'bg-[var(--accent-soft)] font-medium text-[var(--ink)]'
                              : 'text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectConversation(conv.id)}
                            className="flex-1 truncate text-left"
                          >
                            {conv.title}
                          </button>
                          <div className="ml-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            <button
                              type="button"
                              aria-label="Rename conversation"
                              onClick={() => {
                                setRenamingId(conv.id);
                                setRenameText(conv.title);
                              }}
                              className="rounded p-1 hover:bg-[var(--line)]/50"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              aria-label="Delete conversation"
                              onClick={() => handleDeleteConversation(conv.id)}
                              className="rounded p-1 hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Center Transcript + Composer */}
        <main id="main-content" className="flex min-w-0 flex-1 flex-col">
          {healthNotice && (
            <div
              role="status"
              className="flex items-center justify-between gap-3 border-b border-[var(--warn)]/30 bg-[var(--warn-soft)] px-4 py-2 text-xs text-[var(--warn)] sm:px-6"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{healthNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setHealthNotice(null)}
                aria-label="Dismiss status notice"
                className="rounded p-0.5 hover:bg-black/5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div
            aria-live="polite"
            aria-busy={streaming}
            className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
          >
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <div className="mx-auto max-w-2xl py-8">
                <h1 className="font-display text-2xl font-semibold text-[var(--ink)] sm:text-3xl">
                  What would you like to learn or debug in Python?
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  Ask a conceptual question, describe a problem to solve, or paste code and a
                  traceback. PyMentor adapts to your level ({level}).
                </p>

                <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {QUICK_TOPICS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendPrompt(prompt)}
                      className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3.5 text-left text-sm text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6">
                {activeConversation.messages.map((msg) => {
                  if (msg.role === 'user') {
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div className="max-w-[85%] rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 text-sm leading-relaxed text-[var(--ink)] whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    );
                  }

                  if (msg.status === 'streaming') {
                    const preview = extractStreamingPreview(msg.partialText ?? '');
                    return (
                      <div
                        key={msg.id}
                        className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"
                      >
                        <p className="text-xs font-medium text-[var(--accent)]">
                          PyMentor is writing your lesson…
                        </p>
                        {preview.title && (
                          <h3 className="mt-2 font-display text-xl font-semibold text-[var(--ink)]">
                            {preview.title}
                          </h3>
                        )}
                        {preview.summary && (
                          <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">
                            {preview.summary}
                          </p>
                        )}
                        {preview.approach && (
                          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                            {preview.approach}
                          </p>
                        )}
                        {preview.code && (
                          <div className="mt-4">
                            <PythonCodeBlock code={preview.code} />
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (msg.status === 'failed' || msg.status === 'incomplete') {
                    return (
                      <div
                        key={msg.id}
                        className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger-soft)] p-4 text-sm"
                      >
                        <div className="flex items-center gap-2 font-medium text-[var(--danger)]">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>
                            {msg.status === 'incomplete'
                              ? 'Response stopped before completion'
                              : 'Could not complete tutor response'}
                          </span>
                        </div>
                        {msg.content && (
                          <p className="mt-1.5 text-xs text-[var(--ink)]">{msg.content}</p>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRetryFailed(msg.id)}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper)]"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Retry
                        </button>
                      </div>
                    );
                  }

                  if (!msg.payload) return null;

                  return (
                    <TutorResponseCard
                      key={msg.id}
                      payload={msg.payload}
                      isBookmarked={bookmarks.some((b) => b.messageId === msg.id)}
                      feedback={msg.feedback}
                      onToggleBookmark={() => handleToggleBookmark(msg)}
                      onFeedback={(rating) => handleMessageFeedback(msg.id, rating)}
                      onRunInSandbox={handleLoadInSandbox}
                      onFollowUp={(followUp) => sendPrompt(followUp)}
                    />
                  );
                })}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>

          {streamError && (
            <div className="border-t border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-2 text-xs text-[var(--danger)]">
              {streamError}
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={handleFormSubmit}
            className="border-t border-[var(--line)] bg-[var(--surface)] px-4 py-3 sm:px-6"
          >
            <div className="mx-auto max-w-3xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={includeEditorCode}
                    onChange={(e) => setIncludeEditorCode(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[var(--line)] accent-[var(--accent)]"
                  />
                  <Code2 className="h-3.5 w-3.5" />
                  Include current Sandbox code with message
                </label>
                <span className="hidden text-xs text-[var(--muted)] sm:inline">
                  Enter to send · Shift+Enter for newline
                </span>
              </div>

              <div className="flex items-end gap-2">
                <label htmlFor="tutor-composer" className="sr-only">
                  Ask PyMentor a Python question
                </label>
                <textarea
                  id="tutor-composer"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendPrompt(input);
                    }
                  }}
                  rows={2}
                  placeholder="Ask a Python question, describe a problem, or paste an error…"
                  className="max-h-40 min-h-[52px] flex-1 resize-y rounded-md border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]"
                />

                {streaming ? (
                  <button
                    type="button"
                    onClick={handleStopStream}
                    className="inline-flex h-11 items-center gap-1.5 rounded-md bg-[var(--danger)] px-4 text-sm font-medium text-white whitespace-nowrap shrink-0"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="inline-flex h-11 items-center gap-1.5 rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-ink)] whitespace-nowrap shrink-0 transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Ask
                  </button>
                )}
              </div>
            </div>
          </form>
        </main>

        {/* Right Pane: Python 3 Sandbox (Side-by-side on md+, full-screen sheet on mobile) */}
        {sandboxOpen && (
          <aside
            aria-label="Python Sandbox"
            className="fixed inset-0 z-40 flex flex-col bg-[var(--paper)] p-3 md:static md:z-auto md:w-[360px] lg:w-[410px] xl:w-[440px] md:shrink-0 md:border-l md:border-[var(--line)]"
          >
            <div className="mb-2 flex items-center justify-between md:hidden">
              <span className="text-xs font-medium text-[var(--muted)]">
                Python 3 Sandbox
              </span>
              <button
                type="button"
                onClick={() => setSandboxOpen(false)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--ink)]"
              >
                <X className="h-3.5 w-3.5" />
                Back to Lesson
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <PythonSandbox
                code={editorCode}
                onChangeCode={handleEditorChange}
                fontSize={preferences.editorFontSize}
                onAskDebug={handleDebugFromSandbox}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
