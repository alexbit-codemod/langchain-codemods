from langgraph.prebuilt import create_react_agent, ToolNode

# Should NOT transform - ToolNode has multiple args (likely custom config)
agent = create_react_agent(model="gpt-4o", tools=ToolNode([my_tool], handle_tool_errors=True))

