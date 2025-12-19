from langgraph.prebuilt import create_react_agent, ToolNode

agent = create_react_agent(model="gpt-4o", tools=ToolNode([check_weather, search_web]))

