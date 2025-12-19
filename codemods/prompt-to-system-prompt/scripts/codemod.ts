import type { Edit, SgNode, SgRoot } from "@codemod.com/jssg-types/main";
import type Python from "codemod:ast-grep/langs/python";

/**
 * Renames the `prompt` keyword argument to `system_prompt` in calls to
 * `create_agent()` or `create_react_agent()`.
 *
 * - If both `prompt=` and `system_prompt=` are present, skip transformation (likely user error)
 * - Only transforms if the call target is `create_agent` or `create_react_agent`
 */
async function transform(root: SgRoot<Python>): Promise<string | null> {
  const rootNode = root.root();
  const edits: Edit[] = [];

  // Find all calls to create_agent or create_react_agent
  const calls = rootNode.findAll({
    rule: {
      kind: "call",
      has: {
        field: "function",
        kind: "identifier",
        regex: "^(create_agent|create_react_agent)$",
      },
    },
  });

  for (const call of calls) {
    // Optionally verify using semantic analysis that this is the correct function
    const funcNode = call.field("function");
    if (!funcNode) continue;

    // Use semantic analysis to verify this is from the expected module
    const def = funcNode.definition();
    if (def) {
      // If we can resolve the definition, verify it's from the right package
      // If it's 'import' kind, check that it comes from langchain.agents or langgraph.prebuilt
      if (def.kind === "import" || def.kind === "external") {
        // Get the import statement to verify the module
        const importStmt = def.node.ancestors().find((a) => a.kind() === "import_from_statement");
        if (importStmt) {
          const moduleName = importStmt.field("module_name");
          if (moduleName) {
            const moduleText = moduleName.text();
            // Only transform if it's from the expected modules
            if (!moduleText.match(/^(langchain\.agents|langgraph\.prebuilt)$/)) {
              continue;
            }
          }
        }
      }
    }

    // Get the argument_list
    const argList = call.field("arguments");
    if (!argList || argList.kind() !== "argument_list") continue;

    // Find all keyword arguments
    const keywordArgs = argList.findAll({
      rule: { kind: "keyword_argument" },
    });

    // Check for existing prompt= and system_prompt= arguments
    let promptArg: SgNode<Python> | null = null;
    let hasSystemPrompt = false;

    for (const kwArg of keywordArgs) {
      const nameNode = kwArg.field("name");
      if (!nameNode) continue;

      const argName = nameNode.text();
      if (argName === "prompt") {
        promptArg = kwArg;
      } else if (argName === "system_prompt") {
        hasSystemPrompt = true;
      }
    }

    // If both prompt= and system_prompt= are present, skip (user error)
    if (promptArg && hasSystemPrompt) {
      console.warn(
        `Warning: Both 'prompt=' and 'system_prompt=' found in call at ${root.filename()}. Skipping transformation.`
      );
      continue;
    }

    // If prompt= exists and system_prompt= doesn't, rename prompt to system_prompt
    if (promptArg && !hasSystemPrompt) {
      const nameNode = promptArg.field("name");
      if (nameNode) {
        edits.push(nameNode.replace("system_prompt"));
      }
    }
  }

  if (edits.length === 0) {
    return null;
  }

  return rootNode.commitEdits(edits);
}

export default transform;

