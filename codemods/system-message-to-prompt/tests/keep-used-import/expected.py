from langchain.messages import SystemMessage, HumanMessage

# SystemMessage used in agent call (should transform)
agent = create_agent(
    model="gpt-4o",
    tools=tools,
    system_prompt="You are a helpful assistant",
)

# SystemMessage also used elsewhere (import should remain)
other_message = SystemMessage(content="Other usage")
human = HumanMessage(content="Hello")
