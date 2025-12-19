# Subscript access: event["name"] == "agent"
for event in agent.stream(inputs):
    if event["name"] == "model":
        process_agent_event(event)

