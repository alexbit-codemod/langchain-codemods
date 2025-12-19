from langchain.messages import SystemMessage

SYSTEM_PROMPT = "You are a helpful assistant"

agent = create_react_agent(
    model="gpt-4o",
    tools=tools,
    system_prompt=SystemMessage(content=SYSTEM_PROMPT),
)
