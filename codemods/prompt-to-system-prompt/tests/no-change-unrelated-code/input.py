from mylib import create_agent

# This should NOT be transformed - different module
agent = create_agent(model="gpt-4o", tools=tools, prompt="You are a helpful assistant")

# Other unrelated function call
result = some_function(prompt="hello")

