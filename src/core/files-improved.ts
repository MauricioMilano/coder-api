import fs from 'fs/promises';
import path from 'path';
// Performance configuration for large files
const getFileSizeLimit = (): number => {
  const envMaxUploadMb = process.env.MAX_UPLOAD_MB ? parseInt(process.env.MAX_UPLOAD_MB) : 50;
  return envMaxUploadMb * 1024 * 1024;
};

const getInsertLimit = (): number => {
  const baseLimit = getFileSizeLimit() / 4;
  return Math.max(baseLimit, 1024 * 1024);
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

import { safeResolvePath, readFileSafe, writeFileSafe, deletePathSafe } from '../lib/fs-safe';
import { sha256 } from '../lib/hashing';
import { parsePatch, applyPatch } from 'diff';
import type { StructuredPatch } from 'diff';
import { Project } from '../types/common';

// ---------------------
// Core Operations
// ---------------------

export async function getFile(project: Project, filePath: string, encoding: 'text' | 'base64') {
  const absPath = await safeResolvePath(project.rootAbsPath, filePath);
  
  // ✅ File size validation for large files
  const stats = await fs.stat(absPath).catch(() => null);
  if (stats) {
    const sizeLimit = getFileSizeLimit();
    if (stats.size > sizeLimit) {
      throw { 
        statusCode: 413, 
        message: `File too large (${formatFileSize(stats.size)})`, 
        maxAllowed: formatFileSize(sizeLimit)
      };
    }
  }
  
  const content = await readFileSafe(absPath, encoding);
  const hash = sha256(content);
  return { path: filePath, content, hash };
}

export async function createFile(project: Project, data: any) {
  const absPath = await safeResolvePath(project.rootAbsPath, data.path);
  
  // ✅ Validate size before writing
  if (data.content && process.env.MAX_UPLOAD_MB) {
    const contentSize = Buffer.byteLength(data.content, data.encoding || 'utf-8');
    const sizeLimit = getFileSizeLimit();
    
    if (contentSize > sizeLimit) {
      throw { 
        statusCode: 413, 
        message: `Content too large (${formatFileSize(contentSize)})`, 
        maxAllowed: formatFileSize(sizeLimit)
      };
    }
  }
  
  await writeFileSafe(absPath, data.content, data.encoding, data.overwrite);
  const hash = sha256(data.content);
  return { path: data.path, hash };
}

export async function deleteFile(project: Project, data: any) {
  const absPath = await safeResolvePath(project.rootAbsPath, data.path);
  await deletePathSafe(absPath, data.recursive, data.missing_ok);
  return { deleted: true };
}

export async function patchFile(project: Project, data: any) {
  const absPath = await safeResolvePath(project.rootAbsPath, data.path);
  
  // ✅ File size validation for patch operations
  const stats = await fs.stat(absPath).catch(() => null);
  if (stats) {
    const sizeLimit = getFileSizeLimit();
    if (stats.size > sizeLimit) {
      throw { 
        statusCode: 413, 
        message: `File too large (${formatFileSize(stats.size)})`, 
        maxAllowed: formatFileSize(sizeLimit)
      };
    }
  }

  const originalContent = await fs.readFile(absPath, 'utf-8');
  const currentHash = sha256(originalContent);

  if (data.expected_hash && currentHash !== data.expected_hash) {
    throw { statusCode: 409, message: 'Hash mismatch', expected: data.expected_hash, actual: currentHash };
  }

  // ✅ Validate insert content size
  if (data.operation?.type === 'insert' && process.env.MAX_UPLOAD_MB) {
    const insertLimit = getInsertLimit();
    if (data.content && Buffer.byteLength(data.content, 'utf-8') > insertLimit) {
      throw { 
        statusCode: 413, 
        message: `Insert content too large (${formatFileSize(Buffer.byteLength(data.content, 'utf-8'))})`,
        maxAllowed: formatFileSize(insertLimit)
      };
    }
  }

  const { content: modifiedContent, stats: operationStats } = await applyOperation(originalContent, data.operation);

  if (data.preview) {
    return {
      path: data.path,
      preview: true,
      original_hash: currentHash,
      modified_hash: sha256(modifiedContent),
      bytes_before: Buffer.byteLength(originalContent, 'utf-8'),
      bytes_after: Buffer.byteLength(modifiedContent, 'utf-8'),
      stats: operationStats,
      diff_preview: generateDiffPreview(originalContent, modifiedContent),
    };
  }

  await fs.writeFile(absPath, modifiedContent, 'utf-8');
  return {
    path: data.path,
    hash: sha256(modifiedContent),
    bytes_before: Buffer.byteLength(originalContent, 'utf-8'),
    bytes_after: Buffer.byteLength(modifiedContent, 'utf-8'),
    stats: operationStats,
  };
}

// ---------------------
// Patch Operations
// ---------------------

async function applyOperation(originalContent: string, operation: any) {
  // ✅ Performance timing for large files
  const opStartTime = process.hrtime();
  
  let result;
  switch (operation.type) {
    case 'diff':
      result = applyDiffOperation(originalContent, operation);
      break;
    case 'replace':
      result = applyReplaceOperation(originalContent, operation);
      break;
    case 'lines':
      result = applyLinesOperation(originalContent, operation);
      break;
    case 'insert':
      result = applyInsertOperation(originalContent, operation);
      break;
    case 'code_block':
      result = applyCodeBlockOperation(originalContent, operation);
      break;
    default:
      throw new Error(`Unknown operation type: ${operation.type}`);
  }
  
  // Performance warning for slow operations (>500ms on files >1MB)
  const elapsedMs = process.hrtime()[0] * 1e9 + process.hrtime()[1] - (opStartTime[0] * 1e9 + opStartTime[1]);
  if (originalContent.length > 1024 && elapsedMs > 500) {
    console.warn(`⚠️ Slow operation detected: ${operation.type} took ${elapsedMs}ms on ${formatFileSize(originalContent.length)} file`);
  }
  
  return result;
}

function applyDiffOperation(originalContent: string, operation: any) {
  const parsed = parsePatch(operation.patch);
  if (!parsed.length) throw new Error('Empty patch');
  const [patch] = parsed;
  const patched = applyPatch(originalContent, patch, {
    fuzzFactor: operation.fuzz_factor,
    autoConvertLineEndings: operation.auto_convert_line_endings,
  });
  if (patched === false) throw new Error('Patch failed');
  const stats = summarizePatch(patch);
  return {
    content: patched,
    stats: { operation: 'diff', lines_added: stats.linesAdded, lines_removed: stats.linesRemoved },
  };
}

function applyReplaceOperation(originalContent: string, op: any) {
  const flags = op.all ? 'g' : '';
  const pattern = op.regex ? new RegExp(op.find, flags) : op.find;
  const modified = typeof pattern === 'string'
    ? (op.all ? originalContent.split(pattern).join(op.replace) : originalContent.replace(pattern, op.replace))
    : originalContent.replace(pattern, op.replace);
  return { content: modified, stats: { operation: 'replace' } };
}

function applyLinesOperation(originalContent: string, op: any) {
  // ✅ Bounds checking for line operations
  if (typeof op.line_number !== 'number' || isNaN(op.line_number)) {
    throw new Error('Invalid line_number for lines operation');
  }
  
  const idx = op.line_number - 1;
  const totalLines = originalContent.length > 0 ? originalContent.split('\n').length : 0;
  
  if (idx < 0 || idx >= totalLines) {
    throw new Error(`Line number ${op.line_number} is out of bounds. Valid range: [1, ${totalLines}]`);
  }
  
  // ✅ Limit lines to insert (>1000 rejected)
  if (op.action === 'insert' && op.content) {
    const linesToAdd = op.content.split('\n');
    if (linesToAdd.length > 1000) {
      throw new Error(`Too many lines to insert (>1000). Try using code_block operation instead.`);
    }
  }
  
  const lines = originalContent.split('\n');
  const modified = [...lines];
  switch (op.action) {
    case 'insert':
      if (op.content) {
        const newLines = op.content.split('\n');
        modified.splice(idx, 0, ...newLines);
      }
      break;
    case 'delete':
      if (typeof op.count === 'number') {
        modified.splice(idx, Math.min(op.count, modified.length - idx));
      }
      break;
    case 'replace':
      if (op.content) {
        const newLines = op.content.split('\n');
        modified.splice(idx, op.count, ...newLines);
      } else {
        modified.splice(idx, op.count);
      }
      break;
  }
  
  // ✅ Preserve trailing newline if original had it
  const endsWithNewline = originalContent.endsWith('\n');
  if (!modified.join('\n').endsWith('\n') && endsWithNewline) {
    modified.push('');
  }
  
  return { content: modified.join('\n'), stats: { operation: 'lines', action: op.action } };
}

function applyInsertOperation(originalContent: string, op: any) {
  // ✅ Bounds checking for insert position
  if (typeof op.position !== 'number' || isNaN(op.position)) {
    throw new Error('Invalid position for insert operation');
  }
  
  const maxLength = originalContent.length;
  
  if (op.position < 0) {
    throw new Error(`Position ${op.position} is out of bounds (negative). Valid range: [0, ${maxLength}]`);
  }
  
  if (op.position > maxLength) {
    // ✅ Safe append at end of file
    const insertLimit = getInsertLimit();
    const contentLen = Buffer.byteLength(op.content, 'utf-8');
    
    if (contentLen > insertLimit) {
      throw { 
        statusCode: 413, 
        message: `Insert content too large (${formatFileSize(contentLen)})`,
        maxAllowed: formatFileSize(insertLimit)
      };
    }
    
    const modified = originalContent + op.content;
    return { content: modified, stats: { operation: 'insert', position: maxLength, type: 'append' } };
  }
  
  const modified = originalContent.slice(0, op.position) + op.content + originalContent.slice(op.position);
  return { content: modified, stats: { operation: 'insert', position: op.position } };
}

function applyCodeBlockOperation(originalContent: string, op: any) {
  // ✅ CRITICAL: Bounds checking and size validation for code blocks
  const contextIdx = originalContent.indexOf(op.find_context);
  
  if (contextIdx === -1) {
    throw new Error('Context not found');
  }
  
  // ✅ Anti-injection: check size ratio
  const findContextLen = op.find_context.length;
  const replaceWithLen = op.replace_with ? op.replace_with.length : 0;
  
  if (replaceWithLen > 0 && replaceWithLen > findContextLen * 5) {
    throw new Error(`Replace text (${replaceWithLen} chars) is 5x larger than context (${findContextLen} chars). Check for injection or use diff operation.`);
  }
  
  // ✅ Replace only first occurrence to prevent side effects
  const modified = originalContent.replace(op.find_context, op.replace_with);
  
  // ✅ Validate changes were made (no silent no-op)
  if (originalContent === modified) {
    throw new Error('No changes made - context was already replaced or not found in the expected location');
  }
  
  return { content: modified, stats: { operation: 'code_block', context_found: true, replaced_once: true } };
}

function summarizePatch(patch: any) {
  let linesAdded = 0;
  let linesRemoved = 0;
  let hunkCount = 0;
  for (const hunk of patch.hunks) {
    hunkCount += 1;
    for (const line of hunk.lines) {
      if (line.startsWith('+')) linesAdded += 1;
      else if (line.startsWith('-')) linesRemoved += 1;
    }
  }
  return { linesAdded, linesRemoved, hunkCount };
}

function generateDiffPreview(original: string, modified: string) {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const preview: string[] = [];
  const maxPreviewLines = 10;
  let changesShown = 0;

  for (let i = 0; i < Math.max(originalLines.length, modifiedLines.length) && changesShown < maxPreviewLines * 2; i++) {
    if (originalLines[i] !== modifiedLines[i]) {
      if (originalLines[i]) preview.push(`- ${originalLines[i]}`);
      if (modifiedLines[i]) preview.push(`+ ${modifiedLines[i]}`);
      changesShown++;
    } else if (changesShown > 0 && i === maxPreviewLines) {
      break;
    }
  }
  
  if (changesShown >= maxPreviewLines) preview.push('... (more changes not shown)');
  return preview.join('\n');
}

export default {
  getFile,
  createFile,
  deleteFile,
  patchFile
};
