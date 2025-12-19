from langchain.agents import create_agent as make_agent

agent = make_agent(model="gpt-4o", tools=tools, prompt="You are a helpful assistant")

