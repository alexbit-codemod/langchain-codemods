from langchain_core.messages import BaseMessage
from langchain_core.runnables import Runnable

def bind_tools(self, tools) -> Runnable[LanguageModelInput, BaseMessage]:
    pass

def other_function() -> BaseMessage:
    # BaseMessage is still used here
    pass

