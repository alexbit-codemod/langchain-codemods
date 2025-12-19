import type { SgRoot, SgNode, Edit } from "@codemod.com/jssg-types/main";
import type Python from "codemod:ast-grep/langs/python";

const TOOL_STRATEGY_IMPORT = "from langchain.agents.structured_output import ToolStrategy";

/**
 * Check if the file already has the ToolStrategy import
 */
function hasToolStrategyImport(rootNode: SgNode<Python>): boolean {
	// Look for import_from_statement with the correct module path
	const imports = rootNode.findAll({
		rule: {
			kind: "import_from_statement",
		},
	});

	for (const importNode of imports) {
		const text = importNode.text();
		// Check if this import brings in ToolStrategy from the right module
		if (
			text.includes("langchain.agents.structured_output") &&
			text.includes("ToolStrategy")
		) {
			return true;
		}
	}

	return false;
}

/**
 * Find the position to insert the import statement
 * Returns the end position of the last import, or 0 if no imports exist
 */
function findImportInsertPosition(rootNode: SgNode<Python>): number {
	const imports = rootNode.findAll({
		rule: {
			any: [
				{ kind: "import_statement" },
				{ kind: "import_from_statement" },
			],
		},
	});

	if (imports.length === 0) {
		return 0;
	}

	// Find the last import and return its end position
	let lastImportEnd = 0;
	for (const imp of imports) {
		const endPos = imp.range().end.index;
		if (endPos > lastImportEnd) {
			lastImportEnd = endPos;
		}
	}

	return lastImportEnd;
}

/**
 * Check if a call expression is ToolStrategy(...) or ProviderStrategy(...)
 */
function isAlreadyWrapped(node: SgNode<Python>): boolean {
	if (!node.is("call")) {
		return false;
	}

	const funcNode = node.field("function");
	if (!funcNode) {
		return false;
	}

	const funcText = funcNode.text();
	return funcText === "ToolStrategy" || funcText === "ProviderStrategy";
}

/**
 * Check if the value is a tuple (prompted output form that should be skipped)
 */
function isTupleForm(node: SgNode<Python>): boolean {
	return node.is("tuple");
}

async function transform(root: SgRoot<Python>): Promise<string | null> {
	const rootNode = root.root();
	const edits: Edit[] = [];
	let needsImport = false;

	// Find all calls to create_agent with response_format argument
	const createAgentCalls = rootNode.findAll({
		rule: {
			kind: "call",
			has: {
				field: "function",
				kind: "identifier",
				regex: "^create_agent$",
			},
		},
	});

	for (const callNode of createAgentCalls) {
		const argsNode = callNode.field("arguments");
		if (!argsNode) {
			continue;
		}

		// Find keyword_argument with name="response_format"
		const responseFormatArg = argsNode.find({
			rule: {
				kind: "keyword_argument",
				has: {
					field: "name",
					kind: "identifier",
					regex: "^response_format$",
				},
			},
		});

		if (!responseFormatArg) {
			continue;
		}

		// Get the value of response_format
		const valueNode = responseFormatArg.field("value");
		if (!valueNode) {
			continue;
		}

		// Skip if it's a tuple form (prompt, schema)
		if (isTupleForm(valueNode)) {
			console.warn(
				`Warning: Tuple form response_format=(prompt, schema) found at ${root.filename()}. ` +
				`This requires manual migration as prompted output has been removed.`
			);
			continue;
		}

		// Skip if already wrapped with ToolStrategy or ProviderStrategy
		if (isAlreadyWrapped(valueNode)) {
			continue;
		}

		// Transform: wrap the value with ToolStrategy(...)
		const valueText = valueNode.text();
		const newValue = `ToolStrategy(${valueText})`;

		edits.push(valueNode.replace(newValue));
		needsImport = true;
	}

	if (edits.length === 0) {
		return null;
	}

	// Add import if needed
	if (needsImport && !hasToolStrategyImport(rootNode)) {
		const insertPos = findImportInsertPosition(rootNode);

		if (insertPos === 0) {
			// No existing imports, insert at the beginning
			edits.push({
				startPos: 0,
				endPos: 0,
				insertedText: TOOL_STRATEGY_IMPORT + "\n\n",
			});
		} else {
			// Insert after the last import
			edits.push({
				startPos: insertPos,
				endPos: insertPos,
				insertedText: "\n" + TOOL_STRATEGY_IMPORT,
			});
		}
	}

	return rootNode.commitEdits(edits);
}

export default transform;

