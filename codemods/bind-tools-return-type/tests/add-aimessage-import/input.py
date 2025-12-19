from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.runnables import Runnable

def bind_tools(self, tools) -> Runnable[LanguageModelInput, BaseMessage]:
    msg = HumanMessage(content="hello")
    pass

