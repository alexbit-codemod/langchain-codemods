import langgraph.prebuilt

agent = langgraph.prebuilt.create_react_agent(model="gpt-4o", tools=[my_tool])

