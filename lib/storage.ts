import type {
  Bookmark,
  Conversation,
  SolvedProblem,
  TopicProgress,
  UserPreferences,
} from './types';

const KEYS = {
  conversations: 'pymentor_conversations_v1',
  bookmarks: 'pymentor_bookmarks_v1',
  progress: 'pymentor_progress_v1',
  solved: 'pymentor_solved_v1',
  preferences: 'pymentor_preferences_v1',
  drafts: 'pymentor_drafts_v1',
  activityDays: 'pymentor_activity_days_v1',
} as const;

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultLevel: 'beginner',
  explanationStyle: 'balanced',
  theme: 'system',
  editorFontSize: 14,
};

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadConversations(): Conversation[] {
  return safeRead<Conversation[]>(KEYS.conversations, []);
}

export function saveConversations(conversations: Conversation[]): void {
  safeWrite(KEYS.conversations, conversations);
}

export function loadBookmarks(): Bookmark[] {
  return safeRead<Bookmark[]>(KEYS.bookmarks, []);
}

export function saveBookmarks(bookmarks: Bookmark[]): void {
  safeWrite(KEYS.bookmarks, bookmarks);
}

export function loadTopicProgress(): TopicProgress[] {
  return safeRead<TopicProgress[]>(KEYS.progress, []);
}

export function saveTopicProgress(progress: TopicProgress[]): void {
  safeWrite(KEYS.progress, progress);
}

export function recordTopicAttempt(topic: string, isCorrect: boolean): TopicProgress[] {
  const list = loadTopicProgress();
  const now = new Date().toISOString();
  const existing = list.find((t) => t.topic.toLowerCase() === topic.toLowerCase());
  if (existing) {
    existing.attempts += 1;
    if (isCorrect) existing.correct += 1;
    existing.lastPracticedAt = now;
  } else {
    list.push({
      topic,
      attempts: 1,
      correct: isCorrect ? 1 : 0,
      lastPracticedAt: now,
    });
  }
  saveTopicProgress(list);
  recordActivityDay();
  return list;
}

export function loadSolvedProblems(): SolvedProblem[] {
  return safeRead<SolvedProblem[]>(KEYS.solved, []);
}

export function recordSolvedProblem(problem: SolvedProblem): SolvedProblem[] {
  const list = loadSolvedProblems();
  if (!list.some((p) => p.id === problem.id)) {
    const next = [problem, ...list];
    safeWrite(KEYS.solved, next);
    recordActivityDay();
    return next;
  }
  return list;
}

export function loadActivityDays(): string[] {
  return safeRead<string[]>(KEYS.activityDays, []);
}

export function recordActivityDay(): string[] {
  const days = loadActivityDays();
  const today = new Date().toISOString().slice(0, 10);
  if (!days.includes(today)) {
    const next = [today, ...days].slice(0, 90);
    safeWrite(KEYS.activityDays, next);
    return next;
  }
  return days;
}

export function calculateStreak(days: string[]): number {
  if (days.length === 0) return 0;
  const sorted = [...new Set(days)].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = new Date(sorted[i] + 'T00:00:00Z').getTime();
    const prev = new Date(sorted[i + 1] + 'T00:00:00Z').getTime();
    if (curr - prev === 86400000) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

export function loadPreferences(): UserPreferences {
  return { ...DEFAULT_PREFERENCES, ...safeRead<Partial<UserPreferences>>(KEYS.preferences, {}) };
}

export function savePreferences(prefs: UserPreferences): void {
  safeWrite(KEYS.preferences, prefs);
}

export function loadEditorDraft(conversationId: string): string | null {
  const drafts = safeRead<Record<string, string>>(KEYS.drafts, {});
  return drafts[conversationId] ?? null;
}

export function saveEditorDraft(conversationId: string, code: string): void {
  const drafts = safeRead<Record<string, string>>(KEYS.drafts, {});
  drafts[conversationId] = code;
  safeWrite(KEYS.drafts, drafts);
}

export function exportAllLearnerData(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      preferences: loadPreferences(),
      conversations: loadConversations(),
      bookmarks: loadBookmarks(),
      topicProgress: loadTopicProgress(),
      solvedProblems: loadSolvedProblems(),
      activityDays: loadActivityDays(),
    },
    null,
    2
  );
}

export function clearAllLearnerData(): void {
  if (typeof window === 'undefined') return;
  for (const key of Object.values(KEYS)) {
    window.localStorage.removeItem(key);
  }
}
