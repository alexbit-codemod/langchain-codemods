from langgraph.prebuilt import create_react_agent as agent_factory

agent = agent_factory(model="gpt-4o", tools=tools)
result = agent_factory(model="gpt-3.5", tools=[])

