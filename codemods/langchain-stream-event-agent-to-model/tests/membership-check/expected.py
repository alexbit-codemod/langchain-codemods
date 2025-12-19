# Membership check with name context
node_names = ["agent", "tool", "chain"]
if event.get("name") in ["model", "tool"]:
    handle_event(event)

# Another pattern with explicit comparison
if "model" == event["name"]:
    do_something()

