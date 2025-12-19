from langchain.agents import create_agent
from langgraph.prebuilt import create_react_agent

agent1 = create_agent(model="gpt-4o", tools=tools, system_prompt="You are assistant 1")
agent2 = create_react_agent(model="gpt-4o", tools=tools, system_prompt="You are assistant 2")
agent3 = create_agent(system_prompt="Short prompt", tools=[])

