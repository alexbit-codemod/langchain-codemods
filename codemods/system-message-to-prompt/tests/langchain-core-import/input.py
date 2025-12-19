from langchain_core.messages import SystemMessage

agent = create_react_agent(
    model="gpt-4o",
    tools=tools,
    prompt=SystemMessage(content="You are a helpful AI"),
)

