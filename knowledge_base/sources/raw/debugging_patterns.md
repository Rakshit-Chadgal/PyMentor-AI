# Python Debugging & Tracebacks

## Reading a Python Traceback

Read tracebacks from bottom to top:
1. The final line names the exception class (for example `IndexError`, `KeyError`, `TypeError`) and message.
2. The line immediately above it shows the exact source line where the error happened.
3. Earlier frames trace the call stack that led there.

## Common Bugs and Prevention Rules

### IndexError on Loops
Using `range(len(items) + 1)` or indexing `items[i + 1]` on the final iteration exceeds the list bounds. Prefer iterating directly (`for item in items:`) or `enumerate(items)`.

### RecursionError
Every recursive function needs a reachable base case that returns without recursing, and a recursive step that strictly moves closer to that base case.
