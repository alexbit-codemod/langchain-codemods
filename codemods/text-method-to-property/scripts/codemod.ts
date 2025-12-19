import type { SgRoot, Edit, SgNode } from "codemod:ast-grep";
import type Python from "codemod:ast-grep/langs/python";

/**
 * Transforms deprecated `.text()` method calls to property access `.text`
 *
 * Before: response.text()
 * After:  response.text
 *
 * Skips calls with arguments: obj.text("arg") remains unchanged
 */
async function transform(root: SgRoot<Python>): Promise<string | null> {
	const rootNode = root.root();
	const edits: Edit[] = [];

	// Find all call expressions where:
	// 1. The function being called is an attribute access (e.g., response.text)
	// 2. The attribute name is "text"
	// 3. The argument list is empty
	const textMethodCalls = rootNode.findAll({
		rule: {
			kind: "call",
			has: {
				field: "function",
				kind: "attribute",
				has: {
					field: "attribute",
					kind: "identifier",
					regex: "^text$",
				},
			},
		},
	});

	for (const callNode of textMethodCalls) {
		// Get the argument list to check if it's empty
		const argsNode = callNode.field("arguments");
		if (!argsNode) {
			continue;
		}

		// Check if argument list has any actual arguments (children besides parentheses)
		// An empty argument_list only contains `(` and `)` with no other named children
		const args = argsNode
			.children()
			.filter((child: SgNode<Python>) => child.isNamed());
		if (args.length > 0) {
			// Has arguments, skip this call
			continue;
		}

		// Get the attribute node (e.g., `response.text`)
		const attrNode = callNode.field("function");
		if (!attrNode) {
			continue;
		}

		// Replace the entire call `response.text()` with just the attribute `response.text`
		edits.push(callNode.replace(attrNode.text()));
	}

	if (edits.length === 0) {
		return null;
	}

	return rootNode.commitEdits(edits);
}

export default transform;

