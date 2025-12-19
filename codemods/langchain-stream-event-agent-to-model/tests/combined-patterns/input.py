# Multiple patterns in one file
async def process_stream(agent, inputs):
    async for event in agent.astream(inputs):
        # get method pattern
        if event.get("name") == "agent":
            print("Agent event")
        # subscript pattern with !=
        elif event["name"] != "agent":
            print("Not an agent event")
        # Single quote variant
        elif event.get('name') == 'agent':
            print("Single quote agent")

