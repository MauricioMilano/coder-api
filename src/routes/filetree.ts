import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { Project } from '../types/common';
import { listFiletree } from '../services/filetree';

const FiletreeQuery = z.object({
  path: z.string().default('/'),
  depth: z.coerce.number().default(2),
  glob: z.string().optional(),
  max_entries: z.coerce.number().default(2000)
});

export default async function (fastify: FastifyInstance) {
  fastify.get('/', async (req, reply) => {
    const parse = FiletreeQuery.safeParse(req.query);
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

    return await listFiletree(project, parse.data);
  });
}
