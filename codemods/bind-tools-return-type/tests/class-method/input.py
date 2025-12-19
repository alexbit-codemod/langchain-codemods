from langchain_core.messages import BaseMessage
from langchain_core.runnables import Runnable

class MyChatModel:
    def bind_tools(self, tools) -> Runnable[LanguageModelInput, BaseMessage]:
        pass

