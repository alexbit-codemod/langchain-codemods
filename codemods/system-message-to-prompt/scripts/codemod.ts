import type { SgRoot, SgNode, Edit } from "@codemod.com/jssg-types/main";
import type Python from "codemod:ast-grep/langs/python";

/**
 * LangChain Migration: SystemMessage(content=...) to string
 * 
 * Transforms:
 *   prompt=SystemMessage(content="...")  →  system_prompt="..."
 *   system_prompt=SystemMessage(content=X)  →  system_prompt=X
 * 
 * Only transforms when:
 * - The call is to create_agent or create_react_agent
 * - The SystemMessage has a `content=` keyword argument (not positional)
 * - The SystemMessage is imported from langchain.messages or langchain.core.messages
 */

type PythonNode = SgNode<Python>;

interface TransformInfo {
  keywordArg: PythonNode;
  keywordName: PythonNode;
  systemMessageCall: PythonNode;
  contentExpr: PythonNode;
  needsRename: boolean;
}

/**
 * Check if there's a SystemMessage import from langchain modules
 */
function hasLangchainSystemMessageImport(rootNode: PythonNode): boolean {
  const imports = rootNode.findAll({
    rule: {
      kind: "import_from_statement",
    },
  });

  for (const imp of imports) {
    const impText = imp.text();
    if (
      (impText.includes("langchain.messages") ||
        impText.includes("langchain_core.messages") ||
        impText.includes("langchain.core.messages")) &&
      impText.includes("SystemMessage")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Find keyword argument value that is a SystemMessage(content=...) call
 */
function findSystemMessageContentArg(
  callNode: PythonNode
): { contentExpr: PythonNode; systemMessageCall: PythonNode } | null {
  // The callNode is the call to SystemMessage(content=...)
  // Check if it's a call to SystemMessage
  const funcNode = callNode.field("function");
  if (!funcNode) return null;

  const funcText = funcNode.text();
  if (funcText !== "SystemMessage" && !funcText.endsWith(".SystemMessage")) {
    return null;
  }

  // Find the argument_list
  const argList = callNode.field("arguments");
  if (!argList) return null;

  // Look for keyword_argument with name "content"
  const keywordArgs = argList.findAll({
    rule: {
      kind: "keyword_argument",
    },
  });

  for (const kwarg of keywordArgs) {
    const nameNode = kwarg.field("name");
    if (nameNode && nameNode.text() === "content") {
      const valueNode = kwarg.field("value");
      if (valueNode) {
        return {
          contentExpr: valueNode,
          systemMessageCall: callNode,
        };
      }
    }
  }

  return null;
}

/**
 * Find all transformable SystemMessage calls in create_agent/create_react_agent
 */
function findTransformTargets(rootNode: PythonNode): TransformInfo[] {
  const targets: TransformInfo[] = [];

  // Check if SystemMessage is imported from langchain
  if (!hasLangchainSystemMessageImport(rootNode)) {
    return targets;
  }

  // Find all calls to create_agent or create_react_agent
  const agentCalls = rootNode.findAll({
    rule: {
      kind: "call",
      has: {
        field: "function",
        kind: "identifier",
        regex: "^(create_agent|create_react_agent)$",
      },
    },
  });

  for (const agentCall of agentCalls) {
    const argList = agentCall.field("arguments");
    if (!argList) continue;

    // Find keyword arguments named "prompt" or "system_prompt"
    const keywordArgs = argList.findAll({
      rule: {
        kind: "keyword_argument",
      },
    });

    for (const kwarg of keywordArgs) {
      const nameNode = kwarg.field("name");
      if (!nameNode) continue;

      const kwName = nameNode.text();
      if (kwName !== "prompt" && kwName !== "system_prompt") continue;

      const valueNode = kwarg.field("value");
      if (!valueNode || valueNode.kind() !== "call") continue;

      // Check if the value is SystemMessage(content=...)
      const result = findSystemMessageContentArg(valueNode);
      if (!result) continue;

      targets.push({
        keywordArg: kwarg,
        keywordName: nameNode,
        systemMessageCall: result.systemMessageCall,
        contentExpr: result.contentExpr,
        needsRename: kwName === "prompt",
      });
    }
  }

  return targets;
}

/**
 * Check if SystemMessage is used anywhere else (not in our transform targets)
 */
function isSystemMessageUsedElsewhere(
  rootNode: PythonNode,
  transformedCalls: Set<number>
): boolean {
  // Find all references to SystemMessage
  const allSystemMessageRefs = rootNode.findAll({
    rule: {
      kind: "identifier",
      regex: "^SystemMessage$",
    },
  });

  for (const ref of allSystemMessageRefs) {
    // Skip if it's in an import statement
    const inImport = ref.ancestors().some(
      (n) => n.kind() === "import_from_statement"
    );
    if (inImport) continue;

    // Check if this reference is part of a call we transformed
    const parentCall = ref.ancestors().find((n) => n.kind() === "call");
    if (parentCall && transformedCalls.has(parentCall.id())) {
      continue;
    }

    // Found a usage that wasn't transformed
    return true;
  }

  return false;
}

/**
 * Get the import statement containing SystemMessage
 */
function findSystemMessageImport(rootNode: PythonNode): {
  importStmt: PythonNode | null;
  otherImportsExist: boolean;
} {
  const imports = rootNode.findAll({
    rule: {
      kind: "import_from_statement",
    },
  });

  for (const imp of imports) {
    const impText = imp.text();
    if (
      !(
        impText.includes("langchain.messages") ||
        impText.includes("langchain_core.messages") ||
        impText.includes("langchain.core.messages")
      )
    ) {
      continue;
    }

    if (!impText.includes("SystemMessage")) {
      continue;
    }

    // Check for other imports in the same statement
    // Count dotted_name children that are after "import" keyword
    const dottedNames = imp.findAll({
      rule: {
        kind: "dotted_name",
      },
    });

    // First dotted_name is the module, rest are imported names
    // Count imported names that aren't SystemMessage
    let otherImportsCount = 0;
    let foundModule = false;
    
    for (const dn of dottedNames) {
      if (!foundModule) {
        // First one is the module path (langchain.messages etc.)
        foundModule = true;
        continue;
      }
      const name = dn.text();
      if (name !== "SystemMessage") {
        otherImportsCount++;
      }
    }

    return {
      importStmt: imp,
      otherImportsExist: otherImportsCount > 0,
    };
  }

  return {
    importStmt: null,
    otherImportsExist: false,
  };
}

/**
 * Build edit to remove or modify the import
 */
function buildImportEdit(
  importStmt: PythonNode,
  otherImportsExist: boolean,
  rootNode: PythonNode
): Edit | null {
  const importRange = importStmt.range();

  if (!otherImportsExist) {
    // Remove the entire import statement including just the line-ending newline
    const sourceText = rootNode.text();
    let endPos = importRange.end.index;
    
    // Include the newline that ends this line (if present)
    if (endPos < sourceText.length && sourceText[endPos] === '\n') {
      endPos++;
    }
    
    return {
      startPos: importRange.start.index,
      endPos: endPos,
      insertedText: "",
    };
  }

  // Need to remove just SystemMessage from the import list
  const importText = importStmt.text();
  
  // Handle "SystemMessage, " pattern
  let newImportText = importText.replace(/SystemMessage,\s*/, "");
  
  // Handle ", SystemMessage" pattern
  if (newImportText === importText) {
    newImportText = importText.replace(/,\s*SystemMessage/, "");
  }
  
  // If neither pattern matched, just remove SystemMessage (shouldn't happen normally)
  if (newImportText === importText) {
    newImportText = importText.replace(/SystemMessage/, "");
  }

  if (newImportText === importText) {
    // No change was made, shouldn't happen
    return null;
  }

  return {
    startPos: importRange.start.index,
    endPos: importRange.end.index,
    insertedText: newImportText,
  };
}

async function transform(root: SgRoot<Python>): Promise<string | null> {
  const rootNode = root.root();
  const edits: Edit[] = [];

  // Find all transformation targets
  const targets = findTransformTargets(rootNode);

  if (targets.length === 0) {
    return null;
  }

  // Track which SystemMessage calls we transform
  const transformedCallIds = new Set<number>();

  // Build edits for each target
  for (const target of targets) {
    transformedCallIds.add(target.systemMessageCall.id());

    if (target.needsRename) {
      // Replace the entire keyword argument: prompt=SystemMessage(content=X) -> system_prompt=X
      const newText = `system_prompt=${target.contentExpr.text()}`;
      edits.push(target.keywordArg.replace(newText));
    } else {
      // Just replace the value: system_prompt=SystemMessage(content=X) -> system_prompt=X
      edits.push(target.systemMessageCall.replace(target.contentExpr.text()));
    }
  }

  // Check if we should remove the SystemMessage import
  if (!isSystemMessageUsedElsewhere(rootNode, transformedCallIds)) {
    const { importStmt, otherImportsExist } = findSystemMessageImport(rootNode);
    if (importStmt) {
      const importEdit = buildImportEdit(importStmt, otherImportsExist, rootNode);
      if (importEdit) {
        edits.push(importEdit);
      }
    }
  }

  if (edits.length === 0) {
    return null;
  }

  return rootNode.commitEdits(edits);
}

export default transform;
