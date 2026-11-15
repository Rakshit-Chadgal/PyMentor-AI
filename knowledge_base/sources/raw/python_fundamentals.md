# Python 3 Fundamentals

## Sequence Slicing

Python supports slicing any sequence (`str`, `list`, `tuple`) using `seq[start:stop:step]`.
`start` is inclusive and `stop` is exclusive. Negative indices count from the end, so `seq[-1]` is the last element and `seq[::-1]` reverses the sequence.

```python
word = "Python"
print(word[0:2])   # Py
print(word[::-1])  # nohtyP
```

## List Aliasing vs Shallow Copy

Assigning `b = a` binds another name to the same list object. Mutating `b` mutates `a`. Use `a.copy()` or `list(a)` to create an independent shallow copy.

## Safe Dictionary Lookups

Indexing `counts[key]` raises `KeyError` when `key` is absent. Prefer `counts.get(key, 0)` when accumulating counts.

## Mutable Default Arguments

Never use `[]` or `{}` as a default parameter value. Default values are evaluated once when `def` runs. Use `None` and allocate inside the function body:

```python
def append_item(value, items=None):
    if items is None:
        items = []
    items.append(value)
    return items
```
