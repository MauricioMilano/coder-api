import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { safeResolvePath, readFileSafe, writeFileSafe, deletePathSafe } from '../lib/fs-safe';
import { sha256 } from '../lib/hashing';
import { Project } from '../types/common';
import { idemCache } from '../lib/idem';

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
  content: z.string(),
  expected_hash: z.string().optional()
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
    const stateFile = path.join('.state', `${(req.params as any).projectId}.json`);
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
    const stateFile = path.join('.state', `${(req.params as any).projectId}.json`);
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
    const stateFile = path.join('.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }
    const absPath = await safeResolvePath(project.rootAbsPath, parse.data.path);
    let orig = await fs.readFile(absPath, 'utf-8');
    if (parse.data.expected_hash && sha256(orig) !== parse.data.expected_hash) {
      return reply.status(409).send({ error: 'Hash mismatch' });
    }
    let newContent = orig;
    const patchPairs: { search: string, replace: string }[] = [];
    const blockRegex = /\/\/\s*-{6,}\s*SEARCH\s*\n([\s\S]*?)\/\/\s*={6,}\s*\n([\s\S]*?)(?=\/\/\s*\+{6,}\s*REPLACE|$)/g;
    let match;
    while ((match = blockRegex.exec(parse.data.content ?? '')) !== null) {
      const search = match[1].trim();
      const replace = match[2].trim();
      patchPairs.push({ search, replace });
    }

    if (patchPairs.length === 0) {
      return reply.status(400).send({
        error: 'No valid patch pairs found in content.',
        format: `Each patch must follow this format:

  // ------ SEARCH
  <search string>
  // ====== 
  <replace string>
  // ++++++ REPLACE

  Multiple patches can be included in sequence.`
      });
    }

    // Apply all patches in order
    for (const { search, replace } of patchPairs) {
      // Use simple string replacement (not regex)
      newContent = newContent.replace(search, replace);
    }
    await fs.writeFile(absPath, newContent);
    return { path: parse.data.path, hash: sha256(newContent), bytes_written: Buffer.byteLength(patchPairs.join("")) };
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
    const stateFile = path.join('.state', `${(req.params as any).projectId}.json`);
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
