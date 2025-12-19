import type { SgRoot, SgNode, Edit } from "codemod:ast-grep";
import type Python from "codemod:ast-grep/langs/python";

/**
 * Codemod: aimessage-example-to-kwargs
 *
 * Transforms AIMessage calls that use the deprecated `example` parameter
 * to use `additional_kwargs` instead.
 *
 * Before: AIMessage(content="hi", example=True)
 * After:  AIMessage(content="hi", additional_kwargs={"example": True})
 */

async function transform(root: SgRoot<Python>): Promise<string | null> {
	const rootNode = root.root();
	const edits: Edit[] = [];

	// Find all call expressions that could be AIMessage
	const calls = rootNode.findAll({
		rule: {
			kind: "call",
			has: {
				field: "function",
				kind: "identifier",
				regex: "^AIMessage$",
			},
		},
	});

	for (const call of calls) {
		const argList = call.field("arguments");
		if (!argList) continue;

		// Find the example=... keyword argument
		const exampleArg = argList.find({
			rule: {
				kind: "keyword_argument",
				has: {
					kind: "identifier",
					regex: "^example$",
				},
			},
		});

		if (!exampleArg) continue;

		// Get the example argument's name identifier and value
		const exampleNameNode = exampleArg.find({
			rule: { kind: "identifier", regex: "^example$" },
		});
		if (!exampleNameNode) continue;

		// Find the value of example= (the child after =)
		const exampleValueNode = getKeywordArgumentValue(exampleArg);
		if (!exampleValueNode) continue;

		const exampleValue = exampleValueNode.text();

		// Find if additional_kwargs already exists
		const additionalKwargsArg = argList.find({
			rule: {
				kind: "keyword_argument",
				has: {
					kind: "identifier",
					regex: "^additional_kwargs$",
				},
			},
		});

		if (additionalKwargsArg) {
			// additional_kwargs exists - we need to check if it's a dict literal or a variable
			const additionalKwargsValue = getKeywordArgumentValue(additionalKwargsArg);
			if (!additionalKwargsValue) continue;

			if (additionalKwargsValue.kind() === "dictionary") {
				// It's a dict literal - check if "example" key already exists
				const existingExampleKey = additionalKwargsValue.find({
					rule: {
						kind: "pair",
						has: {
							kind: "string",
							has: {
								kind: "string_content",
								regex: "^example$",
							},
						},
					},
				});

				if (existingExampleKey) {
					// Skip - avoid overriding semantics
					continue;
				}

				// Merge "example": EXPR into the existing dict
				// Find the opening brace and insert after it
				const dictText = additionalKwargsValue.text();
				const dictContent = dictText.slice(1, -1).trim(); // Remove braces

				let newDictText: string;
				if (dictContent === "") {
					// Empty dict
					newDictText = `{"example": ${exampleValue}}`;
				} else {
					// Non-empty dict - add to the beginning to maintain order
					newDictText = `{"example": ${exampleValue}, ${dictContent}}`;
				}

				edits.push(additionalKwargsValue.replace(newDictText));
			} else {
				// It's a variable or other expression - wrap with merge
				const varText = additionalKwargsValue.text();
				const newValue = `{**${varText}, "example": ${exampleValue}}`;
				edits.push(additionalKwargsValue.replace(newValue));
			}

			// Remove the example= argument (including the comma if present)
			edits.push(removeArgumentWithComma(exampleArg, argList));
		} else {
			// additional_kwargs doesn't exist - replace example= with additional_kwargs={"example": EXPR}
			edits.push(
				exampleArg.replace(`additional_kwargs={"example": ${exampleValue}}`),
			);
		}
	}

	if (edits.length === 0) {
		return null;
	}

	return rootNode.commitEdits(edits);
}

/**
 * Remove an argument from an argument list, handling comma and whitespace cleanup.
 */
function removeArgumentWithComma(
	arg: SgNode<Python>,
	argList: SgNode<Python>,
): Edit {
	const allChildren = argList.children();
	const argIndex = allChildren.findIndex((child) => child.id() === arg.id());

	// Find the range to remove - include trailing comma if exists, or leading comma
	let startPos = arg.range().start.index;
	let endPos = arg.range().end.index;

	// Look for a trailing comma
	const nextChild = allChildren[argIndex + 1];
	if (nextChild && nextChild.text() === ",") {
		// Include the comma
		endPos = nextChild.range().end.index;

		// Also consume any whitespace after the comma up to the next argument
		const afterComma = allChildren[argIndex + 2];
		if (afterComma) {
			// Extend to include whitespace between comma and next argument
			endPos = afterComma.range().start.index;
		}
	} else {
		// No trailing comma - check for leading comma and whitespace
		const prevChild = allChildren[argIndex - 1];
		if (prevChild && prevChild.text() === ",") {
			// Include the comma before and any whitespace between it and this argument
			startPos = prevChild.range().start.index;
		}
	}

	return {
		startPos,
		endPos,
		insertedText: "",
	};
}

/**
 * Get the value part of a keyword_argument node.
 * For `foo=bar`, this returns the node for `bar`.
 */
function getKeywordArgumentValue(
	keywordArg: SgNode<Python>,
): SgNode<Python> | null {
	const children = keywordArg.children();
	// keyword_argument structure: identifier = expression
	// Find the child after the "=" token
	let foundEquals = false;
	for (const child of children) {
		if (foundEquals) {
			return child;
		}
		if (child.text() === "=") {
			foundEquals = true;
		}
	}
	return null;
}

export default transform;

