import type { Edit, SgNode, SgRoot } from "codemod:ast-grep";
import type Python from "codemod:ast-grep/langs/python";

/**
 * LangChain streaming events renamed the node name from "agent" to "model".
 * This codemod transforms string literals "agent" to "model" when used in
 * streaming event context:
 * 
 * 1. event.get("name") == "agent" -> event.get("name") == "model"
 * 2. event["name"] == "agent" -> event["name"] == "model"
 * 3. Similar patterns with != or in membership checks
 */

/**
 * Check if a string node contains the text "agent" (just the content, not quotes)
 */
function isAgentString(node: SgNode<Python>): boolean {
	// Find the string_content child which has the actual text
	const content = node.find({ rule: { kind: "string_content" } });
	return content?.text() === "agent";
}

/**
 * Check if a string node contains the text "name" (just the content, not quotes)
 */
function isNameString(node: SgNode<Python>): boolean {
	const content = node.find({ rule: { kind: "string_content" } });
	return content?.text() === "name";
}

/**
 * Find the "agent" string in a comparison and return it for replacement.
 * Returns null if not in a relevant streaming event context.
 */
function findAgentStringInComparison(comparison: SgNode<Python>): SgNode<Python> | null {
	// Get all string children of the comparison
	const strings = comparison.findAll({ rule: { kind: "string" } });
	
	// Look for pattern: something involving "name" compared to "agent"
	let hasNameContext = false;
	let agentStringNode: SgNode<Python> | null = null;

	for (const str of strings) {
		if (isNameString(str)) {
			hasNameContext = true;
		}
		if (isAgentString(str)) {
			agentStringNode = str;
		}
	}

	// Only return the agent string if we have "name" context
	if (hasNameContext && agentStringNode) {
		return agentStringNode;
	}

	// Also check for subscript access like event["name"] or call like event.get("name")
	// Look for a subscript or call that accesses "name"
	const subscripts = comparison.findAll({ rule: { kind: "subscript" } });
	for (const sub of subscripts) {
		// Check if the subscript key is "name"
		const subscriptStrings = sub.findAll({ rule: { kind: "string" } });
		for (const str of subscriptStrings) {
			if (isNameString(str)) {
				hasNameContext = true;
				break;
			}
		}
	}

	const calls = comparison.findAll({ rule: { kind: "call" } });
	for (const call of calls) {
		// Check for .get("name") pattern
		const attr = call.field("function");
		if (attr?.is("attribute")) {
			const methodName = attr.field("attribute");
			if (methodName?.text() === "get") {
				// Check if argument is "name"
				const args = call.field("arguments");
				if (args) {
					const argStrings = args.findAll({ rule: { kind: "string" } });
					for (const str of argStrings) {
						if (isNameString(str)) {
							hasNameContext = true;
							break;
						}
					}
				}
			}
		}
	}

	if (hasNameContext && agentStringNode) {
		return agentStringNode;
	}

	return null;
}

/**
 * Replace the "agent" string literal with "model", preserving quote style
 */
function createReplacement(agentNode: SgNode<Python>): Edit {
	const text = agentNode.text();
	// Preserve the quote style (single, double, or triple quotes)
	const newText = text.replace(/agent/g, "model");
	return agentNode.replace(newText);
}

async function transform(root: SgRoot<Python>): Promise<string | null> {
	const rootNode = root.root();
	const edits: Edit[] = [];
	const processedNodeIds = new Set<number>();

	// Find all comparison_operator nodes (handles ==, !=, in, not in)
	const comparisons = rootNode.findAll({
		rule: { kind: "comparison_operator" }
	});

	for (const comparison of comparisons) {
		const agentString = findAgentStringInComparison(comparison);
		if (agentString && !processedNodeIds.has(agentString.id())) {
			processedNodeIds.add(agentString.id());
			edits.push(createReplacement(agentString));
		}
	}

	if (edits.length === 0) {
		return null;
	}

	return rootNode.commitEdits(edits);
}

export default transform;

