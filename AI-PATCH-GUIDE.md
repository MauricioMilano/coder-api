# AI Guide: Using the PATCH Endpoint

## Quick Reference

The PATCH endpoint supports 5 operation types for editing files. Always use the **preview mode first** for complex changes.

### Basic Pattern
```json
{
  "path": "file/path.ext",
  "preview": true,  // Always preview first
  "operation": {
    "type": "operation_type",
    // ... operation-specific fields
  }
}
```

## Operation Types

### 1. `replace` - Find and Replace
**Use for**: Changing imports, variable names, simple text substitutions
```json
{
  "path": "src/component.tsx",
  "operation": {
    "type": "replace",
    "find": "import React from 'react'",
    "replace": "import React, { useState } from 'react'",
    "case_sensitive": true,
    "all": false
  }
}
```

### 2. `lines` - Line Operations
**Use for**: Adding imports, deleting code blocks, replacing specific lines
```json
{
  "path": "src/config.ts",
  "operation": {
    "type": "lines",
    "action": "insert",  // "insert", "delete", or "replace"
    "line_number": 5,
    "content": "export const API_URL = 'https://api.example.com';"
  }
}
```

### 3. `code_block` - Smart Code Replacement
**Use for**: Replacing functions, classes, or code blocks
```json
{
  "path": "src/api.ts",
  "operation": {
    "type": "code_block",
    "language": "typescript",
    "find_context": "function processData",
    "replace_with": "async function processData(data: any) {\n  return await enhance(data);\n}",
    "fuzzy_match": true
  }
}
```

### 4. `insert` - Character Position Insert
**Use for**: Adding content at specific positions (headers, end of file)
```json
{
  "path": "src/index.ts",
  "operation": {
    "type": "insert",
    "position": 0,
    "content": "#!/usr/bin/env node\n"
  }
}
```

### 5. `diff` - Traditional Patch
**Use for**: Complex changes when you have a proper diff format
```json
{
  "path": "src/file.ts",
  "operation": {
    "type": "diff",
    "patch": "--- a/src/file.ts\n+++ b/src/file.ts\n@@ -1,3 +1,3 @@\n-old line\n+new line"
  }
}
```

## Best Practices

### 1. Always Preview First
```json
{ "preview": true, ... }  // See changes before applying
```

### 2. Use Hash Validation
```json
{ "expected_hash": "sha256:abc123...", ... }  // Ensure file hasn't changed
```

### 3. Choose the Right Operation
- **Simple text changes** → `replace`
- **Add/remove lines** → `lines` 
- **Function/class changes** → `code_block`
- **File headers/footers** → `insert`
- **Complex diffs** → `diff`

### 4. Handle Errors Gracefully
- **"Context not found"** → Try smaller context or fuzzy matching
- **"Hash mismatch"** → Re-read file to get current hash
- **"Pattern not found"** → Use preview to debug the find pattern

## Common Workflows

### Adding a New Import
```json
{
  "path": "src/component.tsx",
  "operation": {
    "type": "lines",
    "action": "insert",
    "line_number": 1,
    "content": "import { NewLibrary } from 'new-library';"
  }
}
```

### Replacing a Function
```json
{
  "path": "src/utils.ts",
  "operation": {
    "type": "code_block",
    "find_context": "function oldFunction",
    "replace_with": "function newFunction(param: string) {\n  return processParam(param);\n}",
    "fuzzy_match": true
  }
}
```

### Updating Multiple Occurrences
```json
{
  "path": "src/legacy.js",
  "operation": {
    "type": "replace",
    "find": "var ",
    "replace": "const ",
    "all": true
  }
}
```

## Response Analysis

Check the response `stats` field to verify changes:
```json
{
  "path": "src/file.ts",
  "hash": "sha256:new_hash",
  "stats": {
    "operation": "replace",
    "replacements_made": 3,
    "pattern": "old_pattern"
  }
}
```

## Error Recovery

If an operation fails:
1. Check the error message
2. Use preview mode to debug
3. Try a simpler operation type
4. Verify the file content with GET request
5. Use smaller, more specific context

## Key Rules
- ✅ Always preview complex changes
- ✅ Use the most specific operation type
- ✅ Include enough context for fuzzy matching
- ✅ Check response stats to verify success
- ❌ Don't chain multiple operations without validation
- ❌ Don't use overly broad find patterns