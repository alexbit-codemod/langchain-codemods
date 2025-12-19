# bind-tools-return-type

Updates `bind_tools` return type from `BaseMessage` to `AIMessage` for LangChain v1.

## Summary

LangChain v1 fixes the chat model `bind_tools` return type to `AIMessage`; custom chat models should update type hints from `BaseMessage` to `AIMessage`.

## Detection Criteria

- Find `def bind_tools(...)-> ...` function definitions (methods on chat model classes or standalone)
- Identify return annotations containing `Runnable[LanguageModelInput, BaseMessage]` where `BaseMessage` is the output type

## Transformation Logic

1. Replace `BaseMessage` with `AIMessage` in the return annotation of `bind_tools`
2. Add `AIMessage` import if missing (from `langchain_core.messages`)
3. Remove `BaseMessage` import if it becomes unused

## Before / After Example

```python
# Before
from langchain_core.messages import BaseMessage
from langchain_core.runnables import Runnable

def bind_tools(...) -> Runnable[LanguageModelInput, BaseMessage]:
    ...
```

```python
# After
from langchain_core.messages import AIMessage
from langchain_core.runnables import Runnable

def bind_tools(...) -> Runnable[LanguageModelInput, AIMessage]:
    ...
```

## Running the Codemod

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run on a target directory
npx codemod workflow run -w workflow.yaml -t /path/to/target
```

## Notes / Edge Cases

- Only transforms `BaseMessage` when it's the second type parameter of `Runnable[..., BaseMessage]`
- Preserves `BaseMessage` import if used elsewhere in the file
- Works with both standalone functions and class methods

