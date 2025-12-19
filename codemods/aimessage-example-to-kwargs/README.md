# aimessage-example-to-kwargs

Migrates the deprecated `example` parameter in `AIMessage` constructor calls to use `additional_kwargs` instead, as required for LangChain v1.

## Summary

The `example` parameter was removed from `AIMessage` in LangChain v1. Metadata should now be carried via `additional_kwargs` instead.

## Transformation Logic

1. Finds `AIMessage(...)` constructor calls with `example=EXPR` keyword argument
2. Removes the `example=EXPR` argument
3. Handles `additional_kwargs` in different scenarios:
   - If `additional_kwargs` is not present: adds `additional_kwargs={"example": EXPR}`
   - If `additional_kwargs` is a dict literal: merges `"example": EXPR` into it
   - If `additional_kwargs` is a variable: wraps with `{**var, "example": EXPR}`

## Before / After

### Basic transformation

```python
# Before
msg = AIMessage(content="hi", example=True)

# After
msg = AIMessage(content="hi", additional_kwargs={"example": True})
```

### Merging with existing dict

```python
# Before
msg = AIMessage(content="hi", example=True, additional_kwargs={"foo": 1})

# After
msg = AIMessage(content="hi", additional_kwargs={"example": True, "foo": 1})
```

### Merging with variable

```python
# Before
msg = AIMessage(content="hi", example=True, additional_kwargs=kwargs)

# After
msg = AIMessage(content="hi", additional_kwargs={**kwargs, "example": True})
```

## Edge Cases

- If `additional_kwargs` already contains an `"example"` key, the transformation is skipped to avoid overriding semantics
- Only transforms calls to functions named `AIMessage` (does not transform other message types)

## Usage

```bash
# Run the codemod
npx codemod@latest run aimessage-example-to-kwargs --target /path/to/your/project

# Run tests
pnpm test
```

