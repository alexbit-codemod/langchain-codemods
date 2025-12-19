import type { Edit, SgNode, SgRoot } from "@codemod.com/jssg-types/main";
import type Python from "codemod:ast-grep/langs/python";

const OLD_MODULE = "langgraph.prebuilt";
const OLD_FUNCTION = "create_react_agent";
const NEW_MODULE = "langchain.agents";
const NEW_FUNCTION = "create_agent";

/**
 * Migrates from langgraph.prebuilt.create_react_agent to langchain.agents.create_agent.
 * - Replaces import statements
 * - Renames all call sites
 * - Handles aliased imports
 */
async function transform(root: SgRoot<Python>): Promise<string | null> {
  const rootNode = root.root();
  const edits: Edit[] = [];

  // Find all import_from_statement nodes that import from langgraph.prebuilt
  const importStatements = rootNode.findAll({
    rule: {
      kind: "import_from_statement",
      has: {
        field: "module_name",
        kind: "dotted_name",
        regex: `^${OLD_MODULE.replace(".", "\\.")}$`,
      },
    },
  });

  // Track the names that need to be renamed in call sites
  // Key: the name used in code (original or alias), Value: info about the import
  const namesToRename: Map<string, { isAlias: boolean }> = new Map();

  for (const importStmt of importStatements) {
    // Check for direct imports: from langgraph.prebuilt import create_react_agent
    const directImport = importStmt.find({
      rule: {
        kind: "dotted_name",
        inside: {
          kind: "import_from_statement",
          stopBy: "neighbor",
        },
        regex: `^${OLD_FUNCTION}$`,
      },
    });

    if (directImport) {
      namesToRename.set(OLD_FUNCTION, { isAlias: false });

      // Build the new import statement
      const newImport = `from ${NEW_MODULE} import ${NEW_FUNCTION}`;
      edits.push({
        startPos: importStmt.range().start.index,
        endPos: importStmt.range().end.index,
        insertedText: newImport,
      });
      continue;
    }

    // Check for aliased imports: from langgraph.prebuilt import create_react_agent as alias
    const aliasedImport = importStmt.find({
      rule: {
        kind: "aliased_import",
        has: {
          kind: "dotted_name",
          regex: `^${OLD_FUNCTION}$`,
        },
      },
    });

    if (aliasedImport) {
      // Get the alias name (second identifier child in aliased_import)
      const aliasNode = aliasedImport.field("alias");
      if (aliasNode) {
        const aliasName = aliasNode.text();
        namesToRename.set(aliasName, { isAlias: true });

        // Keep the alias but update the import source and original function name
        const newImport = `from ${NEW_MODULE} import ${NEW_FUNCTION} as ${aliasName}`;
        edits.push({
          startPos: importStmt.range().start.index,
          endPos: importStmt.range().end.index,
          insertedText: newImport,
        });
      }
    }
  }

  // If no relevant imports found, skip this file
  if (namesToRename.size === 0) {
    return null;
  }

  // Find and rename all call sites for each tracked name
  for (const [nameToFind, info] of namesToRename) {
    const calls = rootNode.findAll({
      rule: {
        kind: "call",
        has: {
          field: "function",
          kind: "identifier",
          regex: `^${nameToFind}$`,
        },
      },
    });

    for (const call of calls) {
      const funcNode = call.field("function");
      if (funcNode) {
        // If it was aliased, keep the alias; otherwise rename to new function
        const newName = info.isAlias ? nameToFind : NEW_FUNCTION;
        if (funcNode.text() !== newName) {
          edits.push(funcNode.replace(newName));
        }
      }
    }
  }

  if (edits.length === 0) {
    return null;
  }

  return rootNode.commitEdits(edits);
}

export default transform;

