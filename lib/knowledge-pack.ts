import type { CitationItem } from './types';

export interface KnowledgeChunk {
  id: string;
  title: string;
  section: string;
  url: string;
  topics: string[];
  content: string;
}

export const CURATED_PYTHON_CHUNKS: KnowledgeChunk[] = [
  {
    id: 'py-slicing-1',
    title: 'Python Tutorial — Lists & Strings',
    section: 'Sequence Slicing (start:stop:step)',
    url: 'https://docs.python.org/3/tutorial/introduction.html#lists',
    topics: ['strings', 'slicing', 'lists', 'slice', 'reverse', 'sublist'],
    content:
      'In Python, slicing `seq[start:stop:step]` returns a shallow copy containing elements from `start` up to (but excluding) `stop`. Negative indices count from the end (`-1` is the last item), and `seq[::-1]` iterates backwards with step `-1`. Out-of-range slice indices are handled gracefully without raising IndexError.',
  },
  {
    id: 'py-mutability-2',
    title: 'Python Data Model — Objects, Values, and Types',
    section: 'Mutable vs Immutable Sequences & Aliasing',
    url: 'https://docs.python.org/3/reference/datamodel.html#objects-values-and-types',
    topics: ['list', 'aliasing', 'copy', 'mutable', 'immutable', 'reference', 'append'],
    content:
      'Assigning `b = a` binds a second name to the same list object rather than copying it. Mutating `b` via `.append()` or index assignment affects `a`. Use `a.copy()` or `list(a)` for a shallow copy, or `copy.deepcopy(a)` for nested mutable structures.',
  },
  {
    id: 'py-loops-3',
    title: 'Python Tutorial — More Control Flow Tools',
    section: 'for Statements & range()',
    url: 'https://docs.python.org/3/tutorial/controlflow.html#for-statements',
    topics: ['for', 'loop', 'range', 'enumerate', 'iterate', 'iteration', 'while'],
    content:
      'Python `for` loops iterate directly over items of any sequence or iterable. Avoid modifying a list while iterating over it directly; iterate over a copy or build a new list. Use `enumerate(iterable)` when both index and item are needed.',
  },
  {
    id: 'py-dicts-4',
    title: 'Python Library Reference — Mapping Types (dict)',
    section: 'Dictionary Access & .get()',
    url: 'https://docs.python.org/3/library/stdtypes.html#mapping-types-dict',
    topics: ['dict', 'dictionary', 'keyerror', 'get', 'items', 'keys', 'values', 'hash'],
    content:
      'Indexing `d[key]` raises `KeyError` if `key` is missing. Use `d.get(key, default)` for safe lookup without mutating the dictionary, or `collections.Counter` / `collections.defaultdict` when counting or grouping items.',
  },
  {
    id: 'py-functions-5',
    title: 'Python Tutorial — Defining Functions',
    section: 'Default Argument Values (Mutable Default Trap)',
    url: 'https://docs.python.org/3/tutorial/controlflow.html#default-argument-values',
    topics: ['function', 'def', 'default', 'argument', 'scope', 'return', 'parameter'],
    content:
      'Default argument values are evaluated only once at function definition time, not on each call. Never use a mutable object like `[]` or `{}` as a default argument; instead use `None` as the default and create a fresh list/dict inside the function body.',
  },
  {
    id: 'py-comprehensions-6',
    title: 'Python Tutorial — Data Structures',
    section: 'List Comprehensions',
    url: 'https://docs.python.org/3/tutorial/datastructures.html#list-comprehensions',
    topics: ['comprehension', 'list', 'filter', 'map', 'generator', 'expression'],
    content:
      'List comprehensions `[expr for item in iterable if condition]` provide a concise, readable way to construct lists. When you only need to iterate once or pass items to `sum()`/`any()`/`all()`, prefer a generator expression `(expr for item in iterable)` to avoid allocating an intermediate list.',
  },
  {
    id: 'py-errors-7',
    title: 'Python Tutorial — Errors and Exceptions',
    section: 'Handling Exceptions & Common Built-in Errors',
    url: 'https://docs.python.org/3/tutorial/errors.html',
    topics: ['error', 'exception', 'traceback', 'indexerror', 'typeerror', 'valueerror', 'syntaxerror', 'try', 'except', 'debug'],
    content:
      'Always catch specific exception types (such as `ValueError` or `ZeroDivisionError`) in `try ... except` blocks rather than a bare `except:`. Read Python tracebacks from bottom to top: the bottom line names the exception class and message, and the preceding frame shows the exact line that triggered it.',
  },
  {
    id: 'py-recursion-8',
    title: 'Python Execution Model — Call Stack & Recursion',
    section: 'Base Cases & RecursionError',
    url: 'https://docs.python.org/3/library/sys.html#sys.getrecursionlimit',
    topics: ['recursion', 'recursive', 'base', 'stack', 'factorial', 'fibonacci', 'recursionerror'],
    content:
      'Every recursive function requires at least one base case that returns without recursing, plus a recursive step that strictly moves toward the base case. Python does not perform tail-call optimization and enforces a call-depth limit (`sys.getrecursionlimit()`, typically 1000), raising `RecursionError` if exceeded.',
  },
];

export function retrievePythonReferences(query: string, limit = 3): {
  contextBlock: string;
  allowedCitations: CitationItem[];
} {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const scored = CURATED_PYTHON_CHUNKS.map((chunk) => {
    let score = 0;
    const haystack = `${chunk.title} ${chunk.section} ${chunk.content}`.toLowerCase();
    for (const token of tokens) {
      if (chunk.topics.includes(token)) score += 3;
      else if (haystack.includes(token)) score += 1;
    }
    return { chunk, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (scored.length === 0) {
    return { contextBlock: '', allowedCitations: [] };
  }

  const contextBlock = scored
    .map(
      ({ chunk }, i) =>
        `[REFERENCE ${i + 1}] ${chunk.title} — ${chunk.section} (${chunk.url})\n${chunk.content}`
    )
    .join('\n\n');

  const allowedCitations: CitationItem[] = scored.map(({ chunk }) => ({
    title: chunk.title,
    section: chunk.section,
    url: chunk.url,
  }));

  return { contextBlock, allowedCitations };
}
