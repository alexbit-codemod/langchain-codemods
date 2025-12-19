from langchain.agents.structured_output import ToolStrategy

agent = create_agent(model="gpt-4o-mini", tools=tools, response_format=ToolStrategy(OutputSchema))

