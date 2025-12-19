from langgraph.prebuilt import create_react_agent, ToolNode

agent = create_react_agent(model="gpt-4o", tools=[check_weather])

other_node = ToolNode([some_other_tool])
