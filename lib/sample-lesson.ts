import type { TutorPayload } from './types';

export const SAMPLE_LANDING_LESSON: TutorPayload = {
  mode: 'solve',
  level: 'beginner',
  topic: 'Strings & Loops',
  title: 'Count vowels in a sentence',
  summary:
    'Walk through each character one by one, normalize uppercase letters to lowercase, and increment a counter whenever the character belongs to "aeiou".',
  problem_understanding:
    'Given a text string that may include uppercase letters, spaces, and punctuation, count how many vowel characters appear in total.',
  error_analysis: null,
  concepts: [
    {
      name: 'Iteration over strings',
      why: 'In Python, a for loop visits each character of a string directly without needing index arithmetic.',
    },
    {
      name: 'Membership testing (in)',
      why: 'Checking `char in "aeiou"` is clearer and less error-prone than chaining five `or` conditions.',
    },
  ],
  approach:
    'Start a counter at zero, inspect each character in lowercase so "A" and "a" match the same rule, and add 1 when it is a vowel.',
  algorithm: [
    'Initialize `count = 0` and define `vowels = "aeiou"`.',
    'Loop over every character in `text.lower()`.',
    'If the character is inside `vowels`, add 1 to `count`.',
    'Return and print the final count.',
  ],
  code: `def count_vowels(text):
    vowels = "aeiou"
    count = 0
    for ch in text.lower():
        if ch in vowels:
            count += 1
    return count

print(count_vowels("PyMentor"))`,
  line_by_line: [
    { line: 1, explanation: 'Define a reusable function named `count_vowels` that accepts one string `text`.' },
    { line: 2, explanation: 'Store the five lowercase vowel characters in a reference string.' },
    { line: 3, explanation: 'Initialize our running total at zero before the loop begins.' },
    { line: 4, explanation: 'Convert `text` to lowercase once, then visit each character `ch` in order.' },
    { line: 5, explanation: 'Check whether the current character appears anywhere inside `"aeiou"`.' },
    { line: 6, explanation: 'When it matches, increment `count` by 1.' },
    { line: 7, explanation: 'Hand the final integer count back to whoever called the function.' },
    { line: 9, explanation: 'Call the function with `"PyMentor"` and print the result (2).' },
  ],
  dry_run: [
    { step: 1, variables: { ch: "'p'", count: '0' }, output: '' },
    { step: 2, variables: { ch: "'y'", count: '0' }, output: '' },
    { step: 3, variables: { ch: "'m'", count: '0' }, output: '' },
    { step: 4, variables: { ch: "'e'", count: '1' }, output: '' },
    { step: 5, variables: { ch: "'n'", count: '1' }, output: '' },
    { step: 6, variables: { ch: "'t'", count: '1' }, output: '' },
    { step: 7, variables: { ch: "'o'", count: '2' }, output: '' },
    { step: 8, variables: { ch: "'r'", count: '2' }, output: '2' },
  ],
  sample_io: [
    { input: 'count_vowels("PyMentor")', output: '2' },
    { input: 'count_vowels("AEIOU")', output: '5' },
  ],
  complexity: { time: 'O(n)', space: 'O(1)' },
  prevention: null,
  practice: {
    question: 'Modify `count_vowels` so it returns a dictionary with the separate count for each vowel found.',
    hint: 'Create `counts = {}` and use `counts[ch] = counts.get(ch, 0) + 1` inside the `if` block.',
  },
  citations: [
    {
      title: 'Python Tutorial — More Control Flow Tools',
      section: 'for Statements & range()',
      url: 'https://docs.python.org/3/tutorial/controlflow.html#for-statements',
    },
  ],
  warnings: [],
  follow_up_prompts: [
    'How could we write this with a generator expression?',
    'What happens if we also treat "y" as a vowel?',
  ],
  refusal: false,
};
