# text-method-to-property

Transforms deprecated `.text()` method calls to `.text` property access for LangChain v1.

## Summary

Message `.text()` is deprecated and becomes a property in v1; calling it as a method should be updated to property access to avoid warnings and future breakage.

## Detection Criteria

- Find method calls matching `(<expr>).text()` where `text` is invoked with zero arguments
- Applies as a safe mechanical transform

## Transformation Logic

1. Replace `X.text()` with `X.text`
2. Leave `X.text(arg)` (non-zero args) unchanged

## Before / After Example

```python
# Before
text = response.text()

# After
text = response.text
```

## Running the Codemod

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run on a target directory
npx codemod workflow run -w workflow.yaml -t /path/to/target
```

## Notes / Edge Cases

- Calls with arguments are left unchanged: `obj.text("arg")` → stays as is
- Works with any expression: `get_response().text()` → `get_response().text`
- Chained calls are handled: `response.text().strip()` → `response.text.strip()`

