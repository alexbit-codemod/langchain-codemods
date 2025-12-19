from langchain.agents import create_agent
from langgraph.prebuilt import ToolNode

agent = create_agent(model="gpt-4o", tools=ToolNode([my_tool]))

