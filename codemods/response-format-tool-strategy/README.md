# response-format-tool-strategy

Migrates `response_format=Schema` to `response_format=ToolStrategy(Schema)` for LangChain v1 structured output configuration.

## Summary

In LangChain v1, structured output configuration uses strategy objects. Passing a schema directly to `response_format` should be updated to `ToolStrategy(schema)` for the equivalent behavior.

## Before

```python
agent = create_agent(model="gpt-4o-mini", tools=tools, response_format=OutputSchema)
```

## After

```python
from langchain.agents.structured_output import ToolStrategy

agent = create_agent(model="gpt-4o-mini", tools=tools, response_format=ToolStrategy(OutputSchema))
```

## Detection Criteria

- Find calls to `create_agent(...)`
- Identify `response_format=IDENT` where `IDENT` resolves to a class/type name (often a Pydantic `BaseModel` subclass) or any expression that is not already `ToolStrategy(...)` / `ProviderStrategy(...)`

## Transformation Logic

1. Replace `response_format=X` with `response_format=ToolStrategy(X)`
2. Add `from langchain.agents.structured_output import ToolStrategy` if missing
3. Do not transform if `response_format` value is a tuple like `(prompt, schema)` (prompted output removed)

## Edge Cases

- **Already wrapped**: Skips if `response_format` is already `ToolStrategy(...)` or `ProviderStrategy(...)`
- **Tuple forms**: Skips `(prompt, schema)` tuples and emits a warning (manual migration required since prompted output has been removed)
- **Multiple calls**: Handles multiple `create_agent` calls in the same file, adding the import only once

## Usage

```bash
# Run the codemod
npx codemod run response-format-tool-strategy --target /path/to/your/code

# Or run locally during development
npx codemod workflow run -w workflow.yaml -t /path/to/your/code
```

## Testing

```bash
npm install
npm test
```

