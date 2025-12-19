from langchain_core.messages import BaseMessage
from langchain_core.runnables import Runnable

def other_function(self, tools) -> Runnable[LanguageModelInput, BaseMessage]:
    # This is NOT bind_tools, should not be transformed
    pass

