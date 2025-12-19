# unwrap-tool-node-in-agent

This codemod transforms `tools=ToolNode(ARG)` to `tools=ARG` in `create_agent` and `create_react_agent` calls for LangGraph v1 migration.

## Summary

In LangGraph v1, `create_agent(...)` and `create_react_agent(...)` no longer accept `ToolNode` instances for the `tools` parameter; they must receive a list of tools directly.

## Detection Criteria

- Find calls to `create_agent(...)` or `create_react_agent(...)`
- Within those calls, find `tools=ToolNode(ARG)` (including qualified `langgraph.prebuilt.ToolNode`)
- Confirm `ToolNode` is used as the value of the `tools` keyword
- Only transform when `ToolNode(...)` wraps a single argument

## Transformation Logic

1. Replace `tools=ToolNode(ARG)` with `tools=ARG`
2. If `ToolNode` becomes unused in imports, remove it from the import list

## Before

```python
from langgraph.prebuilt import create_react_agent, ToolNode

agent = create_react_agent(model="gpt-4o", tools=ToolNode([check_weather, search_web]))
```

## After

```python
from langgraph.prebuilt import create_react_agent

agent = create_react_agent(model="gpt-4o", tools=[check_weather, search_web])
```

## Edge Cases

- **Multiple args/kwargs**: If `ToolNode(...)` has multiple arguments (e.g., `ToolNode([tools], handle_tool_errors=True)`), the transformation is skipped as this likely indicates custom error handling or configuration
- **Qualified names**: Handles both `ToolNode(...)` and `langgraph.prebuilt.ToolNode(...)`
- **Import cleanup**: Only removes `ToolNode` from imports if it's no longer used elsewhere in the file

## Running the Codemod

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run the codemod on a target directory
npx codemod workflow run -w ./workflow.yaml -t /path/to/target
```

