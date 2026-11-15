export type TutorMode = 'auto' | 'explain' | 'solve' | 'debug' | 'practice' | 'chat';
export type ResolvedMode = 'explain' | 'solve' | 'debug' | 'practice' | 'chat';
export type UserLevel = 'beginner' | 'intermediate' | 'advanced';
export type ExplanationStyle = 'concise' | 'balanced' | 'detailed';
export type ThemePreference = 'light' | 'dark' | 'system';

export const PYTHON_TOPICS = [
  'Variables & Types',
  'Strings & Slicing',
  'Conditions & Logic',
  'Loops & Iteration',
  'Lists & Tuples',
  'Dictionaries & Sets',
  'Functions & Scope',
  'Recursion',
  'Object-Oriented Programming',
  'Error Handling & Debugging',
  'File I/O & Modules',
  'Algorithms & Complexity',
] as const;

export type PythonTopic = (typeof PYTHON_TOPICS)[number];

export interface ConceptItem {
  name: string;
  why: string;
}

export interface LineExplanation {
  line: number;
  explanation: string;
}

export interface DryRunStep {
  step: number;
  variables: Record<string, string>;
  output: string;
}

export interface SampleIO {
  input: string;
  output: string;
}

export interface ComplexityNote {
  time: string;
  space: string;
}

export interface ErrorAnalysis {
  error_class: string;
  root_cause: string;
  fix_summary: string;
}

export interface PracticePrompt {
  question: string;
  hint: string;
  solution?: string;
}

export interface CitationItem {
  title: string;
  section: string;
  url: string;
}

export interface TutorPayload {
  mode: ResolvedMode;
  level: UserLevel;
  topic: string;
  title: string;
  summary: string;
  problem_understanding: string | null;
  error_analysis: ErrorAnalysis | null;
  concepts: ConceptItem[];
  approach: string | null;
  algorithm: string[];
  code: string | null;
  line_by_line: LineExplanation[];
  dry_run: DryRunStep[];
  sample_io: SampleIO[];
  complexity: ComplexityNote | null;
  prevention: string | null;
  practice: PracticePrompt | null;
  citations: CitationItem[];
  warnings: string[];
  follow_up_prompts: string[];
  refusal: boolean;
}

export type MessageStatus = 'streaming' | 'complete' | 'incomplete' | 'failed';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  payload?: TutorPayload;
  partialText?: string;
  mode?: ResolvedMode;
  level?: UserLevel;
  status: MessageStatus;
  feedback?: -1 | 0 | 1;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  mode: TutorMode;
  level: UserLevel;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  messageId: string;
  conversationId: string;
  title: string;
  topic: string;
  mode: ResolvedMode;
  level: UserLevel;
  payload: TutorPayload;
  createdAt: string;
}

export interface TopicProgress {
  topic: string;
  attempts: number;
  correct: number;
  lastPracticedAt: string;
}

export interface SolvedProblem {
  id: string;
  title: string;
  topic: string;
  difficulty: UserLevel;
  summary: string;
  solvedAt: string;
}

export interface UserPreferences {
  defaultLevel: UserLevel;
  explanationStyle: ExplanationStyle;
  theme: ThemePreference;
  editorFontSize: number;
}

export type ExecutionStatus = 'ok' | 'error' | 'timeout' | 'output_limit' | 'unavailable';

export interface ExecutionResult {
  status: ExecutionStatus;
  exit_code: number;
  stdout: string;
  stderr: string;
  truncated: {
    stdout: boolean;
    stderr: boolean;
  };
  duration_ms: number;
  error_class: string | null;
}

export interface PracticeProblem {
  id: string;
  topic: string;
  difficulty: UserLevel;
  practiceMode: 'hint_first' | 'quiz';
  title: string;
  prompt: string;
  starter_code: string;
  hint: string;
  sample_io: SampleIO[];
  expected_concepts: string[];
  options?: string[];
}

export interface PracticeEvaluation {
  is_correct: boolean;
  score_label: 'Solved' | 'Partially Correct' | 'Needs Revision';
  feedback: string;
  why_it_works_or_fails: string;
  key_takeaway: string;
  corrected_code: string | null;
  solution_code: string;
}
