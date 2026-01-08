import type { Edit, SgNode, SgRoot } from "@codemod.com/jssg-types/main";
import type Python from "codemod:ast-grep/langs/python";

// Modules that should be migrated from langchain to langchain_classic
const LEGACY_MODULES = ["retrievers", "indexes"] as const;

/**
 * Check if this is a `from langchain import hub` statement
 */
function isHubImport(node: SgNode<Python>): boolean {
	const moduleNameNode = node.field("module_name");
	if (!moduleNameNode) return false;

	const moduleText = moduleNameNode.text();
	if (moduleText !== "langchain") return false;

	// Check if one of the imported names is "hub"
	const importedNames = node.fieldChildren("name");
	return importedNames.some((nameNode) => {
		const text = nameNode.text();
		// Handle both `hub` and `hub as something`
		return text === "hub" || text.startsWith("hub ");
	});
}

/**
 * Check if this is a `from langchain.retrievers import X` or `from langchain.indexes import X` statement
 */
function isLegacyModuleImport(node: SgNode<Python>): boolean {
	const moduleNameNode = node.field("module_name");
	if (!moduleNameNode) return false;

	const moduleText = moduleNameNode.text();

	// Check for langchain.retrievers or langchain.indexes (and their submodules)
	for (const legacyModule of LEGACY_MODULES) {
		if (
			moduleText === `langchain.${legacyModule}` ||
			moduleText.startsWith(`langchain.${legacyModule}.`)
		) {
			return true;
		}
	}

	return false;
}

/**
 * Check if the import is already using langchain_classic
 */
function isAlreadyMigrated(node: SgNode<Python>): boolean {
	const moduleNameNode = node.field("module_name");
	if (!moduleNameNode) return false;

	const moduleText = moduleNameNode.text();
	return (
		moduleText.startsWith("langchain_classic.") ||
		moduleText === "langchain_classic"
	);
}

/**
 * Transform the import by replacing `langchain` with `langchain_classic` in the module name
 */
function createImportEdit(node: SgNode<Python>): Edit | null {
	const moduleNameNode = node.field("module_name");
	if (!moduleNameNode) return null;

	const moduleText = moduleNameNode.text();
	const newModuleName = moduleText.replace(/^langchain\./, "langchain_classic.");

	// For hub imports, replace langchain with langchain_classic (no dot after)
	const finalModuleName =
		moduleText === "langchain" ? "langchain_classic" : newModuleName;

	// Replace just the module name part
	return {
		startPos: moduleNameNode.range().start.index,
		endPos: moduleNameNode.range().end.index,
		insertedText: finalModuleName,
	};
}

async function transform(root: SgRoot<Python>): Promise<string | null> {
	const rootNode = root.root();
	const edits: Edit[] = [];

	// Find all import_from_statement nodes
	const importStatements = rootNode.findAll({
		rule: {
			kind: "import_from_statement",
		},
	});

	for (const importNode of importStatements) {
		// Skip already migrated imports
		if (isAlreadyMigrated(importNode)) {
			continue;
		}

		// Check if this is a hub import or a legacy module import
		if (isHubImport(importNode) || isLegacyModuleImport(importNode)) {
			const edit = createImportEdit(importNode);
			if (edit) {
				edits.push(edit);
			}
		}
	}

	if (edits.length === 0) {
		return null;
	}

	return rootNode.commitEdits(edits);
}

export default transform;

