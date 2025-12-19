from langchain.messages import SystemMessage

agent = create_agent(
    model="gpt-4o",
    tools=tools,
    system_prompt=SystemMessage(content="You are a helpful assistant"),
)
