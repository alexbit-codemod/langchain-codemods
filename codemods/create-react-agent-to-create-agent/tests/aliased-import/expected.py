from langchain.agents import create_agent as agent_factory

agent = agent_factory(model="gpt-4o", tools=tools)
result = agent_factory(model="gpt-3.5", tools=[])

