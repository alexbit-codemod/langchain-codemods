import type { SgRoot, Edit, SgNode } from "codemod:ast-grep";
import type Python from "codemod:ast-grep/langs/python";

/**
 * Updates bind_tools return type from BaseMessage to AIMessage for LangChain v1.
 *
 * Before: def bind_tools(...) -> Runnable[LanguageModelInput, BaseMessage]: ...
 * After:  def bind_tools(...) -> Runnable[LanguageModelInput, AIMessage]: ...
 *
 * Also manages imports:
 * - Adds AIMessage import if missing
 * - Removes BaseMessage import if no longer used
 */
async function transform(root: SgRoot<Python>): Promise<string | null> {
	const rootNode = root.root();
	const edits: Edit[] = [];

	// Track if we made any return type changes
	let madeReturnTypeChanges = false;

	// Find all function definitions named "bind_tools"
	const bindToolsFunctions = rootNode.findAll({
		rule: {
			kind: "function_definition",
			has: {
				field: "name",
				kind: "identifier",
				regex: "^bind_tools$",
			},
		},
	});

	for (const funcNode of bindToolsFunctions) {
		// Find the generic_type with Runnable in the function's return type
		const runnableType = funcNode.find({
			rule: {
				kind: "generic_type",
				has: {
					kind: "identifier",
					regex: "^Runnable$",
				},
			},
		});

		if (!runnableType) {
			continue;
		}

		// Find type_parameter containing the generic arguments
		const typeParam = runnableType.find({
			rule: { kind: "type_parameter" },
		});

		if (!typeParam) {
			continue;
		}

		// Get all type children - we want the second one (output type)
		const typeChildren = typeParam.findAll({
			rule: { kind: "type" },
		});

		if (typeChildren.length < 2) {
			continue;
		}

		const outputType = typeChildren[1];
		if (!outputType) {
			continue;
		}

		// Find BaseMessage identifier in the output type
		const baseMessageNode = outputType.find({
			rule: {
				kind: "identifier",
				regex: "^BaseMessage$",
			},
		});

		if (!baseMessageNode) {
			continue;
		}

		// Replace BaseMessage with AIMessage
		edits.push(baseMessageNode.replace("AIMessage"));
		madeReturnTypeChanges = true;
	}

	if (!madeReturnTypeChanges) {
		return null;
	}

	// Now handle imports
	const hasAIMessageImport = checkHasImport(rootNode, "AIMessage");
	const baseMessageImport = findBaseMessageImport(rootNode);

	// Check if BaseMessage is used elsewhere (besides return types we're changing)
	const baseMessageUsages = rootNode.findAll({
		rule: {
			kind: "identifier",
			regex: "^BaseMessage$",
		},
	});

	// Count usages not in import statements
	const nonImportUsages = baseMessageUsages.filter(
		(node: SgNode<Python>) =>
			!node.inside({
				rule: { kind: "import_from_statement" },
			}),
	);

	// After our edits, bind_tools return types will change
	// Check if there are OTHER usages of BaseMessage
	const bindToolsCount = bindToolsFunctions.length;
	const hasOtherBaseMessageUsages = nonImportUsages.length > bindToolsCount;

	// Handle import modifications
	if (baseMessageImport && !hasOtherBaseMessageUsages && !hasAIMessageImport) {
		// Special case: Replace BaseMessage with AIMessage in the import directly
		edits.push(baseMessageImport.nameNode.replace("AIMessage"));
	} else {
		// Handle AIMessage import
		if (!hasAIMessageImport) {
			const importEdit = createAIMessageImportEdit(
				rootNode,
				baseMessageImport,
			);
			if (importEdit) {
				edits.push(importEdit);
			}
		}

		// Handle BaseMessage import removal if no longer used
		if (baseMessageImport && !hasOtherBaseMessageUsages) {
			const removeEdit = createRemoveBaseMessageImportEdit(
				rootNode,
				baseMessageImport,
			);
			if (removeEdit) {
				edits.push(removeEdit);
			}
		}
	}

	return rootNode.commitEdits(edits);
}

/**
 * Check if a named import exists in the file
 */
function checkHasImport(rootNode: SgNode<Python>, name: string): boolean {
	const imports = rootNode.findAll({
		rule: {
			kind: "import_from_statement",
			has: {
				kind: "dotted_name",
				has: {
					kind: "identifier",
					regex: `^${name}$`,
				},
			},
		},
	});
	return imports.length > 0;
}

/**
 * Find the BaseMessage import statement and the specific import name node
 */
function findBaseMessageImport(
	rootNode: SgNode<Python>,
): { statement: SgNode<Python>; nameNode: SgNode<Python> } | null {
	const importStatements = rootNode.findAll({
		rule: { kind: "import_from_statement" },
	});

	for (const stmt of importStatements) {
		// Find BaseMessage in the imported names (dotted_name with just "BaseMessage")
		const allDottedNames = stmt.findAll({
			rule: { kind: "dotted_name" },
		});

		for (const nameNode of allDottedNames) {
			if (nameNode.text() === "BaseMessage") {
				return { statement: stmt, nameNode };
			}
		}
	}

	return null;
}

/**
 * Create an edit to add AIMessage import
 */
function createAIMessageImportEdit(
	rootNode: SgNode<Python>,
	baseMessageImport: {
		statement: SgNode<Python>;
		nameNode: SgNode<Python>;
	} | null,
): Edit | null {
	// If there's a BaseMessage import, add AIMessage next to it
	if (baseMessageImport) {
		const nameNode = baseMessageImport.nameNode;
		const endPos = nameNode.range().end.index;
		return {
			startPos: endPos,
			endPos: endPos,
			insertedText: ", AIMessage",
		};
	}

	// Find an existing langchain_core.messages import to extend
	const messageImports = rootNode.findAll({
		rule: { kind: "import_from_statement" },
	});

	for (const stmt of messageImports) {
		const moduleNames = stmt.findAll({
			rule: { kind: "dotted_name" },
		});

		// Find if this is a langchain messages import
		const isMessagesImport = moduleNames.some(
			(n: SgNode<Python>) =>
				n.text().includes("langchain") && n.text().includes("messages"),
		);

		if (isMessagesImport) {
			// Find the last imported name (not the module path)
			const importedNames = moduleNames.filter(
				(n: SgNode<Python>) => !n.text().includes("."),
			);
			const lastName = importedNames[importedNames.length - 1];

			if (lastName) {
				const endPos = lastName.range().end.index;
				return {
					startPos: endPos,
					endPos: endPos,
					insertedText: ", AIMessage",
				};
			}
		}
	}

	// No existing langchain messages import, add new one after last import
	const allImports = rootNode.findAll({
		rule: {
			any: [{ kind: "import_statement" }, { kind: "import_from_statement" }],
		},
	});

	if (allImports.length > 0) {
		const lastImport = allImports[allImports.length - 1];
		if (lastImport) {
			const endPos = lastImport.range().end.index;
			return {
				startPos: endPos,
				endPos: endPos,
				insertedText: "\nfrom langchain_core.messages import AIMessage",
			};
		}
	}

	// No imports at all
	return {
		startPos: 0,
		endPos: 0,
		insertedText: "from langchain_core.messages import AIMessage\n\n",
	};
}

/**
 * Create an edit to remove BaseMessage from import
 */
function createRemoveBaseMessageImportEdit(
	rootNode: SgNode<Python>,
	baseMessageImport: { statement: SgNode<Python>; nameNode: SgNode<Python> },
): Edit | null {
	const stmt = baseMessageImport.statement;
	const nameNode = baseMessageImport.nameNode;

	// Find all imported names in this statement (not the module path)
	const allDottedNames = stmt.findAll({
		rule: { kind: "dotted_name" },
	});

	const importedNames = allDottedNames.filter(
		(n: SgNode<Python>) => !n.text().includes("."),
	);

	if (importedNames.length === 1) {
		// BaseMessage is the only import, remove the entire statement
		const stmtStart = stmt.range().start.index;
		let stmtEnd = stmt.range().end.index;

		// Also remove the newline after
		const source = rootNode.text();
		if (source[stmtEnd] === "\n") {
			stmtEnd++;
		}

		return {
			startPos: stmtStart,
			endPos: stmtEnd,
			insertedText: "",
		};
	}

	// Multiple imports, remove just BaseMessage and its surrounding comma/space
	const nameStart = nameNode.range().start.index;
	const nameEnd = nameNode.range().end.index;
	const source = rootNode.text();

	let startPos = nameStart;
	let endPos = nameEnd;

	// Check for comma after: ", " or ","
	if (source.substring(endPos, endPos + 2) === ", ") {
		endPos += 2;
	} else if (source[endPos] === ",") {
		endPos += 1;
		// Skip whitespace
		while (source[endPos] === " ") {
			endPos++;
		}
	} else if (source.substring(startPos - 2, startPos) === ", ") {
		// Comma before
		startPos -= 2;
	} else if (source[startPos - 1] === ",") {
		startPos -= 1;
	}

	return {
		startPos,
		endPos,
		insertedText: "",
	};
}

export default transform;
