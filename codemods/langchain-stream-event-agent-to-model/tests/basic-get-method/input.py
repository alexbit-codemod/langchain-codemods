# Basic case: event.get("name") == "agent"
for event in agent.stream(inputs):
    if event.get("name") == "agent":
        handle(event)

