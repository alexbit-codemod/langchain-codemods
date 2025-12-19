# Membership check with name context
node_names = ["agent", "tool", "chain"]
if event.get("name") in ["agent", "tool"]:
    handle_event(event)

# Another pattern with explicit comparison
if "agent" == event["name"]:
    do_something()

