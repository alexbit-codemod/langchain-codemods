# langchain-stream-event-agent-to-model

A codemod that renames the streaming event node name from `"agent"` to `"model"` in LangChain code.

## Summary

When streaming events from LangChain agents, the node name changed from `"agent"` to `"model"`. Code that filters or branches on the node name must be updated to continue matching streamed model events.

## Detection Criteria

This codemod finds string literals `"agent"` used in streaming event filters:

- Comparisons like `event["name"] == "agent"` or `event.get("name") == "agent"`
- Membership checks like `event.get("name") in ["agent", "tool"]`
- Reverse comparisons like `"agent" == event["name"]`
- Inequality checks like `event["name"] != "agent"`

## Transformation Logic

1. Replaces string literal `"agent"` with `"model"` only in contexts that look like node-name selection/filtering (i.e., where `"name"` is used as the key)
2. Does **not** change unrelated `"agent"` strings (e.g., prompt text, logging messages, config values with different keys)

## Before / After Example

**Before:**

```python
for event in agent.stream(inputs):
    if event.get("name") == "agent":
        handle(event)
```

**After:**

```python
for event in agent.stream(inputs):
    if event.get("name") == "model":
        handle(event)
```

## Usage

```bash
# Run on a target directory
npx codemod@latest run langchain-stream-event-agent-to-model --target /path/to/your/code

# Or run locally
cd codemods/langchain-stream-event-agent-to-model
npx codemod@latest workflow run -w workflow.yaml -t /path/to/your/code
```

## Testing

```bash
cd codemods/langchain-stream-event-agent-to-model
npm install
npm test
```

## Edge Cases

- **Preserves quote style**: Single quotes (`'agent'`) remain single quotes (`'model'`)
- **Skips non-name contexts**: Comparisons like `event.get("type") == "agent"` are not transformed
- **Skips string assignments**: Plain `agent_type = "agent"` is not transformed
- **Skips logging/print**: `print("The agent is running")` is not transformed

