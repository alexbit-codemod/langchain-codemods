from langchain_core.messages import AIMessage
from langchain_core.runnables import Runnable

def bind_tools(self, tools) -> Runnable[LanguageModelInput, AIMessage]:
    pass

