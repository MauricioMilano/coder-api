import fs from 'fs/promises';
import path from 'path';
import { safeResolvePath, readFileSafe, writeFileSafe, deletePathSafe } from '../lib/fs-safe';
import { sha256 } from '../lib/hashing';
import { parsePatch, applyPatch } from 'diff';
import type { StructuredPatch } from 'diff';
import { Project } from '../types/common';

// ---------------------
// Utility functions
// ---------------------

function summarizePatch(patch: StructuredPatch) {
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

  for (let i = 0; i < Math.max(originalLines.length, modifiedLines.length) && changesShown < maxPreviewLines; i++) {
    if (originalLines[i] !== modifiedLines[i]) {
      if (originalLines[i]) preview.push(`- ${originalLines[i]}`);
      if (modifiedLines[i]) preview.push(`+ ${modifiedLines[i]}`);
      changesShown++;
    }
  }
  if (changesShown >= maxPreviewLines) preview.push('... (more changes not shown)');
  return preview.join('\n');
}

// ---------------------
// Core Operations
// ---------------------

export async function getFile(project: Project, filePath: string, encoding: 'text' | 'base64') {
  const absPath = await safeResolvePath(project.rootAbsPath, filePath);
  const content = await readFileSafe(absPath, encoding);
  const hash = sha256(content);
  return { path: filePath, content, hash };
}

export async function createFile(project: Project, data: any) {
  const absPath = await safeResolvePath(project.rootAbsPath, data.path);
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
  const originalContent = await fs.readFile(absPath, 'utf-8');
  const currentHash = sha256(originalContent);

  if (data.expected_hash && currentHash !== data.expected_hash) {
    throw { statusCode: 409, message: 'Hash mismatch', expected: data.expected_hash, actual: currentHash };
  }

  const { content: modifiedContent, stats } = await applyOperation(originalContent, data.operation);

  if (data.preview) {
    return {
      path: data.path,
      preview: true,
      original_hash: currentHash,
      modified_hash: sha256(modifiedContent),
      bytes_before: Buffer.byteLength(originalContent, 'utf-8'),
      bytes_after: Buffer.byteLength(modifiedContent, 'utf-8'),
      stats,
      diff_preview: generateDiffPreview(originalContent, modifiedContent),
    };
  }

  await fs.writeFile(absPath, modifiedContent, 'utf-8');
  return {
    path: data.path,
    hash: sha256(modifiedContent),
    bytes_before: Buffer.byteLength(originalContent, 'utf-8'),
    bytes_after: Buffer.byteLength(modifiedContent, 'utf-8'),
    stats,
  };
}

// ---------------------
// Patch Operations
// ---------------------

async function applyOperation(originalContent: string, operation: any) {
  switch (operation.type) {
    case 'diff':
      return applyDiffOperation(originalContent, operation);
    case 'replace':
      return applyReplaceOperation(originalContent, operation);
    case 'lines':
      return applyLinesOperation(originalContent, operation);
    case 'insert':
      return applyInsertOperation(originalContent, operation);
    case 'code_block':
      return applyCodeBlockOperation(originalContent, operation);
    default:
      throw new Error(`Unknown operation type: ${operation.type}`);
  }
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
  const lines = originalContent.split('\n');
  const idx = op.line_number - 1;
  let modified = [...lines];
  switch (op.action) {
    case 'insert':
      modified.splice(idx, 0, ...op.content.split('\n'));
      break;
    case 'delete':
      modified.splice(idx, op.count);
      break;
    case 'replace':
      modified.splice(idx, op.count, ...op.content.split('\n'));
      break;
  }
  return { content: modified.join('\n'), stats: { operation: 'lines', action: op.action } };
}

function applyInsertOperation(originalContent: string, op: any) {
  const modified = originalContent.slice(0, op.position) + op.content + originalContent.slice(op.position);
  return { content: modified, stats: { operation: 'insert', position: op.position } };
}

function applyCodeBlockOperation(originalContent: string, op: any) {
  const idx = originalContent.indexOf(op.find_context);
  if (idx === -1) throw new Error('Context not found');
  const modified = originalContent.replace(op.find_context, op.replace_with);
  return { content: modified, stats: { operation: 'code_block', context_found: true } };
}