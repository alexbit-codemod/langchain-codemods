from langchain.agents import create_agent

# This should be skipped - user has both prompt and system_prompt (likely an error)
agent = create_agent(model="gpt-4o", tools=tools, prompt="old prompt", system_prompt="new prompt")

