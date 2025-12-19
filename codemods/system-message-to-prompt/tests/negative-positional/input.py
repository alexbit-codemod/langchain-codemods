from langchain.messages import SystemMessage

# Should NOT transform - positional argument, not content=
agent = create_agent(
    model="gpt-4o",
    tools=tools,
    prompt=SystemMessage("You are a helpful assistant"),
)
