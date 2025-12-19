# These should NOT be transformed

# Plain agent string without name context
agent_type = "agent"
print("The agent is running")

# Using agent in a different context (not event name filtering)
config = {"type": "agent", "version": 1}

# Agent as variable name (not string)
agent = create_agent()

# Different field comparison (not "name")
if event.get("type") == "agent":
    pass

# Log message containing agent
logger.info("Processing agent request")

