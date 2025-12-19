from langchain.messages import AIMessage

is_example = some_function()
msg = AIMessage(content="hi", example=is_example)

