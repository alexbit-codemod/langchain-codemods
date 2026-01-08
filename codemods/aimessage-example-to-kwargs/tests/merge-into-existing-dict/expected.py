from langchain.messages import AIMessage

msg = AIMessage(content="hi", additional_kwargs={"example": True, "foo": 1})

