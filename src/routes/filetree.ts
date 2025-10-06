import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';


export default async function (fastify: FastifyInstance) {
  const { listFiletree } = await import('../core/filetree');

  fastify.get('/', async (req, reply) => {
    try {
      const { projectId } = req.params as any;
      const { path: userPath, depth, glob, max_entries } = req.query as any;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      const result = await listFiletree(project, { path: userPath, depth, glob, max_entries });
      return reply.send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ error: err.message || 'Error listing filetree', details: err.details });
    }
  });
}