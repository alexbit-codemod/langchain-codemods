# LangChain: SystemMessage to String Prompt

This codemod transforms LangChain code that passes `SystemMessage(content=...)` as a prompt argument to `create_agent()` or `create_react_agent()` calls, replacing it with just the string content.

## What it does

LangChain v1 expects `system_prompt` to be a string. If code passes `SystemMessage(content=...)` as the prompt, it must be replaced with the underlying string content.

### Transformations

1. **Renames `prompt=` to `system_prompt=`** when the value is a `SystemMessage`
2. **Extracts the content** from `SystemMessage(content=X)` to just `X`
3. **Removes unused `SystemMessage` imports** if they become unused after transformation

### Before

```python
from langchain.messages import SystemMessage

agent = create_agent(
    model="gpt-4o",
    tools=tools,
    prompt=SystemMessage(content="You are a helpful assistant"),
)
```

### After

```python
agent = create_agent(
    model="gpt-4o",
    tools=tools,
    system_prompt="You are a helpful assistant",
)
```

## Detection Criteria

The codemod detects and transforms code when:

- The function call is `create_agent(...)` or `create_react_agent(...)`
- The argument is `prompt=` or `system_prompt=`
- The value is `SystemMessage(content=EXPR)` with `content=` as a **keyword argument**
- The `SystemMessage` is imported from:
  - `langchain.messages`
  - `langchain_core.messages`
  - `langchain.core.messages`

## Edge Cases

- **Positional arguments are skipped**: If `SystemMessage(...)` is called with a positional argument (no `content=` keyword), it's not transformed to avoid mis-extracting
- **Non-string content is preserved**: If `SystemMessage(content=some_variable)` uses a variable, the variable reference is preserved as-is
- **Import cleanup**: Only removes `SystemMessage` from imports if it's no longer used elsewhere in the file
- **Mixed imports preserved**: If other symbols are imported alongside `SystemMessage`, only `SystemMessage` is removed from the import statement

## Running the Codemod

```bash
# From the codemod directory
npx codemod jssg run -l python ./scripts/codemod.ts /path/to/target

# Or using the workflow
npx codemod workflow run -w workflow.yaml -t /path/to/target
```

## Running Tests

```bash
npx codemod jssg test -l python ./scripts/codemod.ts
```

