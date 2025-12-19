from langchain.messages import AIMessage

kwargs = {"foo": 1}
msg = AIMessage(content="hi", additional_kwargs={**kwargs, "example": True})

