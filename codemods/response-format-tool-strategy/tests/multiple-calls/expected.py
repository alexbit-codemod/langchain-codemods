from some_other_package import something
from langchain.agents.structured_output import ToolStrategy

agent1 = create_agent(model="gpt-4o-mini", tools=tools, response_format=ToolStrategy(OutputSchema1))
agent2 = create_agent(model="gpt-4o", tools=tools2, response_format=ToolStrategy(OutputSchema2))

