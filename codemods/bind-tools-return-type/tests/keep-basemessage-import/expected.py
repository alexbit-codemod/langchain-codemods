from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.runnables import Runnable

def bind_tools(self, tools) -> Runnable[LanguageModelInput, AIMessage]:
    pass

def other_function() -> BaseMessage:
    # BaseMessage is still used here
    pass

