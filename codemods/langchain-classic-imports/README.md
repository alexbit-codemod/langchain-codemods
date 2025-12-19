# langchain-classic-imports

Migrate LangChain v1 legacy imports from `langchain` to `langchain-classic`.

## Summary

LangChain v1 streamlines the core `langchain` namespace and moves legacy modules (retrievers, indexing API, hub) under `langchain-classic`. This codemod updates imports accordingly.

## What It Does

### Transformations

1. `from langchain.retrievers import X` → `from langchain_classic.retrievers import X`
2. `from langchain.indexes import X` → `from langchain_classic.indexes import X`
3. `from langchain import hub` → `from langchain_classic import hub`

### Before

```python
from langchain.retrievers import MultiQueryRetriever
from langchain.indexes import SQLRecordManager
from langchain import hub
```

### After

```python
from langchain_classic.retrievers import MultiQueryRetriever
from langchain_classic.indexes import SQLRecordManager
from langchain_classic import hub
```

## Detection Criteria

- `from langchain.retrievers import ...`
- `from langchain.indexes import ...`
- `from langchain import hub`

## Edge Cases

- **Already migrated**: Imports from `langchain_classic.*` are skipped
- **Other modules**: Imports from other `langchain.*` modules (llms, chat_models, etc.) are not modified
- **Submodules**: Submodule imports like `from langchain.retrievers.document_compressors import X` are also migrated

## Usage

```bash
# Run the codemod on your project
npx codemod run langchain-classic-imports -t /path/to/your/project

# Or run locally
npx codemod workflow run -w workflow.yaml -t /path/to/your/project
```

## Testing

```bash
npm install
npm test
```

## Note

After running this codemod, you'll need to add `langchain-classic` as a dependency to your project:

```bash
pip install langchain-classic
# or
uv add langchain-classic
```

