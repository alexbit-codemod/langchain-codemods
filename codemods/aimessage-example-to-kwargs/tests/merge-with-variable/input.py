from langchain.messages import AIMessage

kwargs = {"foo": 1}
msg = AIMessage(content="hi", example=True, additional_kwargs=kwargs)

