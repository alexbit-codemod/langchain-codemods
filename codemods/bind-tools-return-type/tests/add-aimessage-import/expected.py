from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import Runnable

def bind_tools(self, tools) -> Runnable[LanguageModelInput, AIMessage]:
    msg = HumanMessage(content="hello")
    pass

