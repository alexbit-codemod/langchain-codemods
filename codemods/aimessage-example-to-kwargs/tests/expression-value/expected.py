from langchain.messages import AIMessage

is_example = some_function()
msg = AIMessage(content="hi", additional_kwargs={"example": is_example})

