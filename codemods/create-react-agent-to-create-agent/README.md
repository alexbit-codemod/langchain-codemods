# create-react-agent-to-create-agent

Migrates from `langgraph.prebuilt.create_react_agent` to `langchain.agents.create_agent`.

## What it does

This codemod automatically updates your Python code to use the new `create_agent` function from `langchain.agents` instead of the deprecated `create_react_agent` from `langgraph.prebuilt`.

### Transformations

- **Import statements** — Updates the import source and function name
- **Call sites** — Renames all usages of the function throughout your code
- **Aliased imports** — Preserves your aliases while updating the underlying import

## Examples

### Basic import

```diff
- from langgraph.prebuilt import create_react_agent
+ from langchain.agents import create_agent

- agent = create_react_agent(model="gpt-4o", tools=tools)
+ agent = create_agent(model="gpt-4o", tools=tools)
```

### Aliased import

If you use an alias, the codemod preserves it:

```diff
- from langgraph.prebuilt import create_react_agent as agent_factory
+ from langchain.agents import create_agent as agent_factory

  agent = agent_factory(model="gpt-4o", tools=tools)
```

### Multiple call sites

All usages are updated automatically:

```diff
- from langgraph.prebuilt import create_react_agent
+ from langchain.agents import create_agent

- agent1 = create_react_agent(model="gpt-4o", tools=tools)
- agent2 = create_react_agent(model="gpt-3.5", tools=[tool1, tool2])
+ agent1 = create_agent(model="gpt-4o", tools=tools)
+ agent2 = create_agent(model="gpt-3.5", tools=[tool1, tool2])

  def get_agent():
-     return create_react_agent(model="gpt-4", tools=my_tools)
+     return create_agent(model="gpt-4", tools=my_tools)
```

## Usage

Run this codemod using the [Codemod CLI](https://docs.codemod.com/):

```bash
npx codemod langchain/create-react-agent-to-create-agent
```

Or target a specific directory:

```bash
npx codemod langchain/create-react-agent-to-create-agent --target ./src
```

## Skipped files

The codemod will skip files that:

- Don't import `create_react_agent` from `langgraph.prebuilt`
- Import a different `create_react_agent` from another module
- Contain unrelated code

