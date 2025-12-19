from langgraph.prebuilt import create_react_agent

agent = create_react_agent(model="gpt-4o", tools=tools, prompt="You are a helpful assistant")

