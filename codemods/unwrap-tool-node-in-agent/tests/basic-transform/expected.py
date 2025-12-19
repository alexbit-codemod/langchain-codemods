from langgraph.prebuilt import create_react_agent

agent = create_react_agent(model="gpt-4o", tools=[check_weather, search_web])

