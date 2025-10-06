import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { safeResolvePath, readFileSafe, writeFileSafe, deletePathSafe } from '../lib/fs-safe';
import { sha256 } from '../lib/hashing';
import { Project } from '../types/common';
import { idemCache } from '../lib/idem';
import { parsePatch, applyPatch } from 'diff';
import type { StructuredPatch } from 'diff';

const FileGetQuery = z.object({
  path: z.string(),
  encoding: z.enum(['text', 'base64']).default('text')
});

const FileCreateSchema = z.object({
  path: z.string(),
  content: z.string(),
  encoding: z.enum(['text', 'base64']).default('text'),
  create_parents: z.boolean().default(true),
  overwrite: z.boolean().default(false)
});

const FilePatchSchema = z.object({
  path: z.string(),
  expected_hash: z.string().optional(),
  preview: z.boolean().default(false), // Preview changes without applying
  operation: z.discriminatedUnion('type', [
    // Traditional diff patch (keep for backwards compatibility)
    z.object({
      type: z.literal('diff'),
      patch: z.string().min(1),
      fuzz_factor: z.coerce.number().int().min(0).max(10).default(0),
      auto_convert_line_endings: z.boolean().default(true)
    }),
    // Find and replace text blocks
    z.object({
      type: z.literal('replace'),
      find: z.string().min(1),
      replace: z.string(),
      all: z.boolean().default(false), // Replace all occurrences or just first
      case_sensitive: z.boolean().default(true),
      regex: z.boolean().default(false) // Treat find as regex pattern
    }),
    // Line-based operations
    z.object({
      type: z.literal('lines'),
      action: z.enum(['insert', 'delete', 'replace']),
      line_number: z.number().int().min(1), // 1-indexed line number
      count: z.number().int().min(1).default(1), // Number of lines to affect
      content: z.string().optional() // Required for insert/replace
    }),
    // Insert at specific position (character-based)
    z.object({
      type: z.literal('insert'),
      position: z.number().int().min(0), // Character position in file
      content: z.string().min(1)
    }),
    // Smart code block replacement (AI-friendly)
    z.object({
      type: z.literal('code_block'),
      language: z.string().optional(), // Programming language for context
      find_context: z.string().min(1), // Context to find the code block
      replace_with: z.string(), // New code block content
      fuzzy_match: z.boolean().default(true) // Allow fuzzy matching of context
    })
  ])
});

const FileDeleteSchema = z.object({
  path: z.string(),
  recursive: z.boolean().default(false),
  missing_ok: z.boolean().default(false)
});

export default async function (fastify: FastifyInstance) {
  // GET /projects/:projectId/files
  fastify.get('/', async (req, reply) => {
    const parse = FileGetQuery.safeParse(req.query);
    if (!parse.success) {
      return reply.status(422).send({ error: 'Validation error', details: parse.error.errors });
    }
    const { path: filePath, encoding } = parse.data;
  const { config } = require('../config');
  const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }
    const absPath = await safeResolvePath(project.rootAbsPath, filePath);
    const content = await readFileSafe(absPath, encoding);
    const hash = sha256(content);
    return { path: filePath, content, hash };
  });

  // POST /projects/:projectId/files
  fastify.post('/', async (req, reply) => {
    const parse = FileCreateSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(422).send({ error: 'Validation error', details: parse.error.errors });
    }
    const idemKey = req.headers['idempotency-key'] as string | undefined;
    if (idemKey) {
      const cached = idemCache.get(req.method, req.url, idemKey);
      if (cached) return reply.send(cached);
    }
  const { config } = require('../config');
  const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }
    const absPath = await safeResolvePath(project.rootAbsPath, parse.data.path);
    await writeFileSafe(absPath, parse.data.content, parse.data.encoding, parse.data.overwrite);
    const hash = sha256(parse.data.content);
    const resp = { path: parse.data.path, hash };
    if (idemKey) idemCache.set(req.method, req.url, idemKey, resp);
    return resp;
  });

  // PATCH /projects/:projectId/files
  fastify.patch('/', async (req, reply) => {
    const parse = FilePatchSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(422).send({ error: 'Validation error', details: parse.error.errors });
    }

    const { config } = require('../config');
    const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const absPath = await safeResolvePath(project.rootAbsPath, parse.data.path);
    const originalContent = await fs.readFile(absPath, 'utf-8');
    const currentHash = sha256(originalContent);

    // Validate expected hash if provided
    if (parse.data.expected_hash && currentHash !== parse.data.expected_hash) {
      return reply.status(409).send({
        error: 'Hash mismatch',
        expected: parse.data.expected_hash,
        actual: currentHash,
      });
    }

    let modifiedContent: string;
    let operationStats: any = {};

    try {
      const result = await applyOperation(originalContent, parse.data.operation);
      modifiedContent = result.content;
      operationStats = result.stats;
    } catch (err) {
      return reply.status(400).send({
        error: 'Operation failed',
        details: (err as Error).message,
      });
    }

    // Preview mode - return the changes without applying them
    if (parse.data.preview) {
      return {
        path: parse.data.path,
        preview: true,
        original_hash: currentHash,
        modified_hash: sha256(modifiedContent),
        bytes_before: Buffer.byteLength(originalContent, 'utf-8'),
        bytes_after: Buffer.byteLength(modifiedContent, 'utf-8'),
        stats: operationStats,
        diff_preview: generateDiffPreview(originalContent, modifiedContent),
      };
    }

    // Apply the changes
    await fs.writeFile(absPath, modifiedContent, 'utf-8');
    
    return {
      path: parse.data.path,
      hash: sha256(modifiedContent),
      bytes_before: Buffer.byteLength(originalContent, 'utf-8'),
      bytes_after: Buffer.byteLength(modifiedContent, 'utf-8'),
      stats: operationStats,
    };
  });

  // DELETE /projects/:projectId/paths
  fastify.delete('/', async (req, reply) => {
    const parse = FileDeleteSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(422).send({ error: 'Validation error', details: parse.error.errors });
    }
    const idemKey = req.headers['idempotency-key'] as string | undefined;
    if (idemKey) {
      const cached = idemCache.get(req.method, req.url, idemKey);
      if (cached) return reply.send(cached);
    }
  const { config } = require('../config');
  const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }
    const absPath = await safeResolvePath(project.rootAbsPath, parse.data.path);
    await deletePathSafe(absPath, parse.data.recursive, parse.data.missing_ok);
    const resp = { deleted: true };
    if (idemKey) idemCache.set(req.method, req.url, idemKey, resp);
    return resp;
  });
}

function normalizeRequestPath(userPath: string) {
  const cleaned = userPath.replace(/^\/+/, '').replace(/\\+/g, '/');
  return path.posix.normalize(cleaned || '.');
}

function collectPatchTargets(patch: StructuredPatch) {
  const targets = new Set<string>();
  for (const candidate of [patch.oldFileName, patch.newFileName]) {
    const normalized = normalizePatchFilename(candidate);
    if (normalized) targets.add(normalized);
  }
  return targets;
}

function normalizePatchFilename(name?: string | null) {
  if (!name || name === '/dev/null') return null;
  let cleaned = name.replace(/^a\//, '').replace(/^b\//, '');
  cleaned = cleaned.replace(/^\"/, '').replace(/\"$/, '');
  cleaned = cleaned.replace(/\\+/g, '/').replace(/^\/+/, '');
  return path.posix.normalize(cleaned);
}

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
  let parsedPatch: StructuredPatch[];
  try {
    parsedPatch = parsePatch(operation.patch);
  } catch (err) {
    throw new Error(`Invalid patch format: ${(err as Error).message}`);
  }

  if (parsedPatch.length === 0) {
    throw new Error('Patch contains no hunks');
  }
  if (parsedPatch.length !== 1) {
    throw new Error('Patch must target a single file');
  }

  const [singlePatch] = parsedPatch;
  const patchedContent = applyPatch(originalContent, singlePatch, {
    fuzzFactor: operation.fuzz_factor,
    autoConvertLineEndings: operation.auto_convert_line_endings,
  });

  if (patchedContent === false) {
    throw new Error('Patch failed to apply with provided context');
  }

  const stats = summarizePatch(singlePatch);
  return {
    content: patchedContent,
    stats: {
      operation: 'diff',
      lines_added: stats.linesAdded,
      lines_removed: stats.linesRemoved,
      hunks_applied: stats.hunkCount,
    },
  };
}

function applyReplaceOperation(originalContent: string, operation: any) {
  let { find, replace, all, case_sensitive, regex } = operation;
  let searchPattern: string | RegExp = find;
  let replacements = 0;

  if (regex) {
    const flags = case_sensitive ? 'g' : 'gi';
    searchPattern = new RegExp(find, all ? flags : flags.replace('g', ''));
  } else if (!case_sensitive) {
    // For non-regex, case-insensitive search
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = all ? 'gi' : 'i';
    searchPattern = new RegExp(escapeRegex(find), flags);
  }

  let modifiedContent: string;
  if (typeof searchPattern === 'string') {
    // Simple string replacement
    if (all) {
      const parts = originalContent.split(find);
      replacements = parts.length - 1;
      modifiedContent = parts.join(replace);
    } else {
      const index = originalContent.indexOf(find);
      if (index !== -1) {
        replacements = 1;
        modifiedContent = originalContent.substring(0, index) + replace + originalContent.substring(index + find.length);
      } else {
        modifiedContent = originalContent;
      }
    }
  } else {
    // Regex replacement
    const matches = originalContent.match(searchPattern);
    replacements = matches ? matches.length : 0;
    modifiedContent = originalContent.replace(searchPattern, replace);
  }

  if (replacements === 0) {
    throw new Error(`Pattern not found: ${find}`);
  }

  return {
    content: modifiedContent,
    stats: {
      operation: 'replace',
      replacements_made: replacements,
      pattern: find,
      case_sensitive,
      regex,
      all,
    },
  };
}

function applyLinesOperation(originalContent: string, operation: any) {
  const lines = originalContent.split('\n');
  const { action, line_number, count, content } = operation;
  const index = line_number - 1; // Convert to 0-indexed

  if (index < 0 || index >= lines.length) {
    throw new Error(`Line number ${line_number} is out of range (1-${lines.length})`);
  }

  let modifiedLines = [...lines];
  let linesAffected = 0;

  switch (action) {
    case 'insert':
      if (!content) throw new Error('Content is required for insert operation');
      const insertLines = content.split('\n');
      modifiedLines.splice(index, 0, ...insertLines);
      linesAffected = insertLines.length;
      break;

    case 'delete':
      const deleteCount = Math.min(count, lines.length - index);
      modifiedLines.splice(index, deleteCount);
      linesAffected = deleteCount;
      break;

    case 'replace':
      if (!content) throw new Error('Content is required for replace operation');
      const replaceLines = content.split('\n');
      const replaceCount = Math.min(count, lines.length - index);
      modifiedLines.splice(index, replaceCount, ...replaceLines);
      linesAffected = replaceCount;
      break;

    default:
      throw new Error(`Unknown line action: ${action}`);
  }

  return {
    content: modifiedLines.join('\n'),
    stats: {
      operation: 'lines',
      action,
      line_number,
      lines_affected: linesAffected,
    },
  };
}

function applyInsertOperation(originalContent: string, operation: any) {
  const { position, content } = operation;
  
  if (position < 0 || position > originalContent.length) {
    throw new Error(`Position ${position} is out of range (0-${originalContent.length})`);
  }

  const modifiedContent = originalContent.substring(0, position) + content + originalContent.substring(position);

  return {
    content: modifiedContent,
    stats: {
      operation: 'insert',
      position,
      characters_inserted: content.length,
    },
  };
}

function applyCodeBlockOperation(originalContent: string, operation: any) {
  const { find_context, replace_with, fuzzy_match } = operation;
  
  let contextIndex = -1;
  
  if (fuzzy_match) {
    // Try fuzzy matching by looking for key parts of the context
    const contextLines = find_context.trim().split('\n').filter((line: string) => line.trim());
    for (const line of contextLines) {
      const trimmedLine = line.trim();
      if (trimmedLine && originalContent.includes(trimmedLine)) {
        contextIndex = originalContent.indexOf(trimmedLine);
        break;
      }
    }
  } else {
    contextIndex = originalContent.indexOf(find_context);
  }

  if (contextIndex === -1) {
    throw new Error('Context not found in file. Use preview mode to verify the context exists.');
  }

  // For fuzzy matching, try to identify the full block to replace
  if (fuzzy_match) {
    const lines = originalContent.split('\n');
    const contextLineIndex = originalContent.substring(0, contextIndex).split('\n').length - 1;
    
    // Find the start and end of the code block (basic heuristic)
    let startLine = contextLineIndex;
    let endLine = contextLineIndex;
    
    // Look backwards for the start of the block
    while (startLine > 0 && lines[startLine - 1].trim() !== '') {
      startLine--;
    }
    
    // Look forwards for the end of the block
    while (endLine < lines.length - 1 && lines[endLine + 1].trim() !== '') {
      endLine++;
    }

    const beforeBlock = lines.slice(0, startLine).join('\n');
    const afterBlock = lines.slice(endLine + 1).join('\n');
    
    const modifiedContent = beforeBlock + (beforeBlock ? '\n' : '') + replace_with + (afterBlock ? '\n' : '') + afterBlock;
    
    return {
      content: modifiedContent,
      stats: {
        operation: 'code_block',
        fuzzy_match: true,
        lines_replaced: endLine - startLine + 1,
        context_found: true,
      },
    };
  } else {
    // Exact replacement
    const modifiedContent = originalContent.replace(find_context, replace_with);
    
    return {
      content: modifiedContent,
      stats: {
        operation: 'code_block',
        fuzzy_match: false,
        exact_replacement: true,
        context_found: true,
      },
    };
  }
}

function generateDiffPreview(original: string, modified: string) {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  
  // Simple diff preview - show first few changes
  const maxPreviewLines = 10;
  const preview = [];
  
  const maxLines = Math.max(originalLines.length, modifiedLines.length);
  let changesShown = 0;
  
  for (let i = 0; i < maxLines && changesShown < maxPreviewLines; i++) {
    const originalLine = originalLines[i] || '';
    const modifiedLine = modifiedLines[i] || '';
    
    if (originalLine !== modifiedLine) {
      if (originalLine) {
        preview.push(`- ${originalLine}`);
        changesShown++;
      }
      if (modifiedLine) {
        preview.push(`+ ${modifiedLine}`);
        changesShown++;
      }
    }
  }
  
  if (changesShown >= maxPreviewLines && maxLines > maxPreviewLines) {
    preview.push('... (more changes not shown in preview)');
  }
  
  return preview.join('\n');
}
