from langchain.messages import HumanMessage

agent = create_agent(
    model="gpt-4o",
    tools=tools,
    system_prompt="You are a helpful assistant",
)

human = HumanMessage(content="Hello")
