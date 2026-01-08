import type { Edit, SgNode, SgRoot } from "codemod:ast-grep";
import type Python from "codemod:ast-grep/langs/python";

/**
 * Codemod: unwrap-tool-node-in-agent
 *
 * Transforms `tools=ToolNode(ARG)` to `tools=ARG` in create_agent/create_react_agent calls.
 *
 * Detection criteria:
 * - Find calls to create_agent(...) or create_react_agent(...)
 * - Within those calls, find tools=ToolNode(ARG) (including qualified langgraph.prebuilt.ToolNode)
 * - Only transform when ToolNode wraps a single argument
 *
 * Transformation:
 * 1. Replace tools=ToolNode(ARG) with tools=ARG
 * 2. If ToolNode becomes unused in imports, remove it from the import list
 */

/**
 * Check if a call node is calling ToolNode (either direct identifier or qualified attribute)
 */
function isToolNodeCall(callNode: SgNode<Python>): boolean {
	const func = callNode.field("function");
	if (!func) return false;

	// Direct identifier: ToolNode(...)
	if (func.is("identifier") && func.text() === "ToolNode") {
		return true;
	}

	// Qualified attribute: langgraph.prebuilt.ToolNode(...)
	if (func.is("attribute")) {
		const attrName = func.field("attribute");
		if (attrName && attrName.text() === "ToolNode") {
			return true;
		}
	}

	return false;
}

/**
 * Check if a call node is calling create_agent or create_react_agent
 */
function isAgentCreationCall(callNode: SgNode<Python>): boolean {
	const func = callNode.field("function");
	if (!func) return false;

	const targetFunctions = ["create_agent", "create_react_agent"];

	// Direct identifier
	if (func.is("identifier") && targetFunctions.includes(func.text())) {
		return true;
	}

	// Qualified attribute: module.create_agent(...)
	if (func.is("attribute")) {
		const attrName = func.field("attribute");
		if (attrName && targetFunctions.includes(attrName.text())) {
			return true;
		}
	}

	return false;
}

/**
 * Check if ToolNode call has exactly one positional argument (no kwargs)
 */
function hasSingleArgument(toolNodeCall: SgNode<Python>): boolean {
	const argList = toolNodeCall.field("arguments");
	if (!argList) return false;

	// Get all children that are actual arguments (not punctuation)
	const args = argList.children().filter((child) => {
		const kind = child.kind();
		// Filter out punctuation tokens
		return kind !== "(" && kind !== ")" && kind !== ",";
	});

	// Should have exactly 1 argument, and it should NOT be a keyword_argument
	if (args.length !== 1) return false;

	const singleArg = args[0];
	// Skip if it's a keyword argument (like handle_tool_errors=True)
	if (singleArg?.is("keyword_argument")) return false;

	return true;
}

/**
 * Get the single argument from a ToolNode call
 */
function getSingleArgument(toolNodeCall: SgNode<Python>): SgNode<Python> | null {
	const argList = toolNodeCall.field("arguments");
	if (!argList) return null;

	const args = argList.children().filter((child) => {
		const kind = child.kind();
		return kind !== "(" && kind !== ")" && kind !== ",";
	});

	return args.length === 1 ? args[0] ?? null : null;
}

/**
 * Find keyword argument with name "tools" that has ToolNode as its value
 */
function findToolsArgWithToolNode(
	agentCall: SgNode<Python>,
): { kwArg: SgNode<Python>; toolNodeCall: SgNode<Python> } | null {
	const argList = agentCall.field("arguments");
	if (!argList) return null;

	// Find keyword_argument with name="tools"
	const toolsKwArgs = argList.findAll({
		rule: {
			kind: "keyword_argument",
			has: {
				field: "name",
				kind: "identifier",
				regex: "^tools$",
			},
		},
	});

	for (const kwArg of toolsKwArgs) {
		// Get the value field of the keyword argument
		const value = kwArg.field("value");
		if (!value || !value.is("call")) continue;

		// Check if the call is to ToolNode
		if (isToolNodeCall(value) && hasSingleArgument(value)) {
			return { kwArg, toolNodeCall: value };
		}
	}

	return null;
}

/**
 * Find all ToolNode usages in the file (to determine if import can be removed)
 */
function countToolNodeUsages(rootNode: SgNode<Python>): number {
	// Find all call expressions where function is ToolNode
	const directCalls = rootNode.findAll({
		rule: {
			kind: "call",
			has: {
				field: "function",
				kind: "identifier",
				regex: "^ToolNode$",
			},
		},
	});

	return directCalls.length;
}

/**
 * Find and create edit to remove ToolNode from imports if unused
 */
function createImportRemovalEdit(
	rootNode: SgNode<Python>,
	remainingToolNodeUsages: number,
): Edit | null {
	if (remainingToolNodeUsages > 0) {
		return null;
	}

	// Find import statements that import ToolNode
	const imports = rootNode.findAll({
		rule: {
			kind: "import_from_statement",
		},
	});

	for (const importStmt of imports) {
		const importText = importStmt.text();

		// Check if this import includes ToolNode
		if (!importText.includes("ToolNode")) continue;

		// Find the dotted_name nodes that are imported names (not module name)
		const importedNames = importStmt.findAll({
			rule: {
				kind: "dotted_name",
				has: {
					kind: "identifier",
					regex: "^ToolNode$",
				},
			},
		});

		// Find the ToolNode identifier specifically
		for (const nameNode of importedNames) {
			// Make sure this is an imported name, not part of the module path
			// by checking it's not the module_name field
			const moduleNameNode = importStmt.find({
				rule: {
					kind: "dotted_name",
					inside: {
						kind: "import_from_statement",
						field: "module_name",
					},
				},
			});

			// Skip if this is the module name
			if (moduleNameNode && moduleNameNode.id() === nameNode.id()) {
				continue;
			}

			// Count all imported names in this statement
			const allImportedNames: SgNode<Python>[] = [];
			const children = importStmt.children();
			let foundImportKeyword = false;

			for (const child of children) {
				if (child.kind() === "import") {
					foundImportKeyword = true;
					continue;
				}
				if (foundImportKeyword && child.kind() === "dotted_name") {
					allImportedNames.push(child);
				}
			}

			if (allImportedNames.length === 1) {
				// Only ToolNode is imported - remove entire import statement
				const startPos = importStmt.range().start.index;
				let endPos = importStmt.range().end.index;

				// Include exactly one newline after the import (if present)
				// to avoid leaving blank lines, but preserve remaining structure
				const fullText = rootNode.text();
				if (endPos < fullText.length && fullText[endPos] === "\n") {
					endPos++;
					// If there's a second newline (blank line), consume it too
					// but only if there was already a blank line there
					if (endPos < fullText.length && fullText[endPos] === "\n") {
						endPos++;
					}
				}

				return {
					startPos,
					endPos,
					insertedText: "",
				};
			} else {
				// Multiple imports - remove just ToolNode and associated comma
				const toolNodeIdentifier = nameNode.find({
					rule: {
						kind: "identifier",
						regex: "^ToolNode$",
					},
				});

				if (!toolNodeIdentifier) continue;

				// Find the range of "ToolNode" including surrounding comma and space
				const fullText = rootNode.text();
				let startPos = nameNode.range().start.index;
				let endPos = nameNode.range().end.index;

				// Check for comma before (", ToolNode")
				let lookBehind = startPos - 1;
				while (lookBehind >= 0 && fullText[lookBehind] === " ") {
					lookBehind--;
				}
				if (lookBehind >= 0 && fullText[lookBehind] === ",") {
					startPos = lookBehind;
				} else {
					// Check for comma after ("ToolNode, ")
					let lookAhead = endPos;
					while (lookAhead < fullText.length && fullText[lookAhead] === " ") {
						lookAhead++;
					}
					if (lookAhead < fullText.length && fullText[lookAhead] === ",") {
						endPos = lookAhead + 1;
						// Also consume trailing space
						while (endPos < fullText.length && fullText[endPos] === " ") {
							endPos++;
						}
					}
				}

				return {
					startPos,
					endPos,
					insertedText: "",
				};
			}
		}
	}

	return null;
}

async function transform(root: SgRoot<Python>): Promise<string | null> {
	const rootNode = root.root();
	const edits: Edit[] = [];

	// Track how many ToolNode usages we transform (to know if import can be removed)
	let transformedToolNodeCount = 0;

	// Find all agent creation calls
	const agentCalls = rootNode.findAll({
		rule: {
			kind: "call",
		},
	});

	for (const call of agentCalls) {
		if (!isAgentCreationCall(call)) continue;

		const match = findToolsArgWithToolNode(call);
		if (!match) continue;

		const { toolNodeCall } = match;
		const innerArg = getSingleArgument(toolNodeCall);

		if (!innerArg) continue;

		// Replace ToolNode(ARG) with just ARG
		edits.push(toolNodeCall.replace(innerArg.text()));
		transformedToolNodeCount++;
	}

	if (edits.length === 0) {
		return null;
	}

	// Calculate remaining ToolNode usages after transformation
	const totalToolNodeUsages = countToolNodeUsages(rootNode);
	const remainingUsages = totalToolNodeUsages - transformedToolNodeCount;

	// Try to create import removal edit
	const importEdit = createImportRemovalEdit(rootNode, remainingUsages);
	if (importEdit) {
		edits.push(importEdit);
	}

	return rootNode.commitEdits(edits);
}

export default transform;

