import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { Project } from '../types/common';
import { readProjectFile, createProjectFile, editProjectFile, deleteProjectPath } from '../services/files';

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
    const { config } = require('../config');
    const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }
    return await readProjectFile(project, filePath, encoding);
  });

  // POST /projects/:projectId/files
  fastify.post('/', async (req, reply) => {
    const parse = FileCreateSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(422).send({ error: 'Validation error', details: parse.error.errors });
    }
    const idemKey = req.headers['idempotency-key'] as string | undefined;
    const { config } = require('../config');
    const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }
    return await createProjectFile(project, parse.data, idemKey, req.method, req.url);
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
    try {
      return await editProjectFile(project, parse.data);
    } catch (err: any) {
      if (err.message === 'Hash mismatch') {
        return reply.status(409).send({ error: err.message });
      }
      return reply.status(400).send({ error: err.message });
    }
  });

  // DELETE /projects/:projectId/files
  fastify.delete('/', async (req, reply) => {
    const parse = FileDeleteSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(422).send({ error: 'Validation error', details: parse.error.errors });
    }
    const idemKey = req.headers['idempotency-key'] as string | undefined;
    const { config } = require('../config');
    const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }
    return await deleteProjectPath(project, parse.data, idemKey, req.method, req.url);
  });
}
