import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { Project } from '../types/common';
import { runBashCommand } from '../services/bash';

const BashSchema = z.object({
  command: z.string().min(1),
  workdir: z.string().default('/'),
  timeout_sec: z.number().default(120),
  env: z.record(z.string()).optional()
});

export default async function (fastify: FastifyInstance) {
  fastify.post('/', async (req, reply) => {
    const parse = BashSchema.safeParse(req.body);
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

    return await runBashCommand(project, parse.data);
  });
}
