from langchain.agents import create_agent

agent = create_agent(model="gpt-4o", tools=tools)

