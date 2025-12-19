from langchain.agents import create_agent
from other_module import some_function

# Create multiple agents
agent1 = create_agent(model="gpt-4o", tools=tools)
agent2 = create_agent(model="gpt-3.5", tools=[tool1, tool2])

def get_agent():
    return create_agent(model="gpt-4", tools=my_tools)

