from langchain_core.messages import AIMessage
from langchain_core.runnables import Runnable

class MyChatModel:
    def bind_tools(self, tools) -> Runnable[LanguageModelInput, AIMessage]:
        pass

