from langgraph.prebuilt import create_react_agent, ToolNode

my_tools = [check_weather, search_web]
agent = create_react_agent(model="gpt-4o", tools=ToolNode(my_tools))

