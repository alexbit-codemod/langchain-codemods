# prompt-to-system-prompt

Renames the `prompt` keyword argument to `system_prompt` in calls to `create_agent()` or `create_react_agent()`.

## Summary

In v1, the static prompt parameter for agent creation is renamed from `prompt` to `system_prompt`. This codemod updates calls to avoid passing an unknown argument.

## Detection Criteria

- Find calls to `create_agent(...)` or `create_react_agent(...)` from `langchain.agents` or `langgraph.prebuilt`
- Within those calls, find a keyword argument named `prompt=...`

## Transformation Logic

1. Rename the keyword argument `prompt=` to `system_prompt=` while preserving the value expression
2. Do not change positional arguments

## Before / After Example

```python
# Before
agent = create_agent(model="gpt-4o", tools=tools, prompt="You are a helpful assistant")
```

```python
# After
agent = create_agent(model="gpt-4o", tools=tools, system_prompt="You are a helpful assistant")
```

## Edge Cases

- If both `prompt=` and `system_prompt=` are present (likely user error), skip transformation and emit a warning
- If the call target is not resolvably `create_agent`/`create_react_agent` from the expected modules, do not transform
- Uses semantic analysis to verify the call target resolves to the correct module

## Usage

```bash
# Run tests
pnpm test

# Run codemod on a target directory
pnpm run run /path/to/target
```

