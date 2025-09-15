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
  expected_hash: z.string().optional(),
  patches: z.array(z.object({
    search: z.string(),
    replace: z.string(),
  }))
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
    let orig = await fs.readFile(absPath, "utf-8");
    if (parse.data.expected_hash && sha256(orig) !== parse.data.expected_hash) {
      return reply.status(409).send({ error: "Hash mismatch" });
    }

    let newContent = orig;
    let allReplaced = true;
    let bytesWritten = 0;

    for (const { search, replace } of parse.data.patches) {
      if (!orig.includes(search)) {
        allReplaced = false;
        break;
      }
      newContent = newContent.replace(search, replace);
      bytesWritten += Buffer.byteLength(replace);
    }

    if (!allReplaced) {
      await fs.writeFile(absPath, orig);
      return reply.status(400).send({
        error: "Search string not found",
        message: "No replacements were applied. Original file restored.",
        failed_patches: parse.data.patches.filter(p => !orig.includes(p.search))
      });
    }

    await fs.writeFile(absPath, newContent);
    return { path: parse.data.path, hash: sha256(newContent), bytes_written: bytesWritten };
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
