from langchain.messages import AIMessage

msg1 = AIMessage(content="first", additional_kwargs={"example": True})
msg2 = AIMessage(content="second", additional_kwargs={"example": False})

